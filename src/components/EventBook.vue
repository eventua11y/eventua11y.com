<template>
  <div class="book">
    <span class="text-small text-muted"
      >Accessibility Book Club is reading</span
    >
    <a class="book__title" :href="book.link" @click="captureBookLinkClick">
      {{ book.title }}
    </a>
  </div>
</template>

<script setup lang="ts">
import type { Book } from '../types/event';
import posthog from 'posthog-js';

defineProps<{
  book: Book;
}>();

function captureBookLinkClick() {
  if (
    import.meta.env.PUBLIC_POSTHOG_KEY &&
    import.meta.env.PUBLIC_POSTHOG_HOST
  ) {
    posthog.capture('book_link_clicked');
  }
}
</script>

<style>
.book {
  display: flex;
  flex-direction: column;
  padding: 0 var(--p-space-xs-m);
}
</style>
