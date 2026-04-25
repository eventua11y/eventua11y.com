import { sequence } from 'astro:middleware';
import { flagsMiddleware } from './flags.js';

// sequence() is used from day one so future PRs (e.g. PR #638 auth middleware)
// can be added to this list without any structural change:
//   export const onRequest = sequence(flagsMiddleware, authMiddleware);
export const onRequest = sequence(flagsMiddleware);
