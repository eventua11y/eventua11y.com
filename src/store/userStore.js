import { reactive } from 'vue';

let savedTimezone = null;
let savedLocale = null;
let savedGeo = null;

if (typeof window !== 'undefined' && window.localStorage) {
  savedTimezone = localStorage.getItem('userTimezone') || null;
  savedLocale = localStorage.getItem('userLocale') || null;
  savedGeo = JSON.parse(localStorage.getItem('userGeo')) || null;
} else {
  savedTimezone = null;
  savedLocale = null;
  savedGeo = null;
}

const userStore = reactive({
  timezone: savedTimezone,
  locale: savedLocale,
  geo: savedGeo,
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
});

export default userStore;