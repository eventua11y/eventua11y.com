import * as Sentry from '@sentry/astro';

// Capture the key value at module load time (before any request).
// Used only for scrubbing — never logged or exposed.
const FLAGSMITH_KEY = process.env.FLAGSMITH_ENVIRONMENT_KEY;

Sentry.init({
  dsn: 'https://63a5e1fe7a29dc3df46923bd277aa87e@o4505086842437632.ingest.us.sentry.io/4508463077588992',

  // Sample 10% of transactions for performance monitoring.
  tracesSampleRate: 0.1,

  beforeSend(event) {
    // Drop any event whose serialised form contains the actual Flagsmith key
    // value. Replace with a redaction marker rather than dropping the whole
    // event so the error context is preserved.
    if (!FLAGSMITH_KEY) return event;
    try {
      const serialised = JSON.stringify(event);
      if (serialised.includes(FLAGSMITH_KEY)) {
        const scrubbed = serialised.replaceAll(
          FLAGSMITH_KEY,
          '[FLAGSMITH_KEY_REDACTED]'
        );
        return JSON.parse(scrubbed);
      }
    } catch {
      // If serialisation fails, return the event unmodified.
    }
    return event;
  },
});
