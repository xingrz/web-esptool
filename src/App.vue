<template>
  <sonic-view :peak="peak" :level="level" :period="500" />
  <div :class="$style.content">
    <h1>Web ESPTool</h1>
    <div :class="$style.author">by XiNGRZ</div>
    <simple :selected="selected" :progress="progress" :state="state" @file="handleFile" @start="start" />
  </div>
  <div :class="{ [$style.footer]: true, [$style.inverted]: (progress || 0) > 10 }">
    <span>© 2021-2022 XiNGRZ</span>
    <a-divider type="vertical" />
    <a href="https://github.com/xingrz/web-esptool">Fork me on GitHub</a>
    <a-divider type="vertical" />
    <a href="https://github.com/xingrz/web-esptool/wiki">固件格式说明</a>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { message } from 'ant-design-vue';

import Simple from './routes/Simple.vue';

import SonicView from './components/SonicView.vue';

import readHex from './unpack/readHex';
import readZip from './unpack/readZip';
import ESPTool, { IConnectEvent, IFlashArgs } from './esptool';

import type { IState } from '@/types/state';

const MAX_FILE_SIZE = 16 * 1024 * 1024;

const selected = ref<File | null>(null);
const progress = ref<number | null>(null);
const state = ref<IState>('idle');

let flashArgs: IFlashArgs | null = null;

let imageSizes: number[] = [];
let imageSizesTotal = 0;

const peak = computed(() => {
  if (state.value == 'flashing') return 0.7;
  else if (state.value == 'connecting') return 0.4;
  else if (progress.value != null && progress.value >= 100) return 0;
  else return 0.2;
});

const level = computed(() => {
  if (progress.value == null) {
    return 0.02;
  } else {
    return 0.02 + (progress.value / 100) * 1.1;
  }
});

const esp = new ESPTool();

esp.on('connect', ({ chip_description }: IConnectEvent) => {
  console.log(`Connected: ${chip_description}`);
  message.success(`已连接：${chip_description}`);
});

esp.on('progress', ({ index, blocks_written, blocks_total }) => {
  let success = 0;
  for (let i = 0; i < index; i++) {
    success += imageSizes[i];
  }
  const p = success + imageSizes[index] * (blocks_written / blocks_total);
  progress.value = Math.min(100, (p / imageSizesTotal) * 100);
});

async function handleFile(file: File): Promise<void> {
  if (file.size >= MAX_FILE_SIZE) {
    message.error(`文件过大: ${Math.round(file.size / 1024 / 1024)} MB`);
    return;
  }

  const name = file.name.toLocaleLowerCase();
  if (name.endsWith('.hex')) {
    flashArgs = await readHex(file);
  } else if (name.endsWith('.zip')) {
    flashArgs = await readZip(file);
  }

  if (flashArgs == null) {
    message.error('该文件不是一个合法的固件包');
    return;
  }

  selected.value = file;

  imageSizes = flashArgs.partitions.map(({ image }) => image.length);
  imageSizesTotal = imageSizes.reduce((total, size) => total + size, 0);
}

async function start(): Promise<void> {
  state.value = 'connecting';
  progress.value = 0;
  try {
    const serial = await navigator.serial.requestPort();
    await esp.open(serial);
  } catch (e) {
    message.error('设备打开失败');
    state.value = 'idle';
    return;
  }
  state.value = 'flashing';
  try {
    await esp.flash(flashArgs!);
  } catch (e) {
    console.error(e);
    message.error('烧录失败');
  }
  await esp.close();
  console.log('done');
  state.value = 'idle';
}
</script>

<style lang="scss" module>
:global(html),
:global(body) {
  margin: 0;
  padding: 0;
}

.content {
  width: 100vw;
  height: 90vh;
  min-height: 500px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  >h1 {
    font-size: 50px;
    font-weight: 100;
    line-height: 1;
    margin-bottom: 0;
  }

  .author {
    font-size: 18px;
    font-weight: 300;
    margin-bottom: 50px;
  }
}

.footer {
  opacity: 0.6;
  font-size: 12px;
  text-align: center;

  color: #000;
  transition: color 500ms;

  a {
    color: #599;

    &:hover {
      text-decoration: underline;
    }
  }

  &.inverted {
    color: #FFF;

    a {
      color: #FFD;
    }
  }
}
</style>
