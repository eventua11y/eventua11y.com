/**
 * Pre-configured dayjs instance with all plugins used across the app.
 *
 * Import dayjs from this module instead of 'dayjs' directly to avoid
 * repeating plugin imports and dayjs.extend() calls in every file.
 *
 * The edge function (netlify/edge-functions/get-events.ts) maintains
 * its own setup because it uses Deno-style esm.sh imports.
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);
dayjs.extend(advancedFormat);
dayjs.extend(isSameOrAfter);

export default dayjs;
