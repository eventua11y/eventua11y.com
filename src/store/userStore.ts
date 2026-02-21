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
  setUserInfo: (timezone: string, locale: string, geo: Geo) => void;
  setTimezone: (timezone: string, useLocal?: boolean) => void;
}

let savedTimezone: string | null = null;
let savedLocale: string | null = null;
let savedGeo: Geo | null = null;
let savedUseLocalTimezone: boolean | null = null;

// Load saved user information from localStorage if available
if (typeof window !== 'undefined' && window.localStorage) {
  savedTimezone = localStorage.getItem('userTimezone');
  savedLocale = localStorage.getItem('userLocale');
  savedGeo = localStorage.getItem('userGeo')
    ? JSON.parse(localStorage.getItem('userGeo') as string)
    : null;
  savedUseLocalTimezone = localStorage.getItem('useLocalTimezone') === 'true';
}

const userStore: UserStore = reactive({
  timezone: savedTimezone,
  locale: savedLocale,
  geo: savedGeo,
  useLocalTimezone: savedUseLocalTimezone || false,
  userInfoFetched: false,

  /**
   * Sets the user information and updates localStorage.
   * @param timezone - The user's timezone.
   * @param locale - The user's locale.
   * @param geo - The user's geographical information.
   */
  setUserInfo(timezone: string, locale: string, geo: Geo) {
    this.timezone = timezone;
    this.locale = locale;
    this.geo = geo;
    this.userInfoFetched = true;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('userTimezone', timezone);
      localStorage.setItem('userLocale', locale);
      localStorage.setItem('userGeo', JSON.stringify(geo));
    }
  },

  /**
   * Sets the user's timezone and updates localStorage.
   * @param timezone - The user's timezone.
   * @param useLocal - Whether to use the local timezone.
   */
  setTimezone(timezone: string, useLocal: boolean = false) {
    this.timezone = timezone;
    this.useLocalTimezone = useLocal;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('userTimezone', timezone);
      localStorage.setItem('useLocalTimezone', useLocal.toString());
    }
  },
});

export default userStore;
