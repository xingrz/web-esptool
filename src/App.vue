<template>
  <sonic-view :peak="peak" :level="level" :period="500" />
  <div class="content">
    <h1>Web ESPTool</h1>
    <div class="author">by XiNGRZ</div>
    <div class="main upload" v-if="progress == null">
      <a-upload-dragger
        accept=".zip"
        :showUploadList="false"
        :customRequest="({ file }: { file: File }) => handleFile(file)"
        class="uploader"
      >
        <p class="ant-upload-drag-icon">
          <file-zip-outlined v-if="selected" />
          <inbox-outlined v-else />
        </p>
        <p class="ant-upload-text file" v-if="selected">{{ selected.name }}</p>
        <p class="ant-upload-text" v-else>点击选择或将固件包拖放到此处</p>
      </a-upload-dragger>
    </div>
    <div
      class="main progress"
      v-if="progress != null"
    >{{ Math.floor(progress || 0) }}%</div>
    <div class="select" v-if="mfgImages.length">
      量产数据：
      <a-select
        :value="selectMfg"
        :disabled="state != 'idle'"
        @change="selectMfgChange"
        style="width: 320px">
        <a-select-option v-for="image in mfgImages" :key="image">
          {{ image }}
        </a-select-option>
      </a-select>
    </div>
    <div class="buttons">
      <a-button
        size="large"
        v-if="state != 'flashing'"
        :type="progress != null && Math.floor(progress) == 100 ? 'default' : 'primary'"
        :ghost="progress != null && Math.floor(progress) == 100"
        :disabled="!selected"
        :loading="state == 'connecting'"
        @click="start"
      >开始烧录</a-button>
    </div>
  </div>
  <div class="footer">
    <div>Copyright © 2021 XiNGRZ</div>
    <div>
      <a href="https://github.com/xingrz/web-esptool">Fork me on GitHub</a>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { message } from "ant-design-vue";
import { InboxOutlined, FileZipOutlined } from "@ant-design/icons-vue";

import SonicView from "./components/SonicView.vue";

import unpack, {IMfgConfig} from "./unpack";
import ESPTool, { IConnectEvent, IFlashArgs } from "./esptool";

const MAX_FILE_SIZE = 16 * 1024 * 1024;

type IState = "idle" | "connecting" | "flashing";

const selected = ref<File | null>(null);
const progress = ref<number | null>(null);
const state = ref<IState>("idle");
const mfgImages = ref<string[]>([]);
const selectMfg = ref<string | null>(null);

let flashArgs: IFlashArgs | null = null;
let mfgConfig: IMfgConfig | null = null;

let imageSizes: number[] = [];
let imageSizesTotal = 0;
let imageSizesOriginTotal = 0;

const peak = computed(() => {
  if (state.value == "flashing") return 0.7;
  else if (state.value == "connecting") return 0.4;
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

esp.on("connect", ({ chip_description }: IConnectEvent) => {
  console.log(`Connected: ${chip_description}`);
  message.success(`已连接：${chip_description}`);
});

esp.on("progress", ({ index, blocks_written, blocks_total }) => {
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

  const { flashArgs : foo, mfgConfig: bar } = await unpack(file);
  flashArgs = foo;
  mfgConfig = bar;
  if (flashArgs == null) {
    message.error("该文件不是一个合法的固件包");
    return;
  }

  selected.value = file;

  mfgImages.value = [];
  for (const name in mfgConfig?.images) {
    mfgImages.value.push(name);
  }
  if (mfgImages.value.length > 0) {
    selectMfg.value = mfgImages.value[0];
  }

  imageSizes = flashArgs.partitions.map(({ image }) => image.length);
  imageSizesOriginTotal = imageSizesTotal = imageSizes.reduce((total, size) => total + size, 0);
}

function selectMfgChange(value: string): void {
  selectMfg.value = value;
}

async function start(): Promise<void> {
  state.value = "connecting";
  progress.value = 0;
  try {
    const serial = await navigator.serial.requestPort();
    await esp.open(serial);
  } catch (e) {
    message.error("设备打开失败");
    state.value = "idle";
    return;
  }
  state.value = "flashing";
  try {
    if (flashArgs != null && mfgConfig != null && selectMfg.value != null) {
      let args: IFlashArgs = {
        flashMode: flashArgs.flashMode,
        flashFreq: flashArgs.flashFreq,
        flashSize: flashArgs.flashSize,
        partitions: [],
      };
      for (const n in flashArgs.partitions) {
        args.partitions.push(flashArgs.partitions[n]);
      }
      if (mfgConfig.images[selectMfg.value]) {
        args.partitions.push({address: mfgConfig.address, image: mfgConfig.images[selectMfg.value]});
        imageSizesTotal = imageSizesOriginTotal + mfgConfig.images[selectMfg.value].length;
      }
      await esp.flash(args);
    } else {
      await esp.flash(flashArgs!);
    }
  } catch (e) {
    console.error(e);
    message.error("烧录失败");
  }
  await esp.close();
  if (selectMfg.value != null) {
    for (let n in mfgImages.value) {
      if (selectMfg.value == mfgImages.value[n]) {
        n++;
        if (n < mfgImages.value.length) {
          selectMfg.value = mfgImages.value[n];
          message.info("已切换量产数据 " + selectMfg.value);
        } else {
          message.warn("已烧录完最后一个量产数据。");
        }
        break;
      }
    }
  }
  console.log("done");
  state.value = "idle";
}
</script>

<style lang="scss">
html,
body {
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

  > h1 {
    font-size: 50px;
    font-weight: 100;
    line-height: 1;
    margin-bottom: 0;
  }

  > .author {
    font-size: 18px;
    font-weight: 300;
    margin-bottom: 50px;
  }

  > .main {
    width: 90%;
    height: 200px;
    max-width: 400px;
  }

  > .upload .ant-upload-btn {
    padding: 24px 16px 16px;
  }

  > .upload .ant-upload-text.file {
    font-family: monospace;
  }

  > .progress {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    max-width: unset;
    font-size: 100px;
    font-weight: 100;
  }

  > .select {
    margin-top: 40px;
  }

  > .buttons {
    margin-top: 40px;
    height: 50px;
  }
}

.footer {
  opacity: 0.5;
  font-size: 12px;
  text-align: center;
}
</style>
