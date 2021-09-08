<template>
  <svg class="sonic">
    <sonic-view-layer
      :peak="peak"
      :wave="2"
      :level="animatedLevel"
      :period="period"
      color="#50E3C2FF"
    />

    <sonic-view-layer
      :peak="peak"
      :wave="3"
      :level="animatedLevel"
      :period="period"
      color="#46DBBAB2"
    />

    <sonic-view-layer
      :peak="peak"
      :wave="4"
      :level="animatedLevel"
      :period="period"
      color="#47CCC2CC"
    />
  </svg>
</template>

<script lang="ts">
import { Vue, Options } from "vue-class-component";
import interpolate from "interpolate-all";

import SonicViewLayer from "./SonicViewLayer.vue";

const TRANSITION_DURATION = 800;
const INTERPOLATOR = "easeInOutQuad";

@Options({
  props: {
    peak: Number,
    level: Number,
    period: Number,
  },
  components: {
    SonicViewLayer,
  },
  watch: {
    level(value): void {
      this.changeLevel(value);
    },
  },
})
export default class SonicView extends Vue {
  peak!: number;
  level!: number;
  period!: number;

  running = false;
  start?: number;

  currentLevel = this.level || 0;
  nextLevel = this.level || 0;

  animatedLevel = this.level || 0;

  mounted(): void {
    this.animatedLevel = this.level || 0;
  }

  beforeUnmount(): void {
    this.running = false;
  }

  changeLevel(level: number): void {
    if (this.running) {
      this.running = false;
    }

    this.currentLevel = this.animatedLevel;
    this.nextLevel = level;

    delete this.start;
    this.running = true;
    requestAnimationFrame(this.computeFrame);
  }

  computeFrame(timestamp: number): void {
    if (typeof this.start == "undefined") {
      this.start = timestamp;
    }

    let time = timestamp - this.start;
    if (time >= TRANSITION_DURATION) {
      time = TRANSITION_DURATION;
      this.running = false;
    }

    this.animatedLevel = interpolate(
      this.currentLevel,
      this.nextLevel,
      time / TRANSITION_DURATION,
      INTERPOLATOR
    ) as number;

    if (this.running) {
      requestAnimationFrame(this.computeFrame);
    }
  }
}
</script>

<style lang="scss" scoped>
.sonic {
  width: 100vw;
  height: 100vh;
  position: fixed;
  z-index: -1;
}
</style>
