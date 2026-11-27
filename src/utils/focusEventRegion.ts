import { nextTick } from 'vue';

export function focusEventRegionIfNeeded(
  controls: (HTMLElement | null)[],
  contentRegion: string
) {
  if (!controls.some((control) => control?.contains(document.activeElement))) {
    return;
  }

  // Synchronous watchers run before all affected components queue their updates.
  void nextTick()
    .then(() => nextTick())
    .then(() => {
      if (
        document.activeElement !== document.body &&
        !controls.some((control) => control?.contains(document.activeElement))
      ) {
        return;
      }
      const region = document.querySelector<HTMLElement>(contentRegion);
      if (!region) {
        console.error(`Event list region not found: ${contentRegion}`);
        return;
      }
      region.tabIndex = -1;
      region.focus({ preventScroll: true });
    });
}
