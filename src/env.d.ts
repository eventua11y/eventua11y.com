/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /**
     * Server-side feature flags populated from safe defaults.
     * Always populated by middleware — never null.
     * Use `import('./types/flags').Flags` form to avoid a top-of-file import
     * that would conflict with PR #638's planned `User` import.
     */
    flags: import('./types/flags').Flags;

    /**
     * Defaults-only bridge diagnostic, rendered as `data-flags-source`
     * on the `<html>` element for server-rendered pages.
     */
    flagsSource: 'default';
  }
}
