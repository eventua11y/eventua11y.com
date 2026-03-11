import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: 'https://63a5e1fe7a29dc3df46923bd277aa87e@o4505086842437632.ingest.us.sentry.io/4508463077588992',

  // Discard errors that originate from localhost so that local dev noise
  // never pollutes the production Sentry project (EVENTUA11Y-S).
  allowUrls: [/https?:\/\/eventua11y\.com/],

  // Sample 10% of transactions for performance monitoring (Core Web Vitals).
  tracesSampleRate: 0.1,

  // Suppress errors thrown internally by the Web Awesome library's wa-popup
  // component, which calls hidePopover() without first checking whether the
  // popover is showing (EVENTUA11Y-T, EVENTUA11Y-V).
  ignoreErrors: [
    /Failed to execute 'hidePopover' on 'HTMLElement'/,
    /Failed to execute 'showPopover' on 'HTMLElement'/,
  ],

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
