import { defineMiddleware } from 'astro:middleware';
import { FLAG_DEFAULTS } from '../types/flags.js';

export const flagsMiddleware = defineMiddleware((context, next) => {
  // shortcut: keep Topics off until PostHog replaces this defaults-only bridge.
  context.locals.flags = { ...FLAG_DEFAULTS };
  context.locals.flagsSource = 'default';
  return next();
});
