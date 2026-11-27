import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posthog = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  logger: { info: vi.fn() },
}));

vi.mock('posthog-js', () => ({ default: posthog }));
vi.mock('posthog-js/dist/exception-autocapture', () => ({}));
vi.mock('posthog-js/dist/web-vitals', () => ({}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('SSR', false);
  vi.stubEnv('PUBLIC_POSTHOG_KEY', 'phc_test');
  vi.stubEnv('PUBLIC_POSTHOG_HOST', 'https://posthog.test');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('PostHog analytics', () => {
  it.each(['missing key', 'missing host', 'SSR'])(
    'does not initialize or capture with %s',
    async (scenario) => {
      if (scenario === 'missing key') vi.stubEnv('PUBLIC_POSTHOG_KEY', '');
      if (scenario === 'missing host') vi.stubEnv('PUBLIC_POSTHOG_HOST', '');
      if (scenario === 'SSR') vi.stubEnv('SSR', true);

      const { capture, logBrowserReady } = await import('./analytics');
      capture('filters_reset');
      logBrowserReady();
      await vi.dynamicImportSettled();

      expect(posthog.init).not.toHaveBeenCalled();
      expect(posthog.capture).not.toHaveBeenCalled();
      expect(posthog.logger.info).not.toHaveBeenCalled();
    }
  );

  it('suppresses known browser noise without dropping other exceptions', async () => {
    await import('./analytics');
    await vi.dynamicImportSettled();

    const [, config] = posthog.init.mock.calls[0];
    const exception = (value: string) => ({
      event: '$exception',
      properties: { $exception_list: [{ value }] },
    });
    const error = exception('An unexpected error');

    expect(
      config.before_send(
        exception("Failed to execute 'showPopover' on 'HTMLElement'")
      )
    ).toBeNull();
    expect(config.before_send(error)).toBe(error);
  });

  it('keeps only the origin and path in Web Vitals URLs', async () => {
    const pageUrl = 'https://eventua11y.com/events/example';
    vi.stubGlobal('location', new URL(`${pageUrl}?private=value#fragment`));
    await import('./analytics');
    await vi.dynamicImportSettled();

    const [, config] = posthog.init.mock.calls[0];
    const event = {
      event: '$web_vitals',
      properties: {
        $web_vitals_LCP_event: {
          value: 100,
          $current_url: location.href,
          navigationURL: location.href,
        },
      },
    };

    expect(config.before_send(event).properties).toEqual({
      $current_url: pageUrl,
      $web_vitals_LCP_event: { value: 100, $current_url: pageUrl },
    });
  });

  it('initializes once and sends queued interactions and lifecycle logs', async () => {
    const { capture, logBrowserReady } = await import('./analytics');
    capture('filters_reset');
    const outboundOptions = {
      transport: 'sendBeacon',
      send_instantly: true,
    } as const;
    capture('book_link_clicked', undefined, outboundOptions);
    logBrowserReady();
    await vi.dynamicImportSettled();

    expect(posthog.init).toHaveBeenCalledExactlyOnceWith(
      'phc_test',
      expect.objectContaining({
        api_host: 'https://posthog.test',
        autocapture: false,
        disable_session_recording: true,
        capture_performance: {
          web_vitals: true,
          web_vitals_attribution: false,
          network_timing: false,
        },
        persistence: 'memory',
        person_profiles: 'never',
      })
    );
    expect(posthog.capture.mock.calls).toEqual([
      ['filters_reset', undefined, undefined],
      ['book_link_clicked', undefined, outboundOptions],
    ]);
    const [, config] = posthog.init.mock.calls[0];
    const event = {
      properties: {
        $session_entry_utm_source: 'private',
        filter_name: 'attendance',
      },
    };
    expect(config.before_send(event).properties).toEqual({
      filter_name: 'attendance',
    });
    expect(config.logs.beforeSend({ body: 'Ready' }).attributes).toEqual({
      'url.full': null,
    });
    expect(posthog.logger.info.mock.calls.map(([, props]) => props)).toEqual([
      { lifecycle_stage: 'client_initialization' },
      { lifecycle_stage: 'dom_content_loaded' },
    ]);
  });
});
