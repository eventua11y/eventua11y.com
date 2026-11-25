/**
 * Server-side feature flags populated by middleware from safe defaults.
 * Prerendered pages cannot read locals; Vue islands receive flags as props.
 */
export interface Flags {
  /** Gates topic pages, navigation, sitemap entries and event topic links. */
  topic_pages_enabled: boolean;
}

/** Keep unreleased features off until a replacement provider is integrated. */
export const FLAG_DEFAULTS: Flags = {
  topic_pages_enabled: false,
};
