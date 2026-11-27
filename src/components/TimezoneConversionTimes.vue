<script setup lang="ts">
defineProps<{
  parts: { date: string; datetime: string; zone: string }[];
  labelId: string;
  timeId?: string;
}>();
</script>

<template>
  <div class="timezone-popover__row">
    <div>
      <strong :id="labelId">Your local time</strong>
      <div :id="timeId">
        <div v-for="(part, index) in parts" :key="index">
          <template v-if="index"
            ><span aria-hidden="true">–&nbsp;</span
            ><span class="sr-only">until </span></template
          ><time :datetime="part.datetime">{{ part.date }}</time
          >{{ ' ' }}
          <span v-if="part.zone" class="timezone-popover__zone text-muted">{{
            part.zone
          }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timezone-popover__zone {
  display: block;
  font-size: var(--p-step--2);
}
</style>
