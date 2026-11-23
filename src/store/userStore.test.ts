import { afterEach, describe, expect, it, vi } from 'vitest';
import userStore from './userStore';
import { formatEventDate } from '../utils/dateUtils';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('userStore.setUserInfo', () => {
  it('preserves an event-local selection when user information arrives later', () => {
    userStore.setTimezone('event', false);
    userStore.setUserInfo('Asia/Tokyo', 'en', { timezone: 'Asia/Tokyo' });

    expect(userStore.timezone).toBe('event');
    expect(userStore.useLocalTimezone).toBe(false);
    expect(userStore.geo?.timezone).toBe('Asia/Tokyo');
  });

  it('updates the detected timezone when local time is selected', () => {
    userStore.setTimezone('Europe/London', true);
    userStore.setUserInfo('Asia/Tokyo', 'en', { timezone: 'Asia/Tokyo' });

    expect(userStore.timezone).toBe('Asia/Tokyo');
    expect(userStore.useLocalTimezone).toBe(true);
  });

  it.each([
    ['fr,en;q=0.5', 'fr', 'lundi'],
    ['es,en;q=0.5', 'es', 'lunes'],
    ['de-DE,de;q=0.9,en;q=0.8', 'de', 'Montag'],
    ['fr-FR,fr;q=0.9', 'fr', 'lundi'],
  ])(
    'uses the primary locale from %s to format dates',
    (acceptLanguage, expectedLocale, expectedWeekday) => {
      userStore.setUserInfo('Europe/Paris', acceptLanguage, {});

      expect(userStore.locale).toBe(expectedLocale);
      expect(
        formatEventDate('2026-03-09T12:00:00Z', 'dddd', {
          locale: userStore.locale || 'en',
        })
      ).toBe(expectedWeekday);
    }
  );

  it('clears the locale when no language preference is provided', () => {
    userStore.setUserInfo('Europe/Paris', null, {});

    expect(userStore.locale).toBeNull();
  });
});

describe('userStore restored locale', () => {
  it('normalizes a saved Accept-Language header on restore', async () => {
    const storedValues: Record<string, string> = {
      userLocale: 'fr,en;q=0.5',
    };
    const storage = {
      getItem: vi.fn((key: string) => storedValues[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storedValues[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete storedValues[key];
      }),
    };
    vi.stubGlobal('window', globalThis);
    vi.stubGlobal('localStorage', storage);
    vi.resetModules();

    const { default: restoredUserStore } = await import('./userStore');

    expect(restoredUserStore.locale).toBe('fr');
    expect(storedValues.userLocale).toBe('fr');
    expect(storage.setItem).toHaveBeenCalledWith('userLocale', 'fr');
  });
});
