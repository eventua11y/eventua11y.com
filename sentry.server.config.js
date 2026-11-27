import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: 'https://63a5e1fe7a29dc3df46923bd277aa87e@o4505086842437632.ingest.us.sentry.io/4508463077588992',

  // Sample 10% of transactions for performance monitoring.
  tracesSampleRate: 0.1,
});
