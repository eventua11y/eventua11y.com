import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: 'https://63a5e1fe7a29dc3df46923bd277aa87e@o4505086842437632.ingest.us.sentry.io/4508463077588992',
  beforeSendSpan(span) {
    // Filter out data URI fetches (e.g. inline SVGs) which are in-memory,
    // not real network requests, and trigger false N+1 API call warnings
    // in Sentry (EVENTUA11Y-R).
    if (span.description && span.description.startsWith('data:image/')) {
      return null;
    }
    return span;
  },
});
