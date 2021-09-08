<template>
  <div class="content">
    <h1>Web ESPTool</h1>
    <div class="author">by XiNGRZ</div>
    <div class="main upload" v-if="progress == null">
      <a-upload-dragger
        accept=".zip"
        v-bind:showUploadList="false"
        v-bind:customRequest="({ file }) => handleFile(file)"
        class="uploader"
      >
        <p class="ant-upload-drag-icon">
          <file-zip-outlined v-if="file" />
          <inbox-outlined v-else />
        </p>
        <p class="ant-upload-text file" v-if="file">{{ file.name }}</p>
        <p class="ant-upload-text" v-else>点击选择或将固件包拖放到此处</p>
      </a-upload-dragger>
    </div>
    <div class="main progress" v-if="progress != null">
      <a-progress
        type="circle"
        v-bind:width="150"
        v-bind:strokeWidth="4"
        v-bind:percent="progress"
        v-bind:status="progress >= 100 ? 'success' : 'active'"
        v-bind:format="formatProgress"
      />
    </div>
    <div class="buttons">
      <a-button
        size="large"
        type="primary"
        v-if="state != 'flashing'"
        v-bind:disabled="!file"
        v-bind:loading="state == 'connecting'"
        v-on:click="start"
        >开始烧录</a-button
      >
    </div>
  </div>
  <div class="footer">
    <div>Copyright © 2021 XiNGRZ</div>
    <div>
      <a href="https://github.com/xingrz/web-esptool">Fork me on GitHub</a>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Options } from "vue-class-component";
import { message } from "ant-design-vue";
import { InboxOutlined, FileZipOutlined } from "@ant-design/icons-vue";

import unpack from "./unpack";
import ESPTool, { IConnectEvent, IFlashArgs } from "./esptool";

const MAX_FILE_SIZE = 16 * 1024 * 1024;

type IState = "idle" | "connecting" | "flashing";

@Options({
  components: {
    InboxOutlined,
    FileZipOutlined,
  },
})
export default class App extends Vue {
  file: File | null = null;
  progress: number | null = null;
  imageSizes: number[] = [];
  imageSizesTotal = 0;

  state: IState = "idle";

  flashArgs?: IFlashArgs;
  esp?: ESPTool;

  mounted(): void {
    this.esp = new ESPTool();

    this.esp.on("connect", ({ chip_description }: IConnectEvent) => {
      console.log(`Connected: ${chip_description}`);
      message.success(`已连接：${chip_description}`);
    });

    this.esp.on("progress", ({ index, blocks_written, blocks_total }) => {
      let success = 0;
      for (let i = 0; i < index; i++) {
        success += this.imageSizes[i];
      }
      const progress =
        success + this.imageSizes[index] * (blocks_written / blocks_total);
      this.progress = (progress / this.imageSizesTotal) * 100;
    });
  }

  async handleFile(file: File): Promise<void> {
    if (file.size >= MAX_FILE_SIZE) {
      message.error(`文件过大: ${Math.round(file.size / 1024 / 1024)} MB`);
      return;
    }

    const flashArgs = await unpack(file);
    if (flashArgs == null) {
      message.error("该文件不是一个合法的固件包");
      return;
    }

    this.file = file;
    this.flashArgs = flashArgs;

    this.imageSizes = flashArgs.partitions.map(({ image }) => image.length);
    this.imageSizesTotal = this.imageSizes.reduce(
      (total, size) => total + size,
      0
    );
  }

  async start(): Promise<void> {
    this.state = "connecting";
    this.progress = 0;
    try {
      const serial = await navigator.serial.requestPort();
      await this.esp?.open(serial);
    } catch (e) {
      message.error("设备打开失败");
      this.state = "idle";
      return;
    }
    this.state = "flashing";
    try {
      await this.esp?.flash(this.flashArgs!);
    } catch (e) {
      console.error(e);
      message.error("烧录失败");
    }
    await this.esp?.close();
    console.log("done");
    this.state = "idle";
  }

  formatProgress(): string {
    return this.progress! >= 100 ? "完成" : `${Math.floor(this.progress!)}%`;
  }
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
