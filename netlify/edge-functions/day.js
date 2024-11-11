import dayjs from 'https://esm.sh/dayjs';
import customParseFormat from 'https://esm.sh/dayjs/plugin/customParseFormat';
import isSameOrBefore from 'https://esm.sh/dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'https://esm.sh/dayjs/plugin/isSameOrAfter';
import localeData from 'https://esm.sh/dayjs/plugin/localeData';
import LocalizedFormat from 'https://esm.sh/dayjs/plugin/localizedFormat';
import advancedFormat from 'https://esm.sh/dayjs/plugin/advancedFormat';
import utc from 'https://esm.sh/dayjs/plugin/utc';
import timezone from 'https://esm.sh/dayjs/plugin/timezone';
import relativeTime from 'https://esm.sh/dayjs/plugin/relativeTime';

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(localeData);
dayjs.extend(LocalizedFormat);
dayjs.extend(advancedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

export default dayjs;
