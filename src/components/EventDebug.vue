<template>
  <details class="debug" style="overflow: scroll">
    <summary>{{ event.title }} ({{ event._id }})</summary>
    <pre>{{ formattedEvent }}</pre>
  </details>
</template>

<script setup>
import { defineProps, computed } from 'vue';

const props = defineProps({
  event: {
    type: Object,
    required: true,
  },
});

// Computed property to format the event object as a JSON string
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
