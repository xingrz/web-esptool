<template>
  <path :d="path" :fill="color || '#000000'" />
</template>

<script lang="ts">
import { Vue, Options } from "vue-class-component";

@Options({
  props: {
    width: Number,
    height: Number,
    wave: Number,
    peak: Number,
    level: Number,
    color: String,
  },
})
export default class SonicViewShape extends Vue {
  width!: number;
  height!: number;
  wave!: number;
  peak!: number;
  level!: number;
  color!: string;

  get path(): string {
    const wave = this.wave || 1;
    const peak = this.peak || 0;
    const level = this.level || 0.5;
    const width = this.width || window.innerWidth;
    const height = this.height || window.innerHeight;

    const middle = height * (1 - level);
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
