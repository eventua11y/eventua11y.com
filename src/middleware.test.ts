import type { APIContext } from 'astro';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const capture = vi.hoisted(() => vi.fn());

vi.mock('posthog-node', () => ({
  PostHog: class {
    captureExceptionImmediate = capture;
  },
}));

const context = { routePattern: '/events/[slug]' } as APIContext;

beforeEach(() => {
  vi.resetModules();
  capture.mockReset();
  vi.stubEnv('PUBLIC_POSTHOG_KEY', 'phc_test');
  vi.stubEnv('PUBLIC_POSTHOG_HOST', 'https://posthog.test');
});

afterEach(() => vi.unstubAllEnvs());

describe('Astro error tracking', () => {
  it('passes through the response without reporting an error', async () => {
    const { onRequest } = await import('./middleware');
    const response = new Response('Not found', { status: 404 });

    expect(await onRequest(context, async () => response)).toBe(response);
    expect(capture).not.toHaveBeenCalled();
  });

  it('reports the exception and still throws it for Astro to handle', async () => {
    const { onRequest } = await import('./middleware');
    const error = new Error('test SSR error');

    await expect(onRequest(context, () => Promise.reject(error))).rejects.toBe(
      error
    );
    expect(capture).toHaveBeenCalledExactlyOnceWith(error, {
      properties: { runtime: 'astro', route: '/events/[slug]' },
    });
  });

  it.each(['missing configuration', 'prerendering', 'failed delivery'])(
    'preserves the original error during %s',
    async (scenario) => {
      if (scenario === 'missing configuration') {
        vi.stubEnv('PUBLIC_POSTHOG_KEY', '');
      }
      capture.mockRejectedValue(new Error('telemetry failure'));
      const { onRequest } = await import('./middleware');
      const error = new Error('original error');

      await expect(
        onRequest(
          { ...context, isPrerendered: scenario === 'prerendering' },
          () => Promise.reject(error)
        )
      ).rejects.toBe(error);
      expect(capture).toHaveBeenCalledTimes(
        scenario === 'failed delivery' ? 1 : 0
      );
    }
  );
});
