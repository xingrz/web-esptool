<template>
  <svg :class="$style.sonic">
    <sonic-view-shape :width="width" :height="height" :peak="props.peak" :wave="Math.round((width / 640) * 2)"
      :level="props.level" :period="props.period" color="#50E3C2FF" />

    <sonic-view-shape :width="width" :height="height" :peak="props.peak" :wave="Math.round((width / 640) * 3)"
      :level="props.level" :period="props.period" color="#46DBBAB2" />

    <sonic-view-shape :width="width" :height="height" :peak="props.peak" :wave="Math.round((width / 640) * 5)"
      :level="props.level" :period="props.period" color="#47CCC2CC" />
  </svg>
</template>

<script lang="ts" setup>
import { defineProps, ref } from 'vue';
import useOnWindowResize from '@/composables/useOnWindowResize';

import SonicViewShape from './SonicViewShape.vue';

const props = defineProps<{
  peak: number;
  level: number;
  period: number;
}>();

const width = ref(window.innerWidth);
const height = ref(window.innerHeight);

useOnWindowResize(() => {
  width.value = window.innerWidth;
  height.value = window.innerHeight;
});
</script>

<style lang="scss" module>
.sonic {
  width: 100vw;
  height: 100vh;
  position: fixed;
  z-index: -1;
}
</style>
