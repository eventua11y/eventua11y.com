/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /**
     * Feature flags resolved per-request from Flagsmith via OpenFeature.
     * Always populated by middleware — never null.
     * Use `import('./types/flags').Flags` form to avoid a top-of-file import
     * that would conflict with PR #638's planned `User` import.
     */
    flags: import('./types/flags').Flags;

    /**
     * Indicates whether flags were resolved from the remote provider or fell
     * back to defaults. Rendered as `data-flags-source` on the `<html>` element.
     */
    flagsSource: 'remote' | 'default';
  }
}
