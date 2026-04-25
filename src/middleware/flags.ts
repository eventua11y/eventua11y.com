import { defineMiddleware } from 'astro:middleware';
import * as Sentry from '@sentry/astro';
import { ensureProviderReady, resolveFlags } from '../lib/flags.js';
import { FLAG_DEFAULTS } from '../types/flags.js';
import { FLAGSMITH_ENVIRONMENT_KEY } from 'astro:env/server';

const MIDDLEWARE_TIMEOUT_MS = 500;

// Tracks whether we've already sent a Sentry alert for a missing key in this
// Lambda instance. Resets on cold start. Prevents per-request event spam.
let missingKeyReported = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const flagsMiddleware = defineMiddleware(async (context, next) => {
  try {
    const key = FLAGSMITH_ENVIRONMENT_KEY;

    if (!key) {
      // No key configured — use defaults silently (expected in local dev).
      context.locals.flags = FLAG_DEFAULTS;
      context.locals.flagsSource = 'default';

      // In production, a missing key is a misconfiguration — alert via Sentry
      // once per Lambda instance (not per request, to avoid event spam).
      if (import.meta.env.PROD && !missingKeyReported) {
        missingKeyReported = true;
        Sentry.captureMessage(
          'FLAGSMITH_ENVIRONMENT_KEY is not set in production; serving flag defaults',
          'warning'
        );
      }
    } else {
      // Race provider init against a 500ms middleware-level timeout.
      // If we time out, serve defaults and let init continue in the background
      // so the next request benefits from a warm provider.
      let providerReady = false;

      await Promise.race([
        ensureProviderReady().then(() => {
          providerReady = true;
        }),
        sleep(MIDDLEWARE_TIMEOUT_MS),
      ]);

      if (providerReady) {
        context.locals.flags = await resolveFlags();
        context.locals.flagsSource = 'remote';
      } else {
        // Provider not ready within 500ms — fall back to defaults.
        // Log a breadcrumb (not captureException) for normal fallback.
        Sentry.addBreadcrumb({
          category: 'flags',
          message:
            'Flag provider not ready within middleware timeout; using defaults',
          level: 'warning',
        });
        context.locals.flags = FLAG_DEFAULTS;
        context.locals.flagsSource = 'default';
      }
    }
  } catch (err) {
    // Any thrown error → defaults + capture.
    Sentry.captureException(err);
    context.locals.flags = FLAG_DEFAULTS;
    context.locals.flagsSource = 'default';
  }

  // Tag every Sentry transaction with the flag source for observability.
  Sentry.getCurrentScope().setTag('flags.source', context.locals.flagsSource);

  return next();
});
