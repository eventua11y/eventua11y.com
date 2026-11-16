/**
 * Event Freshness Checker
 *
 * Fetches upcoming events from Sanity, visits each event's official website,
 * and prepares comparison prompts for the Copilot agentic workflow. Validates
 * the agent's structured analysis before building the report in a safe-output job.
 *
 * Usage:
 *   SANITY_PROJECT=<id> node scripts/check-event-freshness.mjs --prepare snapshot.json
 *   node scripts/check-event-freshness.mjs --report snapshot.json agent-output.json
 *
 * Environment:
 *   SANITY_PROJECT     Sanity project ID (required)
 *   SANITY_DATASET     Sanity dataset name (defaults to "production")
 */

import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createClient } from '@sanity/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

// ---------------------------------------------------------------------------
// Schema constraints
//
// Mirrors the Sanity event schema (eventua11y-sanity/schemas/event.js).
// Used to validate the agent's suggestions deterministically before they are
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

// Date formats accepted by the strict dayjs parser used in Rules 3 and 5.
// dayjs's customParseFormat plugin can't parse the `dddd` (weekday name)
// token even non-strictly, so any leading "Monday, " etc. is stripped by
// `parseSuggestedDate` before the value reaches the formats list. The
// list still has to cover everything the prompt tells the model to emit
// (`D MMMM YYYY` / `D MMMM YYYY [at] HH:mm`), plus a few common variants.
const SUGGESTED_DATE_FORMATS = [
  'D MMMM YYYY',
  'D MMMM YYYY [at] HH:mm',
  'D MMMM YYYY HH:mm',
  'DD MMMM YYYY',
  'D MMM YYYY',
  'DD MMM YYYY',
  'YYYY-MM-DD',
  'MMMM D, YYYY',
  'MMMM D YYYY',
];

// Parse a suggested datetime string from the model. Strips a leading
// weekday name ("Monday, ", "Tue, ") before delegating to dayjs because
// `customParseFormat` can't handle the `dddd`/`ddd` tokens.
function parseSuggestedDate(value) {
  const cleaned = String(value).replace(/^[A-Za-z]+,\s*/, '');
  return dayjs(cleaned, SUGGESTED_DATE_FORMATS, true);
}

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

function representabilityIssue({ field, suggested }) {
  const value = String(suggested).toLowerCase().trim();
  switch (FIELD_TYPES[field]) {
    case 'boolean':
      if (!['true', 'false'].includes(value)) {
        return `${field} is boolean; suggested "${suggested}" is not true/false`;
      }
      break;
    case 'enum':
      if (!FIELD_ENUMS[field].includes(value)) {
        return `${field} must be one of ${FIELD_ENUMS[field].join('|')}; suggested "${suggested}"`;
      }
      break;
    case 'datetime':
      if (
        value === 'unknown' ||
        value.includes('time unknown') ||
        value === 'not set'
      ) {
        return `${field} is datetime; cannot store "${suggested}"`;
      }
      break;
  }
  return null;
}

function normalizeComparableValue(value) {
  const normalized = String(value).toLowerCase().trim();
  if (normalized === 'yes') return 'true';
  if (normalized === 'no') return 'false';
  if (['not set', 'null', ''].includes(normalized)) return '';
  return normalized;
}

function equivalentDateIssue({ field, suggested }, event) {
  // Compare calendar days in the event's timezone unless the source
  // explicitly supplies a time.
  const suggestedDay = parseSuggestedDate(suggested);
  const currentDay = event[field]
    ? dayjs.utc(event[field]).tz(event.timezone || 'UTC')
    : null;
  if (
    suggestedDay.isValid() &&
    currentDay &&
    suggestedDay.format('YYYY-MM-DD') === currentDay.format('YYYY-MM-DD') &&
    !/\b\d{1,2}:\d{2}\b/.test(String(suggested))
  ) {
    return `${field} suggested value resolves to same date as current`;
  }
  return null;
}

function equivalenceIssue(change, event) {
  const { field, current, suggested } = change;
  const type = FIELD_TYPES[field];
  if (type === 'datetime' && current && suggested) {
    return equivalentDateIssue(change, event);
  }
  if (
    ['boolean', 'enum'].includes(type) &&
    normalizeComparableValue(current) === normalizeComparableValue(suggested)
  ) {
    return `${field} current and suggested are equivalent (${suggested})`;
  }
  return null;
}

function contradictoryReasonIssue(reason) {
  const text = String(reason || '').toLowerCase();
  const phrase = SELF_CANCELLING_PHRASES.find((phrase) =>
    text.includes(phrase)
  );
  return phrase ? `reason indicates no change needed ("${phrase}")` : null;
}

function staleChangeIssue({ field, suggested }, event) {
  // Upcoming events may still link to a previous edition's website.
  if (FIELD_TYPES[field] === 'datetime') {
    const suggestedDay = parseSuggestedDate(suggested);
    if (suggestedDay.isValid() && suggestedDay.isBefore(dayjs(), 'day')) {
      return `${field} suggested value (${suggested}) is in the past; likely website still shows previous edition`;
    }
  }

  // Toggling an expired call no longer changes anything on the site.
  if (field === 'callForSpeakers' && event.callForSpeakersClosingDate) {
    const closingDay = dayjs(event.callForSpeakersClosingDate);
    if (closingDay.isValid() && closingDay.isBefore(dayjs())) {
      return `callForSpeakers closing date (${event.callForSpeakersClosingDate}) has passed; toggling the flag has no effect`;
    }
  }
  return null;
}

/**
 * Validate a proposed change in rule order so the first rejection stays
 * the reported reason.
 *
 * @returns {{ keep: boolean, drop?: string }}
 */
function validateChange(change, event) {
  const { field } = change;
  if (!field) return { keep: false, drop: 'missing field name' };
  if (event.type === 'theme' && HIDDEN_FOR_THEME.has(field)) {
    return { keep: false, drop: `${field} is hidden for theme-type events` };
  }
  if (!Object.hasOwn(FIELD_TYPES, field)) {
    return { keep: false, drop: `unsupported field: ${field}` };
  }

  const issue =
    representabilityIssue(change) ||
    equivalenceIssue(change, event) ||
    contradictoryReasonIssue(change.reason) ||
    staleChangeIssue(change, event);
  return issue ? { keep: false, drop: issue } : { keep: true };
}

// ---------------------------------------------------------------------------
// Sanity: fetch upcoming events with websites
// ---------------------------------------------------------------------------

async function fetchUpcomingEvents() {
  const projectId = process.env.SANITY_PROJECT;
  if (!projectId) {
    throw new Error('Missing required environment variable: SANITY_PROJECT');
  }
  const sanity = createClient({
    projectId,
    dataset: process.env.SANITY_DATASET || 'production',
    apiVersion: '2024-01-01',
    useCdn: true,
  });
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
        // Identify honestly, but wear a Mozilla coat: some WAFs (e.g.
        // Cloudflare's bot-fight defaults) 403 anything that doesn't
        // start with "Mozilla/", regardless of the rest of the UA.
        'User-Agent':
          'Mozilla/5.0 (compatible; Eventua11yFreshnessChecker/1.0; +https://eventua11y.com)',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
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
// Agent analysis prompt
// ---------------------------------------------------------------------------

function eventTimingSummary(event) {
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

  return {
    start: `${startStr}${tzNote}`,
    end: `${endStr}${tzNote}`,
    tz,
    tzNote,
  };
}

function attendanceSummary(event, { tz, tzNote }) {
  // Keep literal stored values rather than translating booleans to yes/no.
  const lines = [
    `attendanceMode (enum): ${event.attendanceMode ?? 'null'}`,
    `location (string): ${event.location ?? 'null'}`,
    `callForSpeakers (boolean): ${event.callForSpeakers === true ? 'true' : event.callForSpeakers === false ? 'false' : 'null'}`,
  ];
  if (event.callForSpeakersClosingDate) {
    lines.push(
      `callForSpeakersClosingDate (datetime): ${dayjs.utc(event.callForSpeakersClosingDate).tz(tz).format('D MMMM YYYY [at] HH:mm')}${tzNote} (UTC: ${event.callForSpeakersClosingDate})`
    );
  }
  return lines;
}

function buildEventSummary(event) {
  const timing = eventTimingSummary(event);
  const summaryLines = [
    `Title: ${event.title}`,
    `Type: ${event.type}`,
    `dateStart (datetime): ${timing.start}`,
    `dateEnd (datetime): ${timing.end}`,
    `eventStatus (enum): ${event.eventStatus || 'scheduled (default)'}`,
    `Is parent event (conference with sessions): ${event.isParent ? 'true' : 'false'}`,
  ];
  if (event.type !== 'theme') {
    summaryLines.push(...attendanceSummary(event, timing));
  }
  return summaryLines.join('\n');
}

/**
 * Prepare the same comparison instructions for each event.
 *
 * @param {object} event - The Sanity event document
 * @param {string} pageText - Plain text extracted from the event website
 * @returns {string}
 */
function buildAnalysisPrompt(event, pageText) {
  const eventSummary = buildEventSummary(event);
  const themeFieldNote =
    event.type === 'theme'
      ? `\n\nIMPORTANT: This is a theme/awareness-day event (type === "theme"). The fields callForSpeakers, callForSpeakersClosingDate, and attendanceMode are HIDDEN in the CMS for theme events and must not appear in your "changes". Do not suggest values for them under any circumstances.`
      : '';

  return `You are helping maintain a curated calendar of accessibility and inclusive design events. Compare the following event record from our database against the text extracted from the event's official website.

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
}

// ---------------------------------------------------------------------------
// Check a single event
// ---------------------------------------------------------------------------

function redirectFinding(originalUrl, finalUrl) {
  if (finalUrl === originalUrl) return null;
  const originalHost = new URL(originalUrl).hostname;
  const finalHost = new URL(finalUrl).hostname;
  if (
    finalHost !== originalHost &&
    !finalHost.endsWith('.' + originalHost) &&
    !originalHost.endsWith('.' + finalHost)
  ) {
    return {
      message: `Website redirected to a different domain: ${finalUrl}`,
      severity: 'warning',
    };
  }
  if (finalHost !== originalHost) {
    return {
      message: `Website redirected to subdomain: ${finalUrl}`,
      severity: 'info',
    };
  }
  return null;
}

/**
 * @returns {Promise<{ event, findings: string[], severity: 'ok'|'info'|'warning'|'error', prompt?: string }>}
 */
async function prepareEvent(event) {
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
  if (error) {
    findings.push(`Could not reach website: ${error}`);
    return { event, findings, severity: 'error', analysis: null };
  }
  if (status >= 400) {
    findings.push(`Website returned HTTP ${status}`);
    severity = status === 404 ? 'error' : 'warning';
    return { event, findings, severity, analysis: null };
  }

  const redirect = redirectFinding(event.website, finalUrl);
  if (redirect) {
    findings.push(redirect.message);
    severity = redirect.severity;
  }

  // --- Prepare page content for the agent ---
  const plainText = stripHtml(text);

  if (plainText.length < 100) {
    findings.push(
      'Page has very little content (possible placeholder or parked domain)'
    );
    severity = 'warning';
    return { event, findings, severity, analysis: null };
  }

  return {
    event,
    findings,
    severity,
    prompt: buildAnalysisPrompt(event, plainText),
  };
}

function validatedChanges(changes, event) {
  const kept = [];
  const dropped = [];
  for (const change of changes) {
    const candidate = { ...change, current: event[change.field] ?? null };
    const verdict = validateChange(candidate, event);
    if (verdict.keep) {
      kept.push(candidate);
    } else {
      dropped.push({ change, reason: verdict.drop });
    }
  }

  for (const { change, reason } of dropped) {
    console.warn(`  Dropped suggestion (${change.field || '?'}): ${reason}`);
  }
  return kept;
}

function analysisSeverity(current, changes, notes) {
  if (current === 'error') return current;
  if (changes.some((change) => change.severity === 'warning')) return 'warning';
  if (current === 'ok' && (changes.length > 0 || notes)) return 'info';
  return current;
}

function applyAnalysis(result, analysis) {
  const { event } = result;
  const findings = [...result.findings];
  const hadChanges = analysis.changes.length > 0;
  analysis.changes = validatedChanges(analysis.changes, event);
  if (hadChanges && analysis.changes.length === 0 && !analysis.notes) {
    analysis.noChanges = true;
  }

  findings.push(...analysis.changes);
  if (analysis.notes) {
    findings.push({ note: analysis.notes });
  }

  return {
    event,
    findings,
    severity: analysisSeverity(
      result.severity,
      analysis.changes,
      analysis.notes
    ),
    analysis,
  };
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

function formatFindings(findings, sanitize) {
  const cell = (value) =>
    sanitize(String(value ?? '-'))
      .replace(/\|/g, '&#124;')
      .replace(/[\r\n]+/g, ' ');
  const lines = [];
  const changes = findings.filter((f) => f.field);
  const notes = findings.filter((f) => f.note);
  const plain = findings.filter((f) => typeof f === 'string');

  // Plain string findings (from redirect/HTTP checks)
  for (const f of plain) {
    lines.push(`- ${cell(f)}`);
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
        `| ${sev}\`${c.field}\`${sev} | ${cell(c.current)} | ${cell(c.suggested)} | ${cell(c.reason)} |`
      );
    }
  }

  // Notes (also need a blank line above to render as a separate
  // blockquote rather than getting absorbed into the previous block).
  if (notes.length > 0) {
    if (lines.length > 0) lines.push('');
    for (const n of notes) {
      lines.push(`> ${cell(n.note)}`);
    }
  }

  return lines;
}

function formatReportSection(title, results, sanitize) {
  if (results.length === 0) return [];
  const lines = [`## ${title} (${results.length})`, ''];
  for (const { event, findings, severity } of results) {
    const emphasis = severity === 'error' ? '**' : '';
    lines.push(`### ${emphasis}${sanitize(event.title)}${emphasis}`);
    lines.push(
      `Sanity ID: \`${event._id}\` | ${formatDate(event.dateStart)} -- ${formatDate(event.dateEnd)} | ${event.website}`
    );
    lines.push('');
    lines.push(...formatFindings(findings, sanitize));
    lines.push('');
  }
  return lines;
}

function buildReport(results, sanitize, checkedAt) {
  const warnings = results.filter(
    (r) => r.severity === 'warning' || r.severity === 'error'
  );
  const infos = results.filter((r) => r.severity === 'info');
  const clean = results.filter((r) => r.severity === 'ok');

  const lines = [];

  lines.push(
    `Checked ${results.length} upcoming events with websites on ${new Date(checkedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}.`
  );
  lines.push('');

  if (warnings.length === 0 && infos.length === 0) {
    lines.push('All events look up to date. No action needed.');
    return {
      title: 'Event freshness check: all clear',
      body: lines.join('\n'),
    };
  }

  lines.push(...formatReportSection('Needs attention', warnings, sanitize));
  lines.push(...formatReportSection('For review', infos, sanitize));

  // --- Clean ---
  if (clean.length > 0) {
    lines.push(
      `<details><summary>No issues detected (${clean.length})</summary>`
    );
    lines.push('');
    for (const { event } of clean) {
      lines.push(`- ${sanitize(event.title)}`);
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
// Safe-output validation
// ---------------------------------------------------------------------------

function parseReportAnalyses(output) {
  const requests = output.items.filter(
    (item) => item.type === 'publish_freshness_report'
  );
  if (requests.length !== 1 || typeof requests[0].analyses !== 'string') {
    throw new Error('Exactly one freshness report request is required');
  }
  return JSON.parse(requests[0].analyses);
}

function isAnalysisShape(analysis) {
  return (
    Boolean(analysis) &&
    Array.isArray(analysis.changes) &&
    typeof analysis.noChanges === 'boolean' &&
    (analysis.notes === null || typeof analysis.notes === 'string')
  );
}

function isConsistentAnalysis(analysis) {
  if (analysis.noChanges) return analysis.changes.length === 0;
  return analysis.changes.length > 0 || Boolean(analysis.notes?.trim());
}

function isSuggestedChange(change) {
  return (
    Boolean(change) &&
    typeof change.field === 'string' &&
    ['warning', 'info'].includes(change.severity) &&
    typeof change.suggested === 'string' &&
    typeof change.reason === 'string' &&
    Boolean(change.reason.trim())
  );
}

function validateAnalyses(analyses, expected) {
  const byId = new Map();
  for (const analysis of analyses) {
    if (
      !isAnalysisShape(analysis) ||
      !expected.has(analysis._id) ||
      byId.has(analysis._id) ||
      !isConsistentAnalysis(analysis)
    ) {
      throw new Error('Invalid, duplicate or unexpected event analysis');
    }
    for (const change of analysis.changes) {
      if (!isSuggestedChange(change)) {
        throw new Error('Invalid suggested change');
      }
    }
    byId.set(analysis._id, analysis);
  }
  return byId;
}

export function buildValidatedReport(snapshot, output, sanitize = String) {
  const analyses = parseReportAnalyses(output);
  const expected = new Set(
    snapshot.results.filter((result) => result.prompt).map((r) => r.event._id)
  );
  if (!Array.isArray(analyses) || analyses.length !== expected.size) {
    throw new Error('Analysis must cover every event with a comparison prompt');
  }
  const byId = validateAnalyses(analyses, expected);

  const results = snapshot.results.map((result) =>
    result.prompt ? applyAnalysis(result, byId.get(result.event._id)) : result
  );
  return buildReport(results, sanitize, snapshot.checkedAt);
}

export function confirmedPublication(result) {
  const url = result?.issue?.html_url;
  if (
    result?.staged !== false ||
    typeof url !== 'string' ||
    url.trim() === ''
  ) {
    throw new Error('No validated freshness report was published.');
  }
  return { status: 'success', url };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function prepareSnapshot() {
  const events = await fetchUpcomingEvents();
  console.log(`Found ${events.length} upcoming events with websites.`);
  const results = [];
  for (const event of events) {
    console.log(`Fetching: ${event.title}`);
    const result = await prepareEvent(event);
    results.push(result);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return { checkedAt: new Date().toISOString(), results };
}

async function main() {
  const [mode, snapshotPath, outputPath] = process.argv.slice(2);
  if (mode === '--report' && snapshotPath && outputPath) {
    const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
    const output = JSON.parse(await readFile(outputPath, 'utf8'));
    console.log(
      JSON.stringify(buildValidatedReport(snapshot, output), null, 2)
    );
    return;
  }
  if (mode !== '--prepare' || !snapshotPath) {
    throw new Error(
      'Usage: --prepare snapshot.json | --report snapshot.json agent-output.json'
    );
  }
  const snapshot = await prepareSnapshot();
  await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exitCode = 1;
  });
}
