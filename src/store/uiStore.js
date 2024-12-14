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
  // Add reset method
  reset() {
    this.isFilterDrawerOpen = false;
  },
});

// Reset state when module is loaded
if (typeof window !== 'undefined') {
  uiStore.reset();
}

export default uiStore;
