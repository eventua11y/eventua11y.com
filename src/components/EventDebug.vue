<template>
  <details class="debug" style="overflow: scroll">
    <summary>{{ event.title }} ({{ event._id }})</summary>
    <pre>{{ formattedEvent }}</pre>
  </details>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Event } from '../types/event';

const props = defineProps<{
  event: Event;
}>();

const formattedEvent = computed(() => JSON.stringify(props.event, null, 2));
</script>

<style scoped>
summary {
  color: var(--s-color-fg-muted);
}

summary:hover {
  text-decoration: underline;
}

details {
  border-radius: 0.5rem;
  border-top: none;
  background-color: var(--s-color-bg-muted);
  padding: var(--p-space-2xs);
}

pre {
  font-size: var(--p-step--2);
}
</style>
