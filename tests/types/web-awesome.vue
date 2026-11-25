<script setup lang="ts">
import { useTemplateRef } from 'vue';

const toggle = useTemplateRef('toggle');
const checked: boolean | undefined = toggle.value?.checked;

function onChange(event: Event) {
  event.preventDefault();
}

function onMouseClick(event: MouseEvent) {
  event.preventDefault();
}
</script>

<template>
  <wa-button
    variant="brand"
    :class="{ active: checked }"
    @click="onMouseClick"
  />
  <wa-switch ref="toggle" :checked="true" @change="onChange" />
  <wa-drawer @wa-hide="onChange" />

  <!-- @vue-expect-error -->
  <wa-button variant="not-a-variant" />
  <!-- @vue-expect-error -->
  <wa-switch :checked="'true'" />
  <!-- @vue-expect-error -->
  <wa-switch @change="onMouseClick" />
  <!-- @vue-expect-error -->
  <wa-drawer @wa-hide="onMouseClick" />
</template>
