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
 *   FRESHNESS_MODEL    Override the Claude model ID (defaults to
 *                      claude-sonnet-4-5-20250929; set to e.g.
 *                      claude-haiku-4-5-20251001 for cheaper runs)
 *   GH_TOKEN           GitHub token for creating issues (required unless --dry-run)
 */

import { createClient } from '@sanity/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

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
// Schema constraints
//
// Mirrors the Sanity event schema (eventua11y-sanity/schemas/event.js).
// Used to validate Claude's suggestions deterministically before they are
// surfaced to humans, so we never recommend values the schema can't store
// or changes to fields that are hidden for the event's type.
//
// Keep in sync with the Studio schema. If the schema changes, update here.
// ---------------------------------------------------------------------------

const FIELD_TYPES = {
  dateStart: 'datetime',
  dateEnd: 'datetime',
  callForSpeakers: 'boolean',
  callForSpeakersClosingDate: 'datetime',
  attendanceMode: 'enum',
  location: 'string',
  eventStatus: 'enum',
};

const FIELD_ENUMS = {
  attendanceMode: ['online', 'offline', 'mixed', 'none'],
  eventStatus: ['scheduled', 'cancelled', 'postponed', 'rescheduled'],
};

// Fields that the schema hides for `type === 'theme'` events. Suggesting
// values for these is meaningless because the field is never shown in the
// Studio and frontend consumers ignore it.
const HIDDEN_FOR_THEME = new Set([
  'callForSpeakers',
  'callForSpeakersClosingDate',
  'attendanceMode',
]);

// Phrases in a `reason` that indicate the model has talked itself out of
// the suggestion. Treated as evidence to drop the row entirely.
const SELF_CANCELLING_PHRASES = [
  'no change',
  'requires no change',
  'is consistent',
  'is actually consistent',
  'matches the website',
  'already matches',
  'already correct',
];

/**
 * Decide whether a single suggested change should be kept.
 * Returns { keep: boolean, drop?: string } where `drop` explains why.
 *
 * Rules:
 *  1. Drop if the field is hidden for this event's type.
 *  2. Drop if the suggested value isn't representable in the schema.
 *  3. Drop if current and suggested are equivalent (datetime instants
 *     match, booleans/enums match literally).
 *  4. Drop if the reason text contradicts the suggestion.
 */
function validateChange(change, event) {
  const { field, current, suggested, reason } = change;

  if (!field) return { keep: false, drop: 'missing field name' };

  // Rule 1: hidden for theme events
  if (event.type === 'theme' && HIDDEN_FOR_THEME.has(field)) {
    return {
      keep: false,
      drop: `${field} is hidden for theme-type events`,
    };
  }

  const type = FIELD_TYPES[field];

  // Rule 2: representability
  if (type === 'boolean') {
    const s = String(suggested).toLowerCase().trim();
    if (s !== 'true' && s !== 'false') {
      return {
        keep: false,
        drop: `${field} is boolean; suggested "${suggested}" is not true/false`,
      };
    }
  }

  if (type === 'enum') {
    const allowed = FIELD_ENUMS[field] || [];
    const s = String(suggested).toLowerCase().trim();
    if (!allowed.includes(s)) {
      return {
        keep: false,
        drop: `${field} must be one of ${allowed.join('|')}; suggested "${suggested}"`,
      };
    }
  }

  if (type === 'datetime') {
    // The suggested value is allowed to be a date string the model
    // extracted from the website (e.g. "31 May 2026"). Reject only if
    // it's literally "unknown" or "time unknown" — these can't be stored.
    const s = String(suggested).toLowerCase().trim();
    if (s === 'unknown' || s.includes('time unknown') || s === 'not set') {
      return {
        keep: false,
        drop: `${field} is datetime; cannot store "${suggested}"`,
      };
    }
  }

  // Rule 3: equivalence
  if (type === 'datetime' && current && suggested) {
    // Parse the suggested string against a small set of human-readable
    // date formats the prompt encourages. We compare calendar days in
    // the event's timezone, not instants, because the model rarely
    // includes a time component for date-only sources.
    const tz = event.timezone || 'UTC';
    const formats = [
      'D MMMM YYYY',
      'DD MMMM YYYY',
      'D MMM YYYY',
      'DD MMM YYYY',
      'YYYY-MM-DD',
      'MMMM D, YYYY',
      'MMMM D YYYY',
    ];
    const suggestedDay = dayjs(String(suggested), formats, true);
    const currentDay = event[field] ? dayjs.utc(event[field]).tz(tz) : null;
    if (
      suggestedDay.isValid() &&
      currentDay &&
      suggestedDay.format('YYYY-MM-DD') === currentDay.format('YYYY-MM-DD')
    ) {
      // Same calendar day -- treat as equivalent unless the suggestion
      // explicitly carries a different time component.
      const reasonHasTimeChange = /\b\d{1,2}:\d{2}\b/.test(String(suggested));
      if (!reasonHasTimeChange) {
        return {
          keep: false,
          drop: `${field} suggested value resolves to same date as current`,
        };
      }
    }
  }

  if (type === 'boolean' || type === 'enum') {
    const c = String(current).toLowerCase().trim();
    const s = String(suggested).toLowerCase().trim();
    // Map the prompt's "yes"/"no"/"not set" prose for booleans so we
    // can detect equivalence with the canonical true/false value.
    const norm = (v) => {
      if (v === 'yes') return 'true';
      if (v === 'no') return 'false';
      if (v === 'not set' || v === 'null' || v === '') return '';
      return v;
    };
    if (norm(c) === norm(s)) {
      return {
        keep: false,
        drop: `${field} current and suggested are equivalent (${suggested})`,
      };
    }
  }

  // Rule 4: self-cancelling reason text
  const r = String(reason || '').toLowerCase();
  for (const phrase of SELF_CANCELLING_PHRASES) {
    if (r.includes(phrase)) {
      return {
        keep: false,
        drop: `reason indicates no change needed ("${phrase}")`,
      };
    }
  }

  // Rule 5: past-dated datetime suggestions for upcoming events
  //
  // The freshness check only runs against events whose dateEnd is in
  // the future, so a suggestion that resolves to a past date is almost
  // always a confused reading of a website that hasn't been updated for
  // the new edition yet (e.g. DAW 2026 record vs. site still showing
  // DAW 2025 wrap-up text). Those need a human eye, not a structured
  // change. Surface as a note instead by dropping the change here.
  if (type === 'datetime') {
    const formats = [
      'D MMMM YYYY',
      'DD MMMM YYYY',
      'D MMM YYYY',
      'DD MMM YYYY',
      'YYYY-MM-DD',
      'MMMM D, YYYY',
      'MMMM D YYYY',
    ];
    const suggestedDay = dayjs(String(suggested), formats, true);
    if (suggestedDay.isValid() && suggestedDay.isBefore(dayjs(), 'day')) {
      return {
        keep: false,
        drop: `${field} suggested value (${suggested}) is in the past; likely website still shows previous edition`,
      };
    }
  }

  return { keep: true };
}

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

  // Render values in their stored form so the model sees -- and the report
  // surfaces -- literal database values, not English prose. This avoids the
  // "yes -> false" confusion where the model thinks they differ.
  const isTheme = event.type === 'theme';
  const summaryLines = [
    `Title: ${event.title}`,
    `Type: ${event.type}`,
    `dateStart (datetime): ${startStr}${tzNote}`,
    `dateEnd (datetime): ${endStr}${tzNote}`,
    `eventStatus (enum): ${event.eventStatus || 'scheduled (default)'}`,
    `Is parent event (conference with sessions): ${event.isParent ? 'true' : 'false'}`,
  ];
  if (!isTheme) {
    summaryLines.push(
      `attendanceMode (enum): ${event.attendanceMode ?? 'null'}`,
      `location (string): ${event.location ?? 'null'}`,
      `callForSpeakers (boolean): ${event.callForSpeakers === true ? 'true' : event.callForSpeakers === false ? 'false' : 'null'}`
    );
    if (event.callForSpeakersClosingDate) {
      summaryLines.push(
        `callForSpeakersClosingDate (datetime): ${dayjs.utc(event.callForSpeakersClosingDate).tz(tz).format('D MMMM YYYY [at] HH:mm')}${tzNote} (UTC: ${event.callForSpeakersClosingDate})`
      );
    }
  }
  const eventSummary = summaryLines.join('\n');

  const themeFieldNote = isTheme
    ? `\n\nIMPORTANT: This is a theme/awareness-day event (type === "theme"). The fields callForSpeakers, callForSpeakersClosingDate, and attendanceMode are HIDDEN in the CMS for theme events and must not appear in your "changes". Do not suggest values for them under any circumstances.`
    : '';

  const prompt = `You are helping maintain a curated calendar of accessibility and inclusive design events. Compare the following event record from our database against the text extracted from the event's official website.

## Our database record

${eventSummary}

## Text from the official website (${event.website})

${pageText}

## Your task

Identify fields in the database that need updating. Focus on:

1. **Dates (dateStart, dateEnd)**: The dates above are already in the event's local timezone, so compare them directly against what the website shows. Be careful to distinguish actual event dates from other dates on the page (CFS deadlines, early-bird dates, blog post dates). Only flag if you are confident the website shows different event dates.

2. **eventStatus**: Any indication the event has been cancelled, postponed, or rescheduled (for this edition, not past ones). Sold-out is not a status change.

3. **callForSpeakers / callForSpeakersClosingDate**: Is a CFS open or closed for THIS edition? Prefer dated announcements (news posts, blog entries) over static homepage hero copy, which may be stale. If the homepage says "soon" but a recent dated post announces the CFS is open, trust the dated post.

4. **location**: Has the venue or city changed?

5. **attendanceMode**: Has the format (online/offline/mixed) changed?

6. **Other**: Anything else worth noting (renamed, placeholder page, content mismatch). Put these in "notes", not "changes".${themeFieldNote}

## Schema constraints (HARD rules — violations will be discarded)

Each field has a fixed type and value space. Only suggest values that fit:

- \`callForSpeakers\` (boolean): "true" or "false". There is NO "unknown" value — if you cannot tell, omit the change.
- \`attendanceMode\` (enum): exactly one of "online", "offline", "mixed", "none". The word "multiple" is NOT valid; use "mixed".
- \`eventStatus\` (enum): exactly one of "scheduled", "cancelled", "postponed", "rescheduled".
- \`dateStart\`, \`dateEnd\`, \`callForSpeakersClosingDate\` (datetime): ISO datetime or a date string the website explicitly states (e.g. "31 May 2026", "9 June 2026"). NEVER suggest "unknown" or "time unknown" — these can't be stored. If the website doesn't state a time, suggest just the date and the value will be reconciled separately.

## Equivalence and self-cancellation

Before adding a change, ask yourself: does my "suggested" value actually differ from "current"? Examples that MUST NOT be reported as changes:

- Current "15:30" and suggested "3:30 PM" — same instant in 24h vs 12h notation.
- Current "10 June 2026 at 00:59 (Europe/London)" and website says "9 June 2026" in a US timezone — these may be the same UTC instant. If unsure, omit the change.
- Current "false" and suggested "no" — same boolean.

If your "reason" text concludes the values match, are consistent, or no change is needed, OMIT the change entirely. Do not emit a row only to explain why it isn't really a change.

## Stale website content

This check only runs against events whose end date is in the future. If the website still describes a past edition (e.g. "Thank you for joining us at FooConf 2025" while our record is FooConf 2026), DO NOT suggest changing the database dates back to the past edition. The site is likely stale, not the database. Put the observation in "notes" so a human can chase the organiser.

## Response format

Respond with ONLY a JSON object (no markdown fences) in this exact shape:

{
  "changes": [
    {
      "field": "dateStart|dateEnd|eventStatus|callForSpeakers|callForSpeakersClosingDate|location|attendanceMode",
      "severity": "warning|info",
      "current": "Literal current value as shown in the database record above",
      "suggested": "Schema-valid replacement value (see constraints above)",
      "reason": "One sentence citing the specific website text that justifies the change"
    }
  ],
  "noChanges": true|false,
  "notes": "Optional one-sentence note about something worth mentioning that does not fit a structured change, or null"
}

Rules:
- Set "noChanges": true and an empty "changes" array if everything looks consistent.
- "warning" severity = clear discrepancy needing a database update. "info" = ambiguous, worth a human glance.
- Be conservative. When in doubt, use "notes" instead of "changes".
- Never suggest changing isParent. This is an editorial decision about how we curate events, not something that can be inferred from a website. Events dedicated to accessibility (CSUN, AccessU, Inclusive Design 24) are standalone events. Only broad multi-topic conferences with embedded accessibility sessions (UX London, Figma Config) are marked as parent events.`;

  const model = process.env.FRESHNESS_MODEL || 'claude-sonnet-4-5-20250929';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
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

  // Validate every suggested change against the schema. The model's
  // instructions cover this, but we double-check deterministically so a
  // single bad model response can't introduce noisy or invalid suggestions.
  const dropped = [];
  if (analysis.changes && analysis.changes.length > 0) {
    const kept = [];
    for (const change of analysis.changes) {
      const verdict = validateChange(change, event);
      if (verdict.keep) {
        kept.push(change);
      } else {
        dropped.push({ change, reason: verdict.drop });
      }
    }
    analysis.changes = kept;
    if (kept.length === 0 && (!analysis.notes || analysis.notes === null)) {
      analysis.noChanges = true;
    }
  }

  if (dropped.length > 0) {
    // Surface drops at debug verbosity so failures are diagnosable without
    // polluting the human-facing report.
    for (const { change, reason } of dropped) {
      console.warn(`  Dropped suggestion (${change.field || '?'}): ${reason}`);
    }
  }

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

  // Structured changes as a table. GitHub Markdown requires a blank
  // line before a table when it directly follows a list, otherwise
  // the table is treated as a continuation of the list and rendered
  // as one mashed-up line.
  if (changes.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('| Field | Current | Suggested | Reason |');
    lines.push('| --- | --- | --- | --- |');
    for (const c of changes) {
      const sev = c.severity === 'warning' ? '**' : '';
      lines.push(
        `| ${sev}\`${c.field}\`${sev} | ${c.current || '-'} | ${c.suggested || '-'} | ${c.reason || '-'} |`
      );
    }
  }

  // Notes (also need a blank line above to render as a separate
  // blockquote rather than getting absorbed into the previous block).
  if (notes.length > 0) {
    if (lines.length > 0) lines.push('');
    for (const n of notes) {
      lines.push(`> ${n.note}`);
    }
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
