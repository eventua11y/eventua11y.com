import { afterEach, expect, test, vi } from 'vitest';
import { capture } from '../lib/analytics';

vi.mock('../lib/analytics', () => ({ capture: vi.fn() }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.resetModules();
});

test.each([
  ['event_registration_clicked', 'event_registration_clicked'],
  ['event_call_for_speakers_clicked', 'event_call_for_speakers_clicked'],
  [null, 'event_website_clicked'],
])('captures an outbound event link (%s)', async (analyticsEvent, expected) => {
  class ClickTarget extends EventTarget {
    closest() {
      return {
        getAttribute(name: string) {
          if (name === 'data-analytics-event-type') return 'conference';
          if (name === 'data-analytics-event') return analyticsEvent;
          return null;
        },
      };
    }
  }

  const target = new ClickTarget();
  vi.stubGlobal('document', target);
  vi.stubGlobal('Element', ClickTarget);
  await import('./main');
  target.dispatchEvent(new Event('click'));

  expect(capture).toHaveBeenCalledExactlyOnceWith(
    expected,
    { event_type: 'conference' },
    { transport: 'sendBeacon', send_instantly: true }
  );
});
