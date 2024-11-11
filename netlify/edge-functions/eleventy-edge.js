import {
  EleventyEdge,
  precompiledAppData,
} from './_generated/eleventy-edge-app.js';
import getEvents from './sanity.js';
import dayjs from './day.js';
import meta from '../../src/_data/meta.mjs';
import timezoneNames from '../../src/_data/timezoneNames.mjs';

// Pull events from Sanity
const events = await getEvents();

export default async (request, context) => {
  try {
    let edge = new EleventyEdge('edge', {
      request,
      context,
      precompiled: precompiledAppData,

      // default is [], add more keys to opt-in e.g. ["appearance", "username"]
      cookies: [],
    });

    // Set the locale based on the request headers, defaulting to en-gb
    const LOCALE = request.headers['accept-language'] || 'en-gb';
    console.log('LOCALE is ' + LOCALE);

    // Set the timezone based on Netlify's geo headers
    const { timezone } = context.geo;
    console.log('timezone is ' + timezone);

    // Set the current date
    const now = new dayjs();
    console.log('now is ' + now);

    edge.config((eleventyConfig) => {
      // Make Eleventy global data available on the edge
      eleventyConfig.addGlobalData('events', events); // Events from Sanity
      eleventyConfig.addGlobalData('meta', meta); // Meta data

      /* Converts the given date string to ISO8601 format. */
      eleventyConfig.addFilter('isoDate', (date) => dayjs(date).toISOString());

      /* Formats the given date string based on the user's locale. */
      eleventyConfig.addFilter('localizeDate', (date, format) =>
        dayjs(date).locale(LOCALE).tz(timezone).format(format)
      );

      // Return the time since the given date
      eleventyConfig.addFilter('timeSince', function (date) {
        return dayjs(date).locale(LOCALE).tz(timezone).fromNow();
      });

      // Return theme events taking place today
      eleventyConfig.addFilter('todaysThemes', function (events) {
        return events.filter((event) => {
          // Get the start date of the event
          const eventDateStart = new dayjs(event.dateStart);
          // If there's no end date, assume it's a one-day event
          const eventDateEnd = event.dateEnd
            ? dayjs(event.dateEnd)
            : eventDateStart;
          // Work out if the event is ongoing
          const isOngoing =
            eventDateStart.isSameOrBefore(now, 'day') &&
            eventDateEnd.isSameOrAfter(now, 'day');
          // Return the event if it's ongoing and a theme
          return isOngoing && event.type == 'theme';
        });
      });

      // Return non-theme events taking place today
      eleventyConfig.addFilter('todaysEvents', function (events) {
        return events.filter((event) => {
          // Get the start date of the event
          const eventDateStart = new dayjs(event.dateStart);
          // If there's no end date, assume it's a one-day event
          const eventDateEnd = event.dateEnd
            ? dayjs(event.dateEnd)
            : eventDateStart;
          // Work out if the event is ongoing
          const isOngoing =
            eventDateStart.isSameOrBefore(now, 'day') &&
            eventDateEnd.isSameOrAfter(now, 'day');
          // Work out if the event has a parent event
          const hasParent = event.parent ? true : false;
          // Return the event if it's ongoing, not a theme, and not part of a larger event
          return isOngoing && !hasParent && event.type != 'theme';
        });
      });

      /* Returns a list of upcoming events in chronological order */
      eleventyConfig.addFilter('upcomingEvents', function (events) {
        return events.filter((event) => {
          // Work out if the event has a parent event
          const hasParent = event.parent ? true : false;
          // Return the event if its start date is after today and is not part of a larger event
          return new dayjs(event.dateStart).isAfter(now, 'day') && !hasParent;
        });
      });

      /* Returns a list of past events */
      eleventyConfig.addFilter('pastEvents', function (events) {
        return events.filter((event) => {
          // Work out if the event has a parent event
          const hasParent = event.parent ? true : false;
          // If the event doesn't have an end date, assume it's a single day event that ends on the same day it starts
          const endDate = event.dateEnd ? event.dateEnd : event.dateStart;
          // Return the event if its end date is before today and is not part of a larger event
          return new dayjs(endDate).isBefore(now, 'day') && !hasParent;
        });
      });

      /* Filter to list the events grouped by month. Each month should have a name property containing the name of the month
      and then an array of events for that month */
      eleventyConfig.addFilter('groupByMonth', function (events) {
        // Create an array of months
        const months = [];
        // Loop through each event
        events.forEach((event) => {
          // Get the month and year of the event
          const month = new dayjs(event.dateStart).format('MMMM');
          const year = new dayjs(event.dateStart).format('YYYY');
          // Check if the month and year already exist in the array
          const monthIndex = months.findIndex(
            (m) => m.month === month && m.year === year
          );
          // If the month and year don't exist, add them to the array
          if (monthIndex === -1) {
            months.push({
              month: month,
              year: year,
              events: [event],
            });
          } else {
            // If the month and year do exist, add the event to the array
            months[monthIndex].events.push(event);
          }
        });
        console.log(months);
        // Return the array of months
        return months;
      });

      // Return the full name of the given timezone abbreviation
      eleventyConfig.addFilter('expandTimezone', function (abbreviation) {
        return timezoneNames[abbreviation] || abbreviation;
      });

      // Return today's date as an iso string
      eleventyConfig.addShortcode('todayISO', () => now.toISOString());

      // Return today's date as a locale string
      eleventyConfig.addShortcode('today', function () {
        return dayjs(now).locale(LOCALE).tz(timezone).format('LL z');
      });

      // Return the user's timezone
      eleventyConfig.addShortcode('timezone', function (context) {
        return timezone;
      });

      // Return the user's country
      eleventyConfig.addShortcode('country', function (context) {
        return context.geo.country;
      });
      // Returns debugging details for each event
      eleventyConfig.addShortcode('debug', function (event) {
        const isOngoing =
          dayjs(event.dateStart).isSameOrBefore(now, 'day') &&
          dayjs(event.dateEnd).isSameOrAfter(now, 'day');

        const debugOutput = `
        <div class="debugging">
          <details>
            <summary class="debug-toggle">Debug information</summary>
            <div class="debug">
              <p><strong>${event.title}</strong></p>
              <p>Your timezone is <strong>${timezone}</strong></p>
              <p>Your locale is <strong>${LOCALE}</strong></p>
              <p>Your local datetime is <strong>${dayjs(now).locale(LOCALE).tz(timezone).format()}</strong></p>
              <p>Start date in Sanity: ${event.dateStart}</p>
              <p>Start date in your timezone: ${dayjs(event.dateStart).locale(LOCALE).tz(timezone).format()}</p>
              <p>End date in Sanity: ${event.dateEnd}</p>
              <p>End date in your timezone: ${event.dateEnd ? dayjs(event.dateEnd).locale(LOCALE).tz(timezone).format() : null}</p>
              <!-- if the event has ended, show a message. Otherwise, show nothing -->
              ${dayjs(event.dateEnd).isBefore(now, 'day') ? `<p><strong>This event has ended</strong></p>` : null}
              ${isOngoing ? `<p><strong>This event is ongoing</strong></p>` : null}
              ${dayjs(event.dateStart).isAfter(now, 'day') ? `<p><strong>This event is upcoming</strong></p>` : null}
            </div>
          </details>
          <details>
            <summary class="debug-toggle">Raw event data</summary>
            <div class="debug">
              <pre>${JSON.stringify(event, null, 2)}</pre>
            </div>
          </details>
        </div>
        `;

        return debugOutput;
      });
    });

    return await edge.handleResponse();
  } catch (e) {
    console.log('ERROR', { e });
    return context.next(e);
  }
};
