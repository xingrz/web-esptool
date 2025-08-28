<template>
  <path :class="$style.path" :style="style" :fill="color" />
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  width?: number;
  height?: number;
  wave?: number;
  peak?: number;
  level?: number;
  color?: string;
  period?: number;
}>(), {
  width: window.innerWidth,
  height: window.innerHeight,
  wave: 1,
  peak: 0.5,
  level: 0.5,
  color: '#000000',
  period: 300,
});

const d0 = computed(() => makePath(props.peak * 1));
const d1 = computed(() => makePath(props.peak * -1));

const shakedPeriod = computed(() => Math.round((props.period || 300) + 500 * Math.random()));

const translateY = computed(() => props.height * (1 - props.level));

const style = computed(() => [
  `--d0: path('${d0.value}')`,
  `--d1: path('${d1.value}')`,
  `--period: ${shakedPeriod.value}ms`,
  `transform: translateY(${translateY.value}px)`,
].join(';'));

function makePath(peak: number): string {
  const { wave, width, height } = props;

  const middle = 0;
  const split = width / wave;
  const offset = split * Math.random();

  const path = [`M ${-offset} ${middle}`];

  for (let i = 0; i < wave + 1; i++) {
    const l = split * 0.25 * peak * (i % 2 ? 1 : -1);
    const c = `${split * (i + 0.5) - offset} ${middle + l}`;
    const e = `${split * (i + 1.0) - offset} ${middle}`;
    path.push(`C ${c}, ${c}, ${e}`);
  }

  path.push(`L ${width} ${height * 2} L 0 ${height * 2} Z`);

  return path.join(' ');
}
</script>

<style lang="scss" module>
.path {
  d: var(--d0);

  @keyframes sonic {
    50% {
      d: var(--d1);
    }
  }

  & {
    animation: sonic var(--period) ease-in-out infinite both;
    transition: transform 700ms ease-in-out;
  }
}
</style>
