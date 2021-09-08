<template>
  <sonic-view-shape
    :width="width"
    :height="height"
    :wave="wave"
    :peak="animatedPeak"
    :level="level"
    :color="color"
  />
</template>

<script lang="ts">
import { Vue, Options } from "vue-class-component";
import interpolate from "interpolate-all";

import SonicViewShape from "./SonicViewShape.vue";

const INTERPOLATOR = "easeInOutQuad";

@Options({
  props: {
    width: Number,
    height: Number,
    wave: Number,
    peak: Number,
    level: Number,
    color: String,
    period: Number,
  },
  components: {
    SonicViewShape,
  },
})
export default class SonicViewLayer extends Vue {
  width!: number;
  height!: number;
  wave!: number;
  peak!: number;
  level!: number;
  color!: string;
  period!: number;

  running = false;
  start?: number;

  animatedPeak = this.peak || 0;

  mounted(): void {
    this.running = true;
    requestAnimationFrame(this.computeFrame);
  }

  beforeUnmount(): void {
    this.running = false;
  }

  get shakedPeriod(): number {
    return Math.round((this.period || 300) + 500 * Math.random());
  }

  get clampedPeak(): number {
    return Math.max(0.1, this.peak || 0.5);
  }

  computeFrame(timestamp: number): void {
    if (typeof this.start == "undefined") {
      this.start = timestamp;
    }

    const time = (timestamp - this.start) % this.shakedPeriod;
    const halfPeriod = this.shakedPeriod / 2;

    if (time < halfPeriod) {
      // rising
      const progress = time / halfPeriod;
      this.animatedPeak = interpolate(
        -this.clampedPeak,
        this.clampedPeak,
        progress,
        INTERPOLATOR
      ) as number;
    } else {
      // falling
      const progress = (time - halfPeriod) / halfPeriod;
      this.animatedPeak = interpolate(
        this.clampedPeak,
        -this.clampedPeak,
        progress,
        INTERPOLATOR
      ) as number;
    }

    if (this.running) {
      requestAnimationFrame(this.computeFrame);
    }
  }
}
</script>
