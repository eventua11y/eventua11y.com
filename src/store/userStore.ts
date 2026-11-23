import { reactive } from 'vue';

interface Geo {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
}

interface UserStore {
  timezone: string | null;
  locale: string | null;
  geo: Geo | null;
  useLocalTimezone: boolean;
  userInfoFetched: boolean;
  setUserInfo: (
    timezone: string,
    acceptLanguage: string | null,
    geo: Geo
  ) => void;
  setTimezone: (timezone: string, useLocal?: boolean) => void;
}

let savedTimezone: string | null = null;
let savedLocale: string | null = null;
let savedGeo: Geo | null = null;
let savedUseLocalTimezone: boolean | null = null;

function getPrimaryLocale(acceptLanguage: string | null): string | null {
  const firstLanguage = acceptLanguage?.split(',')[0]?.split(';')[0]?.trim();
  return firstLanguage?.split('-')[0].toLowerCase() || null;
}

function getStoredValue(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    console.warn(`Could not restore ${key} from local storage.`);
    return null;
  }
}

function saveStoredValue(key: string, value: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    console.warn(`Could not save ${key} to local storage.`);
  }
}

function getStoredGeo(): Geo | null {
  const saved = getStoredValue('userGeo');
  if (!saved) return null;
  try {
    const geo: unknown = JSON.parse(saved);
    if (geo && typeof geo === 'object' && !Array.isArray(geo)) {
      return geo as Geo;
    }
  } catch {
    // Invalid saved data is handled below.
  }
  console.warn('Saved user geo is invalid; ignoring it.');
  return null;
}

// Load saved user information from localStorage if available
if (typeof window !== 'undefined') {
  savedTimezone = getStoredValue('userTimezone');
  const storedLocale = getStoredValue('userLocale');
  savedLocale = getPrimaryLocale(storedLocale);
  if (storedLocale && storedLocale !== savedLocale) {
    saveStoredValue('userLocale', savedLocale);
  }
  savedGeo = getStoredGeo();
  savedUseLocalTimezone = getStoredValue('useLocalTimezone') === 'true';
}

const userStore = reactive<UserStore>({
  timezone: savedTimezone,
  locale: savedLocale,
  geo: savedGeo,
  useLocalTimezone: savedUseLocalTimezone || false,
  userInfoFetched: false,

  /**
   * Sets the user information and updates localStorage.
   * @param timezone - The user's timezone.
   * @param acceptLanguage - The user's Accept-Language header.
   * @param geo - The user's geographical information.
   */
  setUserInfo(timezone: string, acceptLanguage: string | null, geo: Geo) {
    this.timezone = timezone;
    this.locale = getPrimaryLocale(acceptLanguage);
    this.geo = geo;
    this.userInfoFetched = true;
    saveStoredValue('userTimezone', timezone);
    saveStoredValue('userLocale', this.locale);
    saveStoredValue('userGeo', JSON.stringify(geo));
  },

  /**
   * Sets the user's timezone and updates localStorage.
   * @param timezone - The user's timezone.
   * @param useLocal - Whether to use the local timezone.
   */
  setTimezone(timezone: string, useLocal: boolean = false) {
    this.timezone = timezone;
    this.useLocalTimezone = useLocal;
    saveStoredValue('userTimezone', timezone);
    saveStoredValue('useLocalTimezone', useLocal.toString());
  },
});

export default userStore;
