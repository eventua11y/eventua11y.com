import { OpenFeature } from '@openfeature/server-sdk';
import { FlagsmithOpenFeatureProvider } from '@openfeature/flagsmith-provider';
import { Flagsmith } from 'flagsmith-nodejs';
import { FLAGSMITH_ENVIRONMENT_KEY } from 'astro:env/server';
import { type Flags, FLAG_DEFAULTS } from '../types/flags.js';

/**
 * Lazy singleton promise for provider initialisation.
 * Reset to null on failure so the next request can retry.
 */
let initPromise: Promise<void> | null = null;

/**
 * Initialise the OpenFeature provider with Flagsmith in Local Evaluation mode.
 *
 * Local Evaluation: the Flagsmith SDK fetches the full Environment Document
 * once at init, then polls every 60s in a background thread. Flag values are
 * computed in-process — there are no per-request HTTP calls to Flagsmith.
 *
 * Requires a "Server-side SDK Token" (not an "Environment API key") in
 * FLAGSMITH_ENVIRONMENT_KEY. The token type difference is invisible to the
 * SDK constructor — both are strings — but local evaluation will fail
 * silently with the wrong key type. See .env.example for setup notes.
 *
 * The 2000ms init timeout applies to the initial Environment Document fetch.
 * Resets `initPromise` on failure so transient errors are retryable.
 */
function initProvider(): Promise<void> {
  if (initPromise !== null) {
    return initPromise;
  }

  const key = FLAGSMITH_ENVIRONMENT_KEY;

  // If the key is absent or empty, skip provider init entirely.
  // Middleware will write FLAG_DEFAULTS and flagsSource='default'.
  if (!key) {
    return Promise.resolve();
  }

  const flagsmithClient = new Flagsmith({
    environmentKey: key,
    // Explicit URL — do not rely on the SDK default. Pinning means a
    // compromised default in a future provider version cannot redirect traffic.
    apiUrl: 'https://api.flagsmith.com/api/v1/',
    // Local Evaluation: fetch the full Environment Document once at init,
    // then poll every 60s in a background thread. Zero per-request HTTP.
    enableLocalEvaluation: true,
    environmentRefreshIntervalSeconds: 60,
    // Required in local evaluation mode — called when a flag name is not
    // found in the Environment Document. Returning enabled:false matches
    // our FLAG_DEFAULTS policy (defence in depth alongside FLAG_DEFAULTS).
    defaultFlagHandler: (_featureName: string) => ({
      enabled: false,
      isDefault: true,
      value: null,
    }),
  });

  const provider = new FlagsmithOpenFeatureProvider(flagsmithClient);

  // Wrap setProviderAndWait in a 2000ms timeout.
  const timeoutMs = 2000;
  const timeoutPromise = new Promise<void>((_, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(`OpenFeature provider init timed out after ${timeoutMs}ms`)
        ),
      timeoutMs
    );
    // Allow Node to exit even if this timer is still pending.
    if (typeof timer === 'object' && 'unref' in timer) {
      (timer as NodeJS.Timeout).unref();
    }
  });

  initPromise = Promise.race([
    OpenFeature.setProviderAndWait(provider),
    timeoutPromise,
  ]).catch((err) => {
    // Reset so the next request can retry.
    initPromise = null;
    throw err;
  });

  return initPromise;
}

/**
 * Ensure the provider is ready. Returns a promise that resolves when the
 * provider is initialised (or rejects if init fails).
 */
export function ensureProviderReady(): Promise<void> {
  return initProvider();
}

/**
 * Resolve all feature flags for the current request.
 * Calls `getBooleanValue` exactly once per flag.
 *
 * The OpenFeature spec guarantees `getBooleanValue` returns `defaultValue`
 * on TYPE_MISMATCH, FLAG_NOT_FOUND, or any provider error — no additional
 * type validation is needed.
 *
 * An empty evaluation context `{}` is passed explicitly to every call.
 * This is a regression-prevention measure: if a future PR accidentally
 * passes user data, code review and tests should catch it.
 */
export async function resolveFlags(): Promise<Flags> {
  const client = OpenFeature.getClient();
  const ctx = {};

  const [user_accounts_enabled, topic_pages_enabled] = await Promise.all([
    client.getBooleanValue(
      'user_accounts_enabled',
      FLAG_DEFAULTS.user_accounts_enabled,
      ctx
    ),
    client.getBooleanValue(
      'topic_pages_enabled',
      FLAG_DEFAULTS.topic_pages_enabled,
      ctx
    ),
  ]);

  return { user_accounts_enabled, topic_pages_enabled };
}
