/**
 * Event Freshness Checker
 *
 * Fetches upcoming events from Sanity, visits each event's official website,
 * and uses Claude to analyse the page content for discrepancies (date changes,
 * cancellations, CFS updates, etc.). Outputs a GitHub issue with findings.
 *
 * Usage:
 *   SANITY_PROJECT=<id> ANTHROPIC_API_KEY=<key> node scripts/check-event-freshness.mjs
 *
 * Options:
 *   --dry-run   Print the report to stdout instead of creating a GitHub issue
 *
 * Environment:
 *   SANITY_PROJECT     Sanity project ID (required)
 *   SANITY_DATASET     Sanity dataset name (defaults to "production")
 *   ANTHROPIC_API_KEY  Anthropic API key for Claude analysis (required)
 *   GH_TOKEN           GitHub token for creating issues (required unless --dry-run)
 */

import { createClient } from '@sanity/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const projectId = process.env.SANITY_PROJECT;
const dataset = process.env.SANITY_DATASET || 'production';
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const dryRun = process.argv.includes('--dry-run');

if (!projectId) {
  console.error('Missing required environment variable: SANITY_PROJECT');
  process.exit(1);
}

if (!anthropicKey) {
  console.error('Missing required environment variable: ANTHROPIC_API_KEY');
  process.exit(1);
}

const sanity = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: true,
});

// ---------------------------------------------------------------------------
// Sanity: fetch upcoming events with websites
// ---------------------------------------------------------------------------

async function fetchUpcomingEvents() {
  const query = `*[_type == "event" && !defined(parent) && dateEnd >= now() && defined(website)] | order(dateStart asc) {
    _id,
    title,
    website,
    dateStart,
    dateEnd,
    timezone,
    type,
    eventStatus,
    callForSpeakers,
    callForSpeakersClosingDate,
    attendanceMode,
    location,
    isParent
  }`;
  return sanity.fetch(query);
}

// ---------------------------------------------------------------------------
// Web fetching with timeout and redirect following
// ---------------------------------------------------------------------------

async function fetchPage(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Eventua11yFreshnessChecker/1.0 (+https://eventua11y.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    const status = response.status;
    const finalUrl = response.url;
    const contentType = response.headers.get('content-type') || '';

    let text = '';
    if (contentType.includes('text/html')) {
      text = await response.text();
    }

    return { status, finalUrl, text, error: null };
  } catch (err) {
    return {
      status: null,
      finalUrl: url,
      text: '',
      error: err.name === 'AbortError' ? 'Timed out' : err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// HTML to plain text
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags and collapse whitespace for plain-text analysis.
 * Truncates to a reasonable size for the LLM context window.
 *
 * Uses a loop to handle malformed/nested markup that a single pass
 * would miss (e.g. `<scr<script>ipt>`), satisfying CodeQL's
 * js/incomplete-multi-character-sanitization rule.
 */
function stripHtml(html, maxLength = 12000) {
  let text = html;

  // Remove script, style, nav, and footer blocks (loop until stable
  // to handle nested or malformed tags)
  const blockPatterns = [
    /<script[\s>][\s\S]*?<\/script[^>]*>/gi,
    /<style[\s>][\s\S]*?<\/style[^>]*>/gi,
    /<nav[\s>][\s\S]*?<\/nav[^>]*>/gi,
    /<footer[\s>][\s\S]*?<\/footer[^>]*>/gi,
  ];
  for (const pattern of blockPatterns) {
    let prev;
    do {
      prev = text;
      text = text.replace(pattern, '');
    } while (text !== prev);
  }

  // Strip remaining tags (loop until stable)
  let prev;
  do {
    prev = text;
    text = text.replace(/<[^>]+>/g, ' ');
  } while (text !== prev);

  text = text.replace(/\s+/g, ' ').trim();

  if (text.length > maxLength) {
    return text.substring(0, maxLength) + '\n[...truncated]';
  }
  return text;
}

// ---------------------------------------------------------------------------
// Claude analysis
// ---------------------------------------------------------------------------

/**
 * Ask Claude to analyse the page text against the known event data.
 * Returns structured findings.
 *
 * @param {object} event - The Sanity event document
 * @param {string} pageText - Plain text extracted from the event website
 * @returns {Promise<{ findings: Array<{type: string, detail: string}>, eventDates: string|null, eventStatus: string|null, cfsStatus: string|null }>}
 */
async function analyseWithClaude(event, pageText) {
  // Convert UTC dates to the event's local timezone so comparisons with
  // the website are like-for-like.  International events (no timezone)
  // are presented in UTC.
  const tz = event.timezone || 'UTC';
  const localStart = dayjs.utc(event.dateStart).tz(tz);
  const localEnd = event.dateEnd ? dayjs.utc(event.dateEnd).tz(tz) : null;

  const dateFormat =
    event.day || event.type === 'theme'
      ? 'dddd, D MMMM YYYY'
      : 'dddd, D MMMM YYYY [at] HH:mm';

  const startStr = localStart.format(dateFormat);
  const endStr = localEnd ? localEnd.format(dateFormat) : 'not set';
  const tzNote = event.timezone
    ? ` (${event.timezone})`
    : ' (international event, no specific timezone)';

  const eventSummary = [
    `Title: ${event.title}`,
    `Start: ${startStr}${tzNote}`,
    `End: ${endStr}${tzNote}`,
    `Type: ${event.type}`,
    `Status in our database: ${event.eventStatus || 'scheduled (default)'}`,
    `Attendance mode: ${event.attendanceMode || 'not set'}`,
    `Location: ${event.location || 'not set'}`,
    `Call for speakers: ${event.callForSpeakers === true ? 'yes' : event.callForSpeakers === false ? 'no' : 'not set'}`,
    event.callForSpeakersClosingDate
      ? `CFS closing date: ${dayjs.utc(event.callForSpeakersClosingDate).tz(tz).format('D MMMM YYYY [at] HH:mm')}${tzNote}`
      : null,
    `Is parent event (conference with sessions): ${event.isParent ? 'yes' : 'no'}`,
  ]
    .filter(Boolean)
    .join('\n');

  const prompt = `You are helping maintain a curated calendar of accessibility and inclusive design events. Compare the following event record from our database against the text extracted from the event's official website.

## Our database record

${eventSummary}

## Text from the official website (${event.website})

${pageText}

## Your task

Analyse the website text and identify any fields in our database that need updating. Focus on:

1. **Dates**: The dates above are already in the event's local timezone, so compare them directly against what the website shows. Be careful to distinguish actual event dates from other dates on the page (CFS deadlines, early-bird dates, blog post dates). Only flag if you are confident the website shows different event dates.

2. **Event status**: Any indication the event has been cancelled, postponed, rescheduled, or sold out (for this edition, not past ones).

3. **Call for speakers/proposals**: Is a CFS mentioned? Is it open, closed, or does it have a deadline? Compare with our record.

4. **Location**: Has the venue or city changed?

5. **Other**: Anything else that needs updating (renamed, placeholder page, content mismatch).

Respond with ONLY a JSON object (no markdown fences) in this exact format:
{
  "changes": [
    {
      "field": "dateStart|dateEnd|eventStatus|callForSpeakers|callForSpeakersClosingDate|location|attendanceMode|other",
      "severity": "warning|info",
      "current": "What our database currently has for this field",
      "suggested": "What the website suggests it should be, or 'unknown' if unclear",
      "reason": "One sentence explaining the evidence from the website"
    }
  ],
  "noChanges": true|false,
  "notes": "Optional one-sentence note about anything worth mentioning that does not require a database change, or null"
}

Rules:
- Set "noChanges" to true and return an empty "changes" array if everything looks consistent.
- Use "warning" severity for changes that likely need a database update.
- Use "info" severity for things worth flagging but that may not need action.
- For date fields, use the format the website shows (e.g. "23 June 2026") in the "suggested" value.
- For boolean fields (callForSpeakers, isParent), use "true" or "false" as strings in "suggested".
- Be conservative: only flag genuine discrepancies, not ambiguities.
- Do not invent changes. If the page is unclear, say so in "notes" instead.
- NEVER suggest changing isParent. This is an editorial decision about how we curate events, not something that can be inferred from a website. Events dedicated to accessibility (like CSUN, AccessU, Inclusive Design 24) are listed as standalone events, not parent events with children. Only broad multi-topic conferences that happen to include some accessibility content (like UX London, Figma Config) are marked as parent events so we can list their individual accessibility-relevant sessions.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  try {
    // Strip markdown fences if the model adds them despite instructions
    const cleaned = text
      .replace(/^```(?:json)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    console.warn(`  Warning: Could not parse Claude response as JSON`);
    return {
      findings: [
        {
          type: 'other',
          severity: 'info',
          detail: `AI analysis returned unparseable response: ${text.substring(0, 200)}`,
        },
      ],
      eventDatesOnPage: null,
      summary: 'Analysis inconclusive',
    };
  }
}

// ---------------------------------------------------------------------------
// Check a single event
// ---------------------------------------------------------------------------

/**
 * @returns {Promise<{ event, findings: string[], severity: 'ok'|'info'|'warning'|'error', analysis: object|null }>}
 */
async function checkEvent(event) {
  const findings = [];
  let severity = 'ok';

  if (!event.website) {
    return {
      event,
      findings: ['No website URL'],
      severity: 'ok',
      analysis: null,
    };
  }

  const { status, finalUrl, text, error } = await fetchPage(event.website);

  // --- Connection / HTTP errors ---
  if (error) {
    findings.push(`Could not reach website: ${error}`);
    return { event, findings, severity: 'error', analysis: null };
  }

  if (status >= 400) {
    findings.push(`Website returned HTTP ${status}`);
    severity = status === 404 ? 'error' : 'warning';
    return { event, findings, severity, analysis: null };
  }

  // --- Redirect detection ---
  if (finalUrl !== event.website) {
    const originalHost = new URL(event.website).hostname;
    const finalHost = new URL(finalUrl).hostname;

    if (
      finalHost !== originalHost &&
      !finalHost.endsWith('.' + originalHost) &&
      !originalHost.endsWith('.' + finalHost)
    ) {
      findings.push(`Website redirected to a different domain: ${finalUrl}`);
      severity = 'warning';
    } else if (finalHost !== originalHost) {
      findings.push(`Website redirected to subdomain: ${finalUrl}`);
      if (severity === 'ok') severity = 'info';
    }
  }

  // --- Page content analysis via Claude ---
  const plainText = stripHtml(text);

  if (plainText.length < 100) {
    findings.push(
      'Page has very little content (possible placeholder or parked domain)'
    );
    severity = 'warning';
    return { event, findings, severity, analysis: null };
  }

  const analysis = await analyseWithClaude(event, plainText);

  if (analysis.changes && analysis.changes.length > 0) {
    for (const change of analysis.changes) {
      findings.push(change);
      if (change.severity === 'warning' && severity !== 'error') {
        severity = 'warning';
      } else if (change.severity === 'info' && severity === 'ok') {
        severity = 'info';
      }
    }
  }

  if (analysis.notes) {
    findings.push({ note: analysis.notes });
  }

  return { event, findings, severity, analysis };
}

// ---------------------------------------------------------------------------
// Report formatting
// ---------------------------------------------------------------------------

function formatDate(isoString) {
  if (!isoString) return 'unknown';
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatFindings(findings) {
  const lines = [];
  const changes = findings.filter((f) => f.field);
  const notes = findings.filter((f) => f.note);
  const plain = findings.filter((f) => typeof f === 'string');

  // Plain string findings (from redirect/HTTP checks)
  for (const f of plain) {
    lines.push(`- ${f}`);
  }

  // Structured changes as a table
  if (changes.length > 0) {
    lines.push('| Field | Current | Suggested | Reason |');
    lines.push('| --- | --- | --- | --- |');
    for (const c of changes) {
      const sev = c.severity === 'warning' ? '**' : '';
      lines.push(
        `| ${sev}\`${c.field}\`${sev} | ${c.current || '-'} | ${c.suggested || '-'} | ${c.reason || '-'} |`
      );
    }
  }

  // Notes
  for (const n of notes) {
    lines.push(`> ${n.note}`);
  }

  return lines;
}

function buildReport(results) {
  const warnings = results.filter(
    (r) => r.severity === 'warning' || r.severity === 'error'
  );
  const infos = results.filter((r) => r.severity === 'info');
  const clean = results.filter((r) => r.severity === 'ok');

  const lines = [];

  lines.push(
    `Checked ${results.length} upcoming events with websites on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`
  );
  lines.push('');

  if (warnings.length === 0 && infos.length === 0) {
    lines.push('All events look up to date. No action needed.');
    return {
      title: 'Event freshness check: all clear',
      body: lines.join('\n'),
    };
  }

  // --- Issues needing attention ---
  if (warnings.length > 0) {
    lines.push(`## Needs attention (${warnings.length})`);
    lines.push('');
    for (const { event, findings, severity } of warnings) {
      const icon = severity === 'error' ? '**' : '';
      lines.push(`### ${icon}${event.title}${icon}`);
      lines.push(
        `Sanity ID: \`${event._id}\` | ${formatDate(event.dateStart)} -- ${formatDate(event.dateEnd)} | ${event.website}`
      );
      lines.push('');
      lines.push(...formatFindings(findings));
      lines.push('');
    }
  }

  // --- Informational ---
  if (infos.length > 0) {
    lines.push(`## For review (${infos.length})`);
    lines.push('');
    for (const { event, findings } of infos) {
      lines.push(`### ${event.title}`);
      lines.push(
        `Sanity ID: \`${event._id}\` | ${formatDate(event.dateStart)} -- ${formatDate(event.dateEnd)} | ${event.website}`
      );
      lines.push('');
      lines.push(...formatFindings(findings));
      lines.push('');
    }
  }

  // --- Clean ---
  if (clean.length > 0) {
    lines.push(
      `<details><summary>No issues detected (${clean.length})</summary>`
    );
    lines.push('');
    for (const { event } of clean) {
      lines.push(`- ${event.title}`);
    }
    lines.push('');
    lines.push('</details>');
  }

  const title =
    warnings.length > 0
      ? `Event freshness check: ${warnings.length} event${warnings.length === 1 ? '' : 's'} need${warnings.length === 1 ? 's' : ''} attention`
      : `Event freshness check: ${infos.length} event${infos.length === 1 ? '' : 's'} to review`;

  return { title, body: lines.join('\n') };
}

// ---------------------------------------------------------------------------
// GitHub issue creation
// ---------------------------------------------------------------------------

async function createGitHubIssue(title, body) {
  const { execFileSync } = await import('child_process');
  const { writeFileSync, unlinkSync } = await import('fs');
  const { tmpdir } = await import('os');
  const { join } = await import('path');

  // Write body to a temp file to avoid stdin piping issues in CI
  const tmpFile = join(tmpdir(), `freshness-report-${Date.now()}.md`);
  try {
    writeFileSync(tmpFile, body, 'utf-8');

    // Use execFileSync with an args array to avoid shell injection
    const result = execFileSync(
      'gh',
      [
        'issue',
        'create',
        '--repo',
        'eventua11y/eventua11y.com',
        '--title',
        title,
        '--label',
        'content',
        '--assignee',
        'mattobee',
        '--body-file',
        tmpFile,
      ],
      { encoding: 'utf-8' }
    );

    return result.trim();
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      // ignore cleanup errors
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(dryRun ? 'DRY RUN: report will be printed, not filed\n' : '');

  console.log('Fetching upcoming events from Sanity...');
  const events = await fetchUpcomingEvents();
  console.log(`Found ${events.length} upcoming events with websites.\n`);

  if (events.length === 0) {
    console.log('No upcoming events with websites to check.');
    return;
  }

  // Check events sequentially to be polite to external servers and rate limits
  const results = [];
  for (const event of events) {
    process.stdout.write(`Checking: ${event.title}... `);
    const result = await checkEvent(event);
    const changeCount = result.analysis?.changes?.length || 0;
    const note = result.analysis?.notes || '';
    const summary =
      changeCount > 0
        ? `${changeCount} change${changeCount === 1 ? '' : 's'} suggested`
        : note || 'no changes';
    console.log(`${result.severity} - ${summary}`);
    results.push(result);

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const { title, body } = buildReport(results);

  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
  console.log(body);

  if (!dryRun) {
    console.log('\nCreating GitHub issue...');
    try {
      const issueUrl = await createGitHubIssue(title, body);
      console.log(`Issue created: ${issueUrl}`);
    } catch (err) {
      console.error('Failed to create GitHub issue:', err.message);
      console.error(
        'Make sure GH_TOKEN is set or `gh auth login` has been run.'
      );
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
