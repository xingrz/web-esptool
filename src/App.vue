<template>
  <sonic-view :peak="peak" :level="level" :period="500" />
  <div :class="{ [$style.header]: true, [$style.inverted]: (progress || 0) > 95 }">
    <a-space align="center">
      <span>高级模式</span>
      <a-switch :checked="advanced" @update:checked="setAdvanced" />
    </a-space>
  </div>
  <div :class="$style.content">
    <router-view v-slot="{ Component }">
      <component :is="Component" :state="state" :accept-exts="ACCEPT_EXTS" @file="handleFile" @connect="connect"
        @flash="flash" @reset="reset" @start="oneClick" @clear="clear" />
    </router-view>
  </div>
  <div :class="{ [$style.footer]: true, [$style.inverted]: !advanced && (progress || 0) > 10 }">
    <span>© 2021-2022 XiNGRZ</span>
    <a-divider type="vertical" />
    <a href="https://github.com/xingrz/web-esptool">Fork me on GitHub</a>
    <a-divider type="vertical" />
    <a href="https://github.com/xingrz/web-esptool/wiki">固件格式说明</a>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';

import SonicView from '@/components/SonicView.vue';

import useTotalProgress from '@/composables/useTotalProgress';

import readZip from '@/unpack/readZip';
import readUf2 from '@/unpack/readUf2';
import ESPTool from '@/esptool';

import type { IState } from '@/types/state';
import type { IESPDevice, IFlashProgress } from '@/esptool';

const ACCEPT_EXTS = ['.zip', '.bin'];

const MAX_FILE_SIZE = 16 * 1024 * 1024;

const router = useRouter();
const advanced = computed(() => router.currentRoute.value.name == 'studio');
function setAdvanced(value: boolean) {
  if (value) {
    router.replace({ name: 'studio' });
  } else {
    router.replace({ name: 'simple' });
  }
}

const state = reactive<IState>({
  stage: 'idle',
  firmware: null,
  device: null,
  flashArgs: null,
  progress: null,
});

const esp = new ESPTool();

esp.on('connect', (device: IESPDevice) => {
  state.device = device;
  console.log(`Connected: ${device.description}`);
  message.success(`已连接：${device.description}`);
});

esp.on('disconnect', () => {
  state.device = null;
});

esp.on('progress', (progress: IFlashProgress) => {
  state.progress = progress;
});

async function handleFile(file: File): Promise<void> {
  if (file.size >= MAX_FILE_SIZE) {
    message.error(`文件过大: ${Math.round(file.size / 1024 / 1024)} MB`);
    return;
  }

  state.progress = null;

  const name = file.name.toLocaleLowerCase();
  if (name.endsWith('.zip')) {
    state.flashArgs = await readZip(file);
  } else if (name.endsWith('.bin')) {
    state.flashArgs = await readUf2(file);
  }

  if (state.flashArgs == null) {
    message.error('该文件不是一个合法的固件包');
    return;
  }

  state.firmware = file;
}

async function connect(): Promise<boolean> {
  if (state.device != null) {
    return true;
  }
  try {
    state.stage = 'connecting';
    const serial = await navigator.serial.requestPort();
    await esp.open(serial);
    return true;
  } catch (e) {
    message.error('设备打开失败');
    return false;
  } finally {
    state.stage = 'idle';
  }
}

async function flash(reset = false): Promise<boolean> {
  if (state.flashArgs == null) {
    return false;
  }
  try {
    state.stage = 'flashing';
    await esp.flash(state.flashArgs, reset);
    return true;
  } catch (e) {
    console.error(e);
    message.error('烧录失败');
    state.progress = null;
    return false;
  } finally {
    state.stage = 'idle';
  }
}

async function reset(): Promise<void> {
  await esp.reset();
}

async function oneClick(): Promise<void> {
  if (!await connect()) {
    return;
  }
  await flash(true);
  await esp.close();
  console.log('done');
}

function clear(): void {
  state.progress = null;
}

const progress = useTotalProgress(state);

const peak = computed(() => {
  if (state.stage == 'flashing') return 0.7;
  else if (state.stage == 'connecting') return 0.4;
  else if (progress.value != null && progress.value >= 100 && !advanced.value) return 0;
  else return 0.2;
});

const level = computed(() => {
  if (progress.value == null || advanced.value) {
    return 0.02;
  } else {
    return 0.02 + (progress.value / 100) * 1.1;
  }
});
</script>

<style lang="scss" module>
:global(html),
:global(body) {
  margin: 0;
  padding: 0;
}

.header {
  padding: 16px 32px;
  text-align: right;
}

.content {
  width: 100vw;
  height: 80vh;
  min-height: 500px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
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
