/**
 * Feature flags resolved per-request from Flagsmith via OpenFeature.
 *
 * All members are boolean and required. Middleware always populates this
 * interface — downstream code must never need a null guard on `Astro.locals.flags`.
 *
 * **Prerendered pages cannot access `Astro.locals.flags`.** Flag-gated UI must
 * not appear on prerendered pages (e.g. 404.astro, accessibility.astro,
 * curation-policy.astro).
 *
 * **Vue islands** receive flag values only via Astro-rendered props. Do not
 * import from `src/lib/flags.ts` or any OpenFeature/Flagsmith package in
 * client-side code.
 */
export interface Flags {
  /**
   * Gates the topic pages feature (PR #575).
   * When true, topic index and detail pages become available.
   */
  topic_pages_enabled: boolean;
}

/**
 * Safe defaults used when the Flagsmith provider is unavailable or times out.
 * All flags default to `false` so unreleased features remain hidden.
 */
export const FLAG_DEFAULTS: Flags = {
  topic_pages_enabled: false,
};
