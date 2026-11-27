import type { MiddlewareHandler } from 'astro';
import { PostHog } from 'posthog-node';

const key = import.meta.env.PUBLIC_POSTHOG_KEY;
const host = import.meta.env.PUBLIC_POSTHOG_HOST;
const posthog =
  key && host
    ? new PostHog(key, { host, requestTimeout: 1000, fetchRetryCount: 0 })
    : undefined;

export const onRequest: MiddlewareHandler = async (context, next) => {
  try {
    return await next();
  } catch (error) {
    if (posthog && !context.isPrerendered) {
      try {
        await posthog.captureExceptionImmediate(error, {
          properties: { runtime: 'astro', route: context.routePattern },
        });
      } catch {
        // Telemetry must not replace the error Astro handles.
      }
    }
    throw error;
  }
};
