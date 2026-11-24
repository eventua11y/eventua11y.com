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
    const setItem = vi.fn();
    vi.stubGlobal('window', { localStorage: { setItem } });
    userStore.setUserInfo('Asia/Tokyo', 'en', { timezone: 'Asia/Tokyo' });

    expect(setItem).toHaveBeenCalledWith('userTimezone', 'event');

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

  it.each([null, '*', 'en_US'])(
    'clears the locale when %s does not specify a usable language',
    (acceptLanguage) => {
      userStore.setUserInfo('Europe/Paris', acceptLanguage, {});
      expect(userStore.locale).toBeNull();
    }
  );
});

describe('userStore restored locale', () => {
  it.each([
    ['fr,en;q=0.5', 'fr'],
    ['*', null],
  ] as const)(
    'normalizes a saved locale %s on restore',
    async (stored, expected) => {
      const storedValues: Record<string, string> = { userLocale: stored };
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

      expect(restoredUserStore.locale).toBe(expected);
      expect(storedValues.userLocale).toBe(expected ?? undefined);
    }
  );
});

describe('userStore storage failures', () => {
  it('ignores malformed geo without losing other saved preferences', async () => {
    const storedValues: Record<string, string> = {
      userTimezone: 'Europe/Paris',
      userLocale: 'fr,en;q=0.5',
      userGeo: '{',
      useLocalTimezone: 'true',
    };
    const storage = {
      getItem: vi.fn((key: string) => storedValues[key] ?? null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('window', { localStorage: storage });
    vi.resetModules();

    const { default: store } = await import('./userStore');
    expect(store.geo).toBeNull();
    expect(store.timezone).toBe('Europe/Paris');
    expect(store.locale).toBe('fr');
    expect(store.useLocalTimezone).toBe(true);
    expect(console.warn).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('restores valid geo and preserves preferences if locale normalization fails', async () => {
    const storedValues: Record<string, string> = {
      userTimezone: 'Europe/Paris',
      userLocale: 'fr-FR,fr;q=0.9',
      userGeo: JSON.stringify({ city: 'Paris' }),
      useLocalTimezone: 'true',
    };
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('window', {
      localStorage: {
        getItem: vi.fn((key: string) => storedValues[key] ?? null),
        setItem: vi.fn(() => {
          throw new Error('Storage blocked');
        }),
      },
    });
    vi.resetModules();

    const { default: store } = await import('./userStore');
    expect(store.geo).toEqual({ city: 'Paris' });
    expect(store.locale).toBe('fr');
    expect(store.useLocalTimezone).toBe(true);
    expect(console.warn).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it.each(['getter', 'read', 'write'])(
    'keeps user preferences available in memory when storage %s fails',
    async (failure) => {
      const storage = {
        getItem: vi.fn(() => {
          if (failure === 'read') throw new Error('Storage blocked');
          return null;
        }),
        setItem: vi.fn(() => {
          throw new Error('Storage blocked');
        }),
        removeItem: vi.fn(() => {
          throw new Error('Storage blocked');
        }),
      };
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      if (failure === 'getter') {
        vi.stubGlobal('window', {
          get localStorage() {
            throw new Error('Storage blocked');
          },
        });
      } else {
        vi.stubGlobal('window', { localStorage: storage });
      }
      vi.resetModules();

      const { default: store } = await import('./userStore');
      store.setUserInfo('Europe/Paris', 'fr-FR', { city: 'Paris' });
      expect(store.geo).toEqual({ city: 'Paris' });
      expect(store.locale).toBe('fr');
      expect(store.userInfoFetched).toBe(true);
      store.setUserInfo('Europe/Paris', null, { city: 'Paris' });
      store.setTimezone('Europe/London', true);
      expect(store.locale).toBeNull();
      expect(store.timezone).toBe('Europe/London');
      expect(store.useLocalTimezone).toBe(true);
      expect(console.warn).toHaveBeenCalled();
      vi.restoreAllMocks();
    }
  );
});
