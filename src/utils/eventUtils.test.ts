import { describe, it, expect, vi, afterEach } from 'vitest';
import { isCallForSpeakersOpen, getEventUrl } from './eventUtils';

describe('isCallForSpeakersOpen', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false when callForSpeakers is false', () => {
    expect(
      isCallForSpeakersOpen({
        callForSpeakers: false,
        callForSpeakersClosingDate: '2099-12-31T00:00:00Z',
      })
    ).toBe(false);
  });

  it('returns false when callForSpeakers is undefined', () => {
    expect(isCallForSpeakersOpen({})).toBe(false);
  });

  it('returns true when callForSpeakers is true and no closing date', () => {
    expect(
      isCallForSpeakersOpen({
        callForSpeakers: true,
      })
    ).toBe(true);
  });

  it('returns true when closing date is in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));

    expect(
      isCallForSpeakersOpen({
        callForSpeakers: true,
        callForSpeakersClosingDate: '2026-02-01T00:00:00Z',
      })
    ).toBe(true);
  });

  it('returns false when closing date is in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));

    expect(
      isCallForSpeakersOpen({
        callForSpeakers: true,
        callForSpeakersClosingDate: '2026-02-01T00:00:00Z',
      })
    ).toBe(false);
  });

  it('returns false when closing date is exactly now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T00:00:00Z'));

    expect(
      isCallForSpeakersOpen({
        callForSpeakers: true,
        callForSpeakersClosingDate: '2026-02-01T00:00:00Z',
      })
    ).toBe(false);
  });
});

describe('getEventUrl', () => {
  it('returns URL path when slug is present', () => {
    expect(getEventUrl({ slug: { current: 'my-event' } })).toBe(
      '/events/my-event'
    );
  });

  it('returns undefined when slug is undefined', () => {
    expect(getEventUrl({ slug: undefined })).toBeUndefined();
  });

  it('returns undefined when slug is null', () => {
    expect(getEventUrl({ slug: null } as any)).toBeUndefined();
  });

  it('returns undefined when slug.current is undefined', () => {
    expect(getEventUrl({ slug: {} } as any)).toBeUndefined();
  });

  it('handles slugs with special characters', () => {
    expect(getEventUrl({ slug: { current: 'a11y-conf-2026' } })).toBe(
      '/events/a11y-conf-2026'
    );
  });
});
