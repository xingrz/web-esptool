<template>
  <svg class="sonic">
    <sonic-view-shape
      :width="width"
      :height="height"
      :peak="peak"
      :wave="Math.round((width / 640) * 2)"
      :level="level"
      :period="period"
      color="#50E3C2FF"
    />

    <sonic-view-shape
      :width="width"
      :height="height"
      :peak="peak"
      :wave="Math.round((width / 640) * 3)"
      :level="level"
      :period="period"
      color="#46DBBAB2"
    />

    <sonic-view-shape
      :width="width"
      :height="height"
      :peak="peak"
      :wave="Math.round((width / 640) * 5)"
      :level="level"
      :period="period"
      color="#47CCC2CC"
    />
  </svg>
</template>

<script lang="ts">
import { Vue, Options } from "vue-class-component";
import SonicViewShape from "./SonicViewShape.vue";

@Options({
  props: {
    peak: Number,
    level: Number,
    period: Number,
  },
  components: {
    SonicViewShape,
  },
})
export default class SonicView extends Vue {
  peak!: number;
  level!: number;
  period!: number;

  width = window.innerWidth;
  height = window.innerHeight;

  mounted(): void {
    window.addEventListener("resize", this.onResize, false);
  }

  beforeUnmount(): void {
    window.removeEventListener("resize", this.onResize, false);
  }

  onResize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
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
