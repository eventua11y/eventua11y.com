import { reactive } from 'vue';

const userStore = reactive({
  timezone: null,
  locale: null,
  geo: null,
  userInfoFetched: false,
  setUserInfo(timezone, locale, geo) {
    this.timezone = timezone;
    this.locale = locale;
    this.geo = geo;
    this.userInfoFetched = true;
  },
});

export default userStore;