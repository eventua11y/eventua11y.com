import { reactive } from 'vue';

const uiStore = reactive({
  isFilterDrawerOpen: false,
  openFilterDrawer() {
    this.isFilterDrawerOpen = true;
  },
  closeFilterDrawer() {
    this.isFilterDrawerOpen = false;
  },
  toggleFilterDrawer() {
    this.isFilterDrawerOpen = !this.isFilterDrawerOpen;
  },
});

export default uiStore;