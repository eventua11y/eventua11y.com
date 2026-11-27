/**
 * assembleEvents runs in the /api/get-events edge function on every
 * uncached request, so its cost is on the critical path of the site.
 */

import { test } from 'vitest';
import { assembleEvents } from '../netlify/edge-functions/lib/assembleEvents';
import { makeAssemblableEvents } from './fixtures';

const small = makeAssemblableEvents(20, 3);
const typical = makeAssemblableEvents(120, 6);
const large = makeAssemblableEvents(500, 10);

test('assembleEvents', async ({ bench }) => {
  await bench('20 parents / 60 children', () => {
    assembleEvents(small.parents, small.children);
  }).run();

  await bench('120 parents / 720 children', () => {
    assembleEvents(typical.parents, typical.children);
  }).run();

  await bench('500 parents / 5000 children', () => {
    assembleEvents(large.parents, large.children);
  }).run();
});
