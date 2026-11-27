import type { MiddlewareHandler } from 'astro';
import { PostHog } from 'posthog-node';

const key = import.meta.env.PUBLIC_POSTHOG_KEY;
const host = import.meta.env.PUBLIC_POSTHOG_HOST;
const posthog =
  key && host
    ? new PostHog(key, { host, requestTimeout: 1000, fetchRetryCount: 0 })
    : undefined;

function watchResponseBody(
  response: Response,
  reportError: (error: unknown) => Promise<void>
) {
  if (!response.body) return response;

  const reader = response.body.getReader();
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        try {
          const chunk = await reader.read();
          if (cancelled) return;
          if (chunk.done) {
            reader.releaseLock();
            controller.close();
          } else {
            controller.enqueue(chunk.value);
          }
        } catch (error) {
          if (cancelled) return;
          await reportError(error);
          if (!cancelled) {
            reader.releaseLock();
            controller.error(error);
          }
        }
      },
      async cancel(reason) {
        cancelled = true;
        try {
          await reader.cancel(reason);
        } finally {
          reader.releaseLock();
        }
      },
    },
    { highWaterMark: 0 }
  );

  return new Response(body, response);
}

export const onRequest = (async (context, next) => {
  const render = async () => {
    const response = await next();
    if (
      context.locals?.homepageEventsLoaded &&
      context.url.pathname === '/' &&
      context.request.method === 'GET' &&
      response.status === 200 &&
      response.headers.get('Content-Type')?.split(';')[0] === 'text/html' &&
      !response.headers.has('Set-Cookie') &&
      // Astro appends these cookies after middleware returns.
      context.cookies.headers().next().done
    ) {
      response.headers.set('Netlify-CDN-Cache-Control', 'public, s-maxage=60');
    }
    return response;
  };

  if (!posthog || context.isPrerendered) return render();

  const reportError = async (error: unknown) => {
    try {
      await posthog.captureExceptionImmediate(error, {
        properties: { runtime: 'astro', route: context.routePattern },
      });
    } catch {
      // Telemetry must not replace the error Astro handles.
    }
  };

  try {
    return watchResponseBody(await render(), reportError);
  } catch (error) {
    await reportError(error);
    throw error;
  }
}) satisfies MiddlewareHandler;
