import type { CaptureOptions, Properties } from 'posthog-js';

const key = import.meta.env.PUBLIC_POSTHOG_KEY;
const host = import.meta.env.PUBLIC_POSTHOG_HOST;

const client =
  !import.meta.env.SSR && key && host
    ? Promise.all([
        import('posthog-js'),
        import('posthog-js/dist/exception-autocapture'),
      ])
        .then(([{ default: posthog }]) => {
          posthog.init(key, {
            api_host: host,
            advanced_disable_flags: true,
            disable_external_dependency_loading: true,
            autocapture: false,
            capture_pageview: false,
            capture_pageleave: false,
            disable_session_recording: true,
            disable_surveys: true,
            persistence: 'memory',
            person_profiles: 'never',
            respect_dnt: true,
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
              // Session attribution can include arbitrary campaign parameters.
              if (!event?.properties) return event;
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
