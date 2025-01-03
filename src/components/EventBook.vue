<template>
  <div class="book">
    <span class="text-small text-muted"
      >Accessibility Book Club is reading</span
    >
    <a class="book__title" :href="book.link">{{ book.title }}</a>
  </div>
</template>

<script setup lang="ts">
interface Book {
  title: string;
  link?: string;
}

defineProps<{
  book: Book;
}>();
</script>

<style>
.book {
  display: flex;
  flex-direction: column;
  padding: 0 var(--p-space-xs-m);
}
</style>
