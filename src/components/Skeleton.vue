<template>
  <div class="skeleton-paragraphs">
    <wa-skeleton effect="sheen"></wa-skeleton>
    <wa-skeleton effect="sheen"></wa-skeleton>
    <wa-skeleton effect="sheen"></wa-skeleton>
    <wa-skeleton effect="sheen"></wa-skeleton>
  </div>
</template>

<style>
.skeleton-paragraphs wa-skeleton {
  margin-bottom: 1rem;
}

.skeleton-paragraphs wa-skeleton:nth-child(2) {
  width: 95%;
}

.skeleton-paragraphs wa-skeleton:nth-child(4) {
  width: 90%;
}

.skeleton-paragraphs wa-skeleton:last-child {
  width: 50%;
}
</style>
