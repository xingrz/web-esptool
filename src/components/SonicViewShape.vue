<template>
  <path
    :style="{
      '--d0': `path('${d0}')`,
      '--d1': `path('${d1}')`,
      '--period': `${shakedPeriod}ms`,
      transform: `translateY(${translateY}px)`,
    }"
    :fill="color"
  />
</template>

<script lang="ts">
import { Vue, Options } from "vue-class-component";

@Options({
  props: {
    width: { type: Number, default: window.innerWidth },
    height: { type: Number, default: window.innerHeight },
    wave: { type: Number, default: 1 },
    peak: { type: Number, default: 0.5 },
    level: { type: Number, default: 0.5 },
    color: { type: String, default: "#000000" },
    period: { type: Number, default: 500 },
  },
})
export default class SonicViewShape extends Vue {
  width!: number;
  height!: number;
  wave!: number;
  peak!: number;
  level!: number;
  color!: string;
  period!: number;

  get d0(): string {
    return this.makePath(this.peak * 1);
  }

  get d1(): string {
    return this.makePath(this.peak * -1);
  }

  get shakedPeriod(): number {
    return Math.round((this.period || 300) + 500 * Math.random());
  }

  get translateY(): number {
    return this.height * (1 - this.level);
  }

  private makePath(peak: number): string {
    const { wave, width, height } = this;

    const middle = 0;
    const split = width / wave;

    const path = [`M 0 ${middle}`];

    for (let i = 0; i < wave; i++) {
      const l = split * 0.25 * peak * (i % 2 ? 1 : -1);
      const c = `${split * (i + 0.5)} ${middle + l}`;
      const e = `${split * (i + 1.0)} ${middle}`;
      path.push(`C ${c}, ${c}, ${e}`);
    }

    path.push(`L ${width} ${height} L 0 ${height} Z`);

    return path.join(" ");
  }
}
</script>

<style lang="scss" scoped>
path {
  d: var(--d0);
  @keyframes sonic {
    50% {
      d: var(--d1);
    }
  }

  animation: sonic var(--period) ease-in-out infinite both;
  transition: transform 800ms ease-in-out;
}
</style>
