<script setup>
import { ref } from 'vue';
import {
  downloadEventAsICS,
  canExportToCalendar,
} from '../scripts/calendarUtils';
import userStore from '../store/userStore';

/**
 * AddToCalendar component
 * Provides a button to download an event as an ICS file
 *
 * Props:
 * @prop {Object} event - Event object containing title, dates, and other metadata
 */
const props = defineProps({
  event: {
    type: Object,
    required: true,
  },
});

const isDownloading = ref(false);
const showError = ref(false);

/**
 * Handles the download of the event as an ICS file
 * Shows loading state during download and error state if download fails
 */
async function handleDownload() {
  if (isDownloading.value) return;

  isDownloading.value = true;
  showError.value = false;

  try {
    const success = await downloadEventAsICS(props.event, userStore.timezone);
    if (!success) {
      showError.value = true;
    }
  } catch (error) {
    console.error('Failed to download calendar event:', error);
    showError.value = true;
  } finally {
    isDownloading.value = false;

    // Auto-hide error after 5 seconds
    if (showError.value) {
      setTimeout(() => {
        showError.value = false;
      }, 5000);
    }
  }
}

/**
 * Checks if the current event can be exported to calendar
 */
const canExport = canExportToCalendar(props.event);
</script>

<template>
  <div v-if="canExport" class="add-to-calendar">
    <sl-button
      @click="handleDownload"
      :disabled="isDownloading"
      size="small"
      variant="default"
      outline
      :aria-label="`Add ${event.title} to calendar`"
    >
      <sl-icon slot="prefix" name="calendar-plus"></sl-icon>
      <span v-if="isDownloading">Adding...</span>
      <span v-else>Add to calendar</span>
    </sl-button>

    <sl-alert
      v-if="showError"
      variant="danger"
      duration="5000"
      closable
      open
      class="add-to-calendar__error"
    >
      <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
      <strong>Unable to add to calendar</strong><br />
      Please try again or contact support if the problem persists.
    </sl-alert>
  </div>
</template>

<style scoped>
.add-to-calendar {
  margin-top: var(--p-space-xs);
}

.add-to-calendar__error {
  margin-top: var(--p-space-xs);
}
</style>
