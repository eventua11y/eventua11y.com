<template>
  <div class="skeleton-paragraphs" aria-hidden="true">
    <div class="skeleton-line"></div>
    <div class="skeleton-line"></div>
    <div class="skeleton-line"></div>
    <div class="skeleton-line"></div>
  </div>
</template>

<style>
.skeleton-paragraphs .skeleton-line {
  background: var(--s-color-border, #e0e0e0);
  border-radius: 4px;
  height: 1rem;
  margin-bottom: 1rem;
  animation: skeleton-sheen 1.5s ease-in-out infinite;
}

.skeleton-paragraphs .skeleton-line:nth-child(2) {
  width: 95%;
}

.skeleton-paragraphs .skeleton-line:nth-child(4) {
  width: 90%;
}

.skeleton-paragraphs .skeleton-line:last-child {
  width: 50%;
}

@keyframes skeleton-sheen {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
}
</style>
