<template>
  <svg class="sonic">
    <sonic-view-shape
      :peak="peak"
      :wave="2"
      :level="level"
      :period="period"
      color="#50E3C2FF"
    />

    <sonic-view-shape
      :peak="peak"
      :wave="3"
      :level="level"
      :period="period"
      color="#46DBBAB2"
    />

    <sonic-view-shape
      :peak="peak"
      :wave="4"
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
