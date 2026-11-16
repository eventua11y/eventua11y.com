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
 *  5. Drop datetime suggestions that resolve to a past date.
 *  6. Drop callForSpeakers toggles once the closing date has passed
 *     (no visible/behavioural effect).
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
  if (!Object.hasOwn(FIELD_TYPES, field)) {
    return { keep: false, drop: `unsupported field: ${field}` };
  }

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
    const suggestedDay = parseSuggestedDate(suggested);
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
    const suggestedDay = parseSuggestedDate(suggested);
    if (suggestedDay.isValid() && suggestedDay.isBefore(dayjs(), 'day')) {
      return {
        keep: false,
        drop: `${field} suggested value (${suggested}) is in the past; likely website still shows previous edition`,
      };
    }
  }

  // Rule 6: no-op callForSpeakers toggles once the deadline has passed
  //
  // `callForSpeakers` only has a visible/behavioural effect while the
  // call is open: the frontend derives openness via isCallForSpeakersOpen
  // (callForSpeakers === true AND now < callForSpeakersClosingDate), and a
  // CFS deadline event is only synthesised when the closing date is in the
  // future. So once callForSpeakersClosingDate is in the past, flipping the
  // boolean either way changes nothing users can see. Drop those to avoid
  // surfacing purely cosmetic data-tidiness edits.
  if (field === 'callForSpeakers' && event.callForSpeakersClosingDate) {
    const closingDay = dayjs(event.callForSpeakersClosingDate);
    if (closingDay.isValid() && closingDay.isBefore(dayjs())) {
      return {
        keep: false,
        drop: `callForSpeakers closing date (${event.callForSpeakersClosingDate}) has passed; toggling the flag has no effect`,
      };
    }
  }

  return { keep: true };
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

/**
 * Prepare the same comparison instructions for each event.
 *
 * @param {object} event - The Sanity event document
 * @param {string} pageText - Plain text extracted from the event website
 * @returns {string}
 */
function buildAnalysisPrompt(event, pageText) {
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

function applyAnalysis(result, analysis) {
  const { event } = result;
  const findings = [...result.findings];
  let severity = result.severity;

  // Validate every suggested change against the schema. The model's
  // instructions cover this, but we double-check deterministically so a
  // single bad model response can't introduce noisy or invalid suggestions.
  const dropped = [];
  if (analysis.changes && analysis.changes.length > 0) {
    const kept = [];
    for (const change of analysis.changes) {
      const current = event[change.field] ?? null;
      const candidate = { ...change, current };
      const verdict = validateChange(candidate, event);
      if (verdict.keep) {
        kept.push(candidate);
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
    if (severity === 'ok') severity = 'info';
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

  // --- Issues needing attention ---
  if (warnings.length > 0) {
    lines.push(`## Needs attention (${warnings.length})`);
    lines.push('');
    for (const { event, findings, severity } of warnings) {
      const icon = severity === 'error' ? '**' : '';
      lines.push(`### ${icon}${sanitize(event.title)}${icon}`);
      lines.push(
        `Sanity ID: \`${event._id}\` | ${formatDate(event.dateStart)} -- ${formatDate(event.dateEnd)} | ${event.website}`
      );
      lines.push('');
      lines.push(...formatFindings(findings, sanitize));
      lines.push('');
    }
  }

  // --- Informational ---
  if (infos.length > 0) {
    lines.push(`## For review (${infos.length})`);
    lines.push('');
    for (const { event, findings } of infos) {
      lines.push(`### ${sanitize(event.title)}`);
      lines.push(
        `Sanity ID: \`${event._id}\` | ${formatDate(event.dateStart)} -- ${formatDate(event.dateEnd)} | ${event.website}`
      );
      lines.push('');
      lines.push(...formatFindings(findings, sanitize));
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

export function buildValidatedReport(snapshot, output, sanitize = String) {
  const requests = output.items.filter(
    (item) => item.type === 'publish_freshness_report'
  );
  if (requests.length !== 1 || typeof requests[0].analyses !== 'string') {
    throw new Error('Exactly one freshness report request is required');
  }
  const analyses = JSON.parse(requests[0].analyses);
  const expected = new Set(
    snapshot.results.filter((result) => result.prompt).map((r) => r.event._id)
  );
  if (!Array.isArray(analyses) || analyses.length !== expected.size) {
    throw new Error('Analysis must cover every event with a comparison prompt');
  }

  const byId = new Map();
  for (const analysis of analyses) {
    if (
      !analysis ||
      !expected.has(analysis._id) ||
      byId.has(analysis._id) ||
      !Array.isArray(analysis.changes) ||
      typeof analysis.noChanges !== 'boolean' ||
      (analysis.noChanges && analysis.changes.length > 0) ||
      !(analysis.notes === null || typeof analysis.notes === 'string') ||
      (!analysis.noChanges &&
        analysis.changes.length === 0 &&
        !analysis.notes?.trim())
    ) {
      throw new Error('Invalid, duplicate or unexpected event analysis');
    }
    for (const change of analysis.changes) {
      if (
        !change ||
        typeof change.field !== 'string' ||
        !['warning', 'info'].includes(change.severity) ||
        typeof change.suggested !== 'string' ||
        typeof change.reason !== 'string' ||
        !change.reason.trim()
      ) {
        throw new Error('Invalid suggested change');
      }
    }
    byId.set(analysis._id, analysis);
  }

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
