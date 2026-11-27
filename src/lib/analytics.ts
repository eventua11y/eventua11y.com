import type { CaptureOptions, Properties } from 'posthog-js';

const key = import.meta.env.PUBLIC_POSTHOG_KEY;
const host = import.meta.env.PUBLIC_POSTHOG_HOST;

// Known noise from Web Awesome popovers, prefetching, and extensions.
const ignoredException =
  /Failed to execute '(hide|show)Popover' on 'HTMLElement'|^Load failed\b|^error loading dynamically imported module|Object Not Found Matching Id:|The object can not be found here\./;

function visitorOptedOut() {
  const browser = globalThis as typeof globalThis & {
    doNotTrack?: string;
    navigator: Navigator & {
      msDoNotTrack?: string;
      globalPrivacyControl?: boolean;
    };
  };
  return [
    browser.doNotTrack,
    browser.navigator.doNotTrack,
    browser.navigator.msDoNotTrack,
    browser.navigator.globalPrivacyControl,
  ].some((value) => [true, 'true', 1, '1', 'yes'].includes(value ?? false));
}

function redactPageUrls(properties: Properties) {
  // PostHog needs the page URL for its breakdown, but not the query or fragment.
  const pageUrl = location.origin + location.pathname;
  properties.$current_url = pageUrl;
  for (const name of ['CLS', 'FCP', 'INP', 'LCP']) {
    const metric = properties[`$web_vitals_${name}_event`];
    if (!metric) continue;
    metric.$current_url = pageUrl;
    delete metric.navigationURL;
  }
}

const client =
  !import.meta.env.SSR && key && host && !visitorOptedOut()
    ? Promise.all([
        import('posthog-js'),
        import('posthog-js/dist/exception-autocapture'),
        import('posthog-js/dist/web-vitals'),
      ])
        .then(([{ default: posthog }]) => {
          posthog.init(key, {
            api_host: host,
            advanced_disable_flags: true,
            disable_external_dependency_loading: true,
            autocapture: false,
            capture_pageview: true,
            capture_pageleave: true,
            disable_session_recording: true,
            capture_performance: {
              web_vitals: true,
              web_vitals_attribution: false,
              network_timing: false,
            },
            disable_surveys: true,
            // Cookieless mode skips the SDK's opt-out check, so check before init.
            cookieless_mode: 'always',
            person_profiles: 'never',
            ip: false,
            save_referrer: false,
            save_campaign_params: false,
            property_denylist: [
              '$current_url',
              '$initial_current_url',
              '$referrer',
              '$initial_referrer',
              '$search_keyword',
            ],
            before_send: (event) => {
              if (!event?.properties) return event;
              const exceptions = event.properties.$exception_list;
              if (
                event.event === '$exception' &&
                Array.isArray(exceptions) &&
                exceptions.some(({ value }) => ignoredException.test(value))
              ) {
                return null;
              }

              if (
                ['$pageview', '$pageleave', '$web_vitals'].includes(event.event)
              ) {
                redactPageUrls(event.properties);
              }

              // Session attribution can include arbitrary campaign parameters.
              for (const name in event.properties) {
                if (name.startsWith('$session_entry_')) {
                  delete event.properties[name];
                }
              }
              return event;
            },
            capture_exceptions: {
              capture_unhandled_errors: true,
              capture_unhandled_rejections: true,
              capture_console_errors: false,
            },
            logs: {
              serviceName: 'eventua11y-web',
              environment: import.meta.env.MODE,
              captureConsoleLogs: false,
              beforeSend: (record) => ({
                ...record,
                attributes: { ...record.attributes, 'url.full': null },
              }),
            },
          });
          posthog.logger.info('PostHog browser log capture initialized', {
            lifecycle_stage: 'client_initialization',
          });
          return posthog;
        })
        .catch(() => undefined)
    : undefined;

export function capture(
  event: string,
  properties?: Properties,
  options?: CaptureOptions
) {
  void client?.then((posthog) => posthog?.capture(event, properties, options));
}

export function logBrowserReady() {
  void client?.then((posthog) =>
    posthog?.logger.info('Browser interface ready', {
      lifecycle_stage: 'dom_content_loaded',
    })
  );
}
