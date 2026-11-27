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

describe('Event listing CDN cache eligibility', () => {
  it.each([
    { scenario: 'a successful GET', expected: 'public, s-maxage=60' },
    { scenario: 'a Set-Cookie header', setCookie: true },
    { scenario: 'an Astro cookie queued during rendering', queueCookie: true },
    { scenario: 'a HEAD request', method: 'HEAD' },
    { scenario: 'the events API', path: '/api/get-events' },
    {
      scenario: 'an event detail page with only listing eligibility',
      path: '/events/example',
    },
    { scenario: 'the topics index', path: '/topics' },
    { scenario: 'a topic detail page', path: '/topics/example' },
    { scenario: 'a non-200 response', status: 503 },
  ])(
    'handles $scenario',
    async ({
      expected,
      setCookie,
      queueCookie,
      method,
      status,
      path = '/',
    }) => {
      const { onRequest } = await import('./middleware');
      const request = new Request(`https://example.test${path}`, { method });
      const context = createContext({ request, defaultLocale: '' });
      const headers = new Headers({ 'Content-Type': 'text/html' });
      if (setCookie) headers.set('Set-Cookie', 'test=value');

      const response = await onRequest(context, async () => {
        context.locals.staticEventListLoaded = true;
        if (queueCookie) context.cookies.set('test', 'value');
        return new Response(null, { status, headers });
      });

      expect(response.headers.get('Netlify-CDN-Cache-Control')).toBe(
        expected ?? null
      );
    }
  );
});

describe('Event detail CDN cache eligibility', () => {
  it.each([
    { scenario: 'a successful GET', cacheable: true },
    { scenario: 'a trailing slash', path: '/events/example/', cacheable: true },
    { scenario: 'no successful lookup', loaded: false },
    { scenario: 'a non-200 response', status: 201 },
    { scenario: 'a Set-Cookie header', setCookie: true },
    { scenario: 'an Astro cookie queued during rendering', queueCookie: true },
    { scenario: 'a HEAD request', method: 'HEAD' },
    { scenario: 'a POST request', method: 'POST' },
    { scenario: 'a non-HTML response', contentType: 'application/json' },
    { scenario: 'the bare events path', path: '/events/' },
    { scenario: 'a nested path', path: '/events/example/nested' },
    { scenario: 'the events API', path: '/api/get-events' },
    { scenario: 'a topic detail page', path: '/topics/example' },
  ])(
    'handles $scenario',
    async ({
      cacheable,
      loaded = true,
      status,
      setCookie,
      queueCookie,
      method,
      contentType = 'text/html; charset=utf-8',
      path = '/events/example',
    }) => {
      const { onRequest } = await import('./middleware');
      const request = new Request(`https://example.test${path}`, { method });
      const context = createContext({ request, defaultLocale: '' });
      const headers = new Headers({ 'Content-Type': contentType });
      if (setCookie) headers.set('Set-Cookie', 'test=value');

      const response = await onRequest(context, async () => {
        if (loaded) context.locals.eventDetailLoaded = true;
        if (queueCookie) context.cookies.set('test', 'value');
        return new Response(null, { status, headers });
      });

      expect(response.headers.get('Netlify-CDN-Cache-Control')).toBe(
        cacheable ? 'public, s-maxage=60' : null
      );
    }
  );

  it.each(['no cookie', 'Astro cookie', 'Set-Cookie'])(
    'checks CDN eligibility after the last detail chunk (%s)',
    async (cookie) => {
      const { onRequest } = await import('./middleware');
      const request = new Request('https://example.test/events/example');
      const context = createContext({ request, defaultLocale: '' });
      context.locals.eventDetailLoaded = true;
      const encoder = new TextEncoder();
      const headers = new Headers({ 'Content-Type': 'text/html' });
      const pull = vi
        .fn<(controller: ReadableStreamDefaultController<Uint8Array>) => void>()
        .mockImplementationOnce((controller) =>
          controller.enqueue(encoder.encode('<h1>'))
        )
        .mockImplementationOnce((controller) => {
          if (cookie === 'Astro cookie') context.cookies.set('test', 'value');
          if (cookie === 'Set-Cookie') {
            rendered.headers.set('Set-Cookie', 'test=value');
          }
          controller.enqueue(encoder.encode('Event</h1>'));
          controller.close();
        });
      const stream = new ReadableStream({ pull }, { highWaterMark: 0 });
      const rendered = new Response(stream, { headers });

      const response = await onRequest(context, async () => rendered);

      expect(pull).toHaveBeenCalledTimes(2);
      expect(response.headers.get('Netlify-CDN-Cache-Control')).toBe(
        cookie === 'no cookie' ? 'public, s-maxage=60' : null
      );
      if (cookie === 'Set-Cookie') {
        expect(response.headers.get('Set-Cookie')).toBe('test=value');
      }
      expect(await response.text()).toBe('<h1>Event</h1>');
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

  it.each([
    {
      scenario: 'listing',
      path: '/',
      route: '/',
      expected: 'public, s-maxage=60',
    },
    {
      scenario: 'ineligible detail',
      path: '/events/example',
      route: '/events/[slug]',
    },
  ])(
    'keeps $scenario streams lazy and reports late errors',
    async ({ path, route, expected }) => {
      const { onRequest } = await import('./middleware');
      const request = new Request(`https://example.test${path}`);
      const renderContext = createContext({ request, defaultLocale: '' });
      renderContext.routePattern = route;
      renderContext.locals.staticEventListLoaded = path === '/';
      renderContext.locals.eventDetailLoaded = path !== '/';
      const error = new Error('render failed after headers');
      capture.mockRejectedValue(new Error('telemetry failure'));
      const chunk = new TextEncoder().encode('first chunk');
      const pull = vi
        .fn<(controller: ReadableStreamDefaultController<Uint8Array>) => void>()
        .mockImplementationOnce((controller) => controller.enqueue(chunk))
        .mockImplementationOnce((controller) => controller.error(error));
      const stream = new ReadableStream({ pull }, { highWaterMark: 0 });
      const headers = new Headers({ 'Content-Type': 'text/html' });
      if (!expected) headers.set('Set-Cookie', 'test=value');
      const response = await onRequest(
        renderContext,
        async () => new Response(stream, { headers })
      );

      expect(pull).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');
      expect(response.headers.get('Netlify-CDN-Cache-Control')).toBe(
        expected ?? null
      );
      const reader = response.body!.getReader();
      await expect(reader.read()).resolves.toEqual({
        done: false,
        value: chunk,
      });
      expect(pull).toHaveBeenCalledTimes(1);
      expect(capture).not.toHaveBeenCalled();

      await expect(reader.read()).rejects.toBe(error);
      expect(stream.locked).toBe(false);
      expect(capture).toHaveBeenCalledExactlyOnceWith(error, {
        properties: { runtime: 'astro', route },
      });
    }
  );

  it.each(['configured', 'disabled'])(
    'rejects before returning a cacheable detail response with PostHog %s',
    async (telemetry) => {
      if (telemetry === 'disabled') vi.stubEnv('PUBLIC_POSTHOG_KEY', '');
      const { onRequest } = await import('./middleware');
      const request = new Request('https://example.test/events/example');
      const renderContext = createContext({ request, defaultLocale: '' });
      renderContext.routePattern = '/events/[slug]';
      renderContext.locals.eventDetailLoaded = true;
      const error = new Error('render failed after first chunk');
      const pull = vi
        .fn<(controller: ReadableStreamDefaultController<Uint8Array>) => void>()
        .mockImplementationOnce((controller) =>
          controller.enqueue(new TextEncoder().encode('first chunk'))
        )
        .mockImplementationOnce((controller) => controller.error(error));
      const stream = new ReadableStream({ pull }, { highWaterMark: 0 });

      await expect(
        onRequest(
          renderContext,
          async () =>
            new Response(stream, {
              headers: { 'Content-Type': 'text/html' },
            })
        )
      ).rejects.toBe(error);
      expect(pull).toHaveBeenCalledTimes(2);
      if (telemetry === 'configured') {
        expect(capture).toHaveBeenCalledExactlyOnceWith(error, {
          properties: { runtime: 'astro', route: '/events/[slug]' },
        });
      } else {
        expect(capture).not.toHaveBeenCalled();
      }
    }
  );

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
