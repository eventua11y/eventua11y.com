import { describe, expect, it } from 'vitest';
import { classifyEvents } from '../../netlify/edge-functions/lib/classifyEvents';

describe('classifyEvents', () => {
  it('puts a timed event without a timezone on the day shown on the device', () => {
    const event = { dateStart: '2030-12-31T16:00:00Z' };
    const now = new Date('2030-12-31T15:00:00Z');

    expect(classifyEvents([event], 'Asia/Tokyo', now).today).toEqual([event]);
  });

  it('keeps an open deadline visible when the viewer is already a day ahead', () => {
    const event = {
      dateStart: '2030-12-31T16:00:00Z',
      timezone: 'America/Los_Angeles',
      type: 'deadline',
    };
    const now = new Date('2030-12-31T15:00:00Z');

    expect(classifyEvents([event], 'Asia/Tokyo', now).today).toEqual([event]);
    expect(
      classifyEvents([event], 'Asia/Tokyo', new Date(event.dateStart))
    ).toEqual({
      today: [],
      future: [],
      past: [],
    });
  });

  it.each(['Europe/London', 'UTC'])(
    'keeps an ended local event in the past for a viewer in %s',
    (viewerTimezone) => {
      const event = {
        dateStart: '2030-06-25T20:00:00Z',
        dateEnd: '2030-06-25T23:59:00Z',
        timezone: 'America/Los_Angeles',
      };
      const now = new Date('2030-06-26T00:00:00Z');

      expect(classifyEvents([event], viewerTimezone, now).past).toEqual([
        event,
      ]);
    }
  );

  it('keeps the stored dates of an international multi-day event', () => {
    const event = {
      dateStart: '2030-12-30T00:00:00Z',
      dateEnd: '2030-12-31T23:59:00Z',
      day: true,
    };

    expect(
      classifyEvents([event], 'Asia/Tokyo', new Date('2030-12-31T12:00:00Z'))
        .today
    ).toEqual([event]);
    expect(
      classifyEvents([event], 'Asia/Tokyo', new Date('2030-12-31T15:00:00Z'))
        .past
    ).toEqual([event]);
  });

  it.each([
    {
      dateStart: '2030-07-01T00:00:00Z',
      timezone: 'America/Los_Angeles',
      day: true,
    },
    {
      dateStart: '2030-07-01T00:00:00+11:00',
      timezone: 'Australia/Sydney',
      day: true,
    },
    {
      dateStart: '2030-07-01T00:00:00Z',
      timezone: 'America/Los_Angeles',
      type: 'theme',
    },
  ])('keeps the written date at the month boundary for $timezone', (event) => {
    expect(
      classifyEvents([event], 'UTC', new Date('2030-07-01T12:00:00Z'))
    ).toEqual({
      today: [event],
      future: [],
      past: [],
    });
  });

  it('includes the last day of February at the leap-day cutoff', () => {
    const event = { dateStart: '2027-02-28T12:00:00Z' };
    const now = new Date('2028-02-29T00:00:00Z');

    expect(classifyEvents([event], 'UTC', now).past).toEqual([event]);
  });

  it('excludes children, unscheduled events and events older than twelve calendar months', () => {
    const events = [
      { dateStart: '2030-01-01T12:00:00Z', parent: { _ref: 'parent' } },
      { dateStart: '' },
      { dateStart: '2028-02-27T12:00:00Z' },
    ];

    expect(
      classifyEvents(events, 'UTC', new Date('2029-02-28T00:00:00Z'))
    ).toEqual({
      today: [],
      future: [],
      past: [],
    });
  });
});
