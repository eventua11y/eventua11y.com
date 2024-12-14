import { reactive } from 'vue';

let savedTimezone = null;
let savedLocale = null;
let savedGeo = null;
let savedUseLocalTimezone = null;

if (typeof window !== 'undefined' && window.localStorage) {
  savedTimezone = localStorage.getItem('userTimezone') || null;
  savedLocale = localStorage.getItem('userLocale') || null;
  savedGeo = JSON.parse(localStorage.getItem('userGeo')) || null;
  savedUseLocalTimezone = localStorage.getItem('useLocalTimezone') === 'true';
}

const userStore = reactive({
  timezone: savedTimezone,
  locale: savedLocale,
  geo: savedGeo,
  useLocalTimezone: savedUseLocalTimezone,
  userInfoFetched: false,
  
  setUserInfo(timezone, locale, geo) {
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

  setTimezone(timezone, useLocal = false) {
    this.timezone = timezone;
    this.useLocalTimezone = useLocal;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('userTimezone', timezone);
      localStorage.setItem('useLocalTimezone', useLocal);
    }
  }
});

export default userStore;