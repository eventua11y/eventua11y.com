import type { APIContext } from 'astro';
import { createContext } from 'astro/middleware';
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

describe('Homepage CDN cache eligibility', () => {
  it.each([
    { scenario: 'a successful GET', expected: 'public, s-maxage=60' },
    { scenario: 'a Set-Cookie header', setCookie: true },
    { scenario: 'an Astro cookie queued during rendering', queueCookie: true },
    { scenario: 'a HEAD request', method: 'HEAD' },
    { scenario: 'a non-200 response', status: 503 },
  ])(
    'handles $scenario',
    async ({ expected, setCookie, queueCookie, method, status }) => {
      const { onRequest } = await import('./middleware');
      const request = new Request('https://example.test/', { method });
      const context = createContext({ request, defaultLocale: '' });
      const headers = new Headers({ 'Content-Type': 'text/html' });
      if (setCookie) headers.set('Set-Cookie', 'test=value');

      const response = await onRequest(context, async () => {
        context.locals.homepageEventsLoaded = true;
        if (queueCookie) context.cookies.set('test', 'value');
        return new Response(null, { status, headers });
      });

      expect(response.headers.get('Netlify-CDN-Cache-Control')).toBe(
        expected ?? null
      );
    }
  );
});

describe('Astro error tracking', () => {
  it('passes through the response without reporting an error', async () => {
    const { onRequest } = await import('./middleware');
    const response = new Response(null, { status: 404 });

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

  it('streams chunks on demand and reports a later body error without replacing it', async () => {
    const { onRequest } = await import('./middleware');
    const error = new Error('render failed after headers');
    capture.mockRejectedValue(new Error('telemetry failure'));
    const chunk = new TextEncoder().encode('first chunk');
    const pull = vi
      .fn<(controller: ReadableStreamDefaultController<Uint8Array>) => void>()
      .mockImplementationOnce((controller) => controller.enqueue(chunk))
      .mockImplementationOnce((controller) => controller.error(error));
    const stream = new ReadableStream({ pull }, { highWaterMark: 0 });
    const response = await onRequest(
      context,
      async () =>
        new Response(stream, {
          status: 201,
          headers: { 'content-type': 'text/html' },
        })
    );

    expect(pull).not.toHaveBeenCalled();
    expect(response.status).toBe(201);
    expect(response.headers.get('content-type')).toBe('text/html');
    const reader = response.body!.getReader();
    await expect(reader.read()).resolves.toEqual({ done: false, value: chunk });
    expect(pull).toHaveBeenCalledTimes(1);
    expect(capture).not.toHaveBeenCalled();

    await expect(reader.read()).rejects.toBe(error);
    expect(stream.locked).toBe(false);
    expect(capture).toHaveBeenCalledExactlyOnceWith(error, {
      properties: { runtime: 'astro', route: '/events/[slug]' },
    });
  });

  it('forwards cancellation even with a pending read and does not report it', async () => {
    const { onRequest } = await import('./middleware');
    const cancel = vi.fn();
    const pull = vi.fn();
    const stream = new ReadableStream({ pull, cancel }, { highWaterMark: 0 });
    const response = await onRequest(context, async () => new Response(stream));
    const reader = response.body!.getReader();
    const pending = reader.read();
    await vi.waitFor(() => expect(pull).toHaveBeenCalledOnce());

    await reader.cancel('client disconnected');

    await expect(pending).resolves.toMatchObject({ done: true });
    expect(cancel).toHaveBeenCalledExactlyOnceWith('client disconnected');
    expect(stream.locked).toBe(false);
    expect(capture).not.toHaveBeenCalled();
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
