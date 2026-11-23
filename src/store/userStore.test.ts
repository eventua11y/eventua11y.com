import { describe, expect, it } from 'vitest';
import userStore from './userStore';
import { formatEventDate } from '../utils/dateUtils';

describe('userStore.setUserInfo', () => {
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
