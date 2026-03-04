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
 */
function stripHtml(html, maxLength = 12000) {
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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

Analyse the website text and identify any discrepancies or noteworthy changes compared to our database record. Focus on:

1. **Date discrepancies**: Do the dates on the website match our record? The dates in our database record above have already been converted to the event's local timezone, so you can compare them directly against dates shown on the website (which will also be in local time). Look for event dates in any format (e.g. "June 23-25, 2026", "23-25 June 2026", "23/06/2026", "2026-06-23", etc.). Be careful to distinguish the actual event dates from other dates on the page (such as CFS deadlines, early-bird deadlines, or dates of blog posts). Only flag a discrepancy if you are confident the website shows different event dates than our record.

2. **Event status**: Is there any indication the event has been cancelled, postponed, rescheduled, or sold out? Only flag this if the language clearly refers to this specific event, not past editions.

3. **Call for speakers/proposals**: Is there a call for speakers, proposals, or papers mentioned? Is it open, closed, or has a deadline? Compare with our CFS record.

4. **Location changes**: Has the venue or city changed from what we have?

5. **Other notable changes**: Anything else that looks like it might need updating in our database (e.g. the event has been renamed, the website is a placeholder, or the content doesn't match the event at all).

Respond with ONLY a JSON object (no markdown fences) in this exact format:
{
  "findings": [
    {"type": "date_mismatch|status_change|cfs_update|location_change|website_issue|other", "severity": "warning|info", "detail": "Human-readable description of the finding"}
  ],
  "eventDatesOnPage": "The event dates as stated on the website, or null if not found",
  "summary": "One sentence summary: either 'No issues found' or a brief description of what needs attention"
}

Rules:
- Return an empty "findings" array if everything looks consistent.
- Use "warning" severity for things that likely need a database update (date mismatch, cancellation, etc.).
- Use "info" severity for things worth noting but not necessarily requiring action (e.g. CFS deadline approaching, sold out).
- Be conservative: only flag genuine discrepancies, not ambiguities. If you can't tell whether dates match because the website doesn't show dates, don't flag it.
- Do not invent findings. If the page text is too short or unclear, say so.`;

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

  if (analysis.findings && analysis.findings.length > 0) {
    for (const finding of analysis.findings) {
      findings.push(finding.detail);
      if (finding.severity === 'warning' && severity !== 'error') {
        severity = 'warning';
      } else if (finding.severity === 'info' && severity === 'ok') {
        severity = 'info';
      }
    }
  }

  if (analysis.eventDatesOnPage) {
    findings.push(`Dates on website: ${analysis.eventDatesOnPage}`);
  }

  if (findings.length === 0) {
    findings.push('No issues detected');
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
        `${formatDate(event.dateStart)} -- ${formatDate(event.dateEnd)} | ${event.website}`
      );
      for (const f of findings) {
        lines.push(`- ${f}`);
      }
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
        `${formatDate(event.dateStart)} -- ${formatDate(event.dateEnd)} | ${event.website}`
      );
      for (const f of findings) {
        lines.push(`- ${f}`);
      }
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
  const { execSync } = await import('child_process');

  // Use gh CLI which handles auth via GH_TOKEN or gh auth
  const result = execSync(
    `gh issue create --repo eventua11y/eventua11y.com --title "${title.replace(/"/g, '\\"')}" --label "content" --body -`,
    {
      input: body,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );

  return result.trim();
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
    const summary = result.analysis?.summary || result.severity;
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
