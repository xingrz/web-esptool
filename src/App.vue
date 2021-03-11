<template>
  <div>
    <div id="app">
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
            <a-icon v-bind:type="file ? 'file-zip' : 'inbox'" />
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
          v-bind:disabled="busy || !file"
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
  </div>
</template>

<script>
import unpack from './unpack';
import ESPTool from './esptool';
import WSABinding from 'serialport-binding-webserialapi';

const MAX_FILE_SIZE = 16 * 1024 * 1024;

function hackWSABinding() {
  // Hack WSABinding to force it to refresh ports
  // after the current port is closed
  navigator.serial.getPorts = async () => ([]);
  WSABinding.internalBasePortsList = [];
}

export default {
  name: 'App',
  data: () => ({
    file: null,
    flashArgs: {},
    progress: null,
    imageSizes: [],
    imageSizesTotal: 0,
    busy: false,
  }),
  mounted() {
    hackWSABinding();
    this.esp = new ESPTool();

    this.esp.on('connect', ({ chip_description }) => {
      console.log(`Connected: ${chip_description}`);
      this.$message.success(`已连接：${chip_description}`);
    });

    this.esp.on('disconnect', () => {
      console.log('Disconnected');
    });

    this.esp.on('progress', ({ index, blocks_written, blocks_total }) => {
      let success = 0;
      for (let i = 0; i < index; i++) {
        success += this.imageSizes[i];
      }
      const progress = success + this.imageSizes[index] * (blocks_written / blocks_total);
      this.progress = progress / this.imageSizesTotal * 100;
    });
  },
  methods: {
    async handleFile(file) {
      if (file.size >= MAX_FILE_SIZE) {
        this.$message.error(`文件过大: ${Math.round(file.size / 1024 / 1024)} MB`);
        return;
      }

      const flashArgs = await unpack(file);
      if (flashArgs == null) {
        this.$message.error('该文件不是一个合法的固件包');
        return;
      }

      this.file = file;
      this.flashArgs = flashArgs;

      this.imageSizes = flashArgs.partitions.map(({ image }) => image.length);
      this.imageSizesTotal = this.imageSizes.reduce((total, size) => total + size, 0);
    },
    async start() {
      this.busy = true;
      this.progress = 0;
      try {
        await this.esp.open('wsa://default');
      } catch (e) {
        this.$message.error('设备打开失败');
        this.busy = false;
        return;
      }
      try {
        await this.esp.flash(this.flashArgs);
      } catch (e) {
        console.error(e);
        this.$message.error('烧录失败');
      }
      console.log('done');
      this.busy = false;
    },
    formatProgress() {
      return this.progress >= 100 ? '完成' : `${Math.floor(this.progress)}%`;
    },
  },
};
</script>

<style>
#app {
  width: 100vw;
  height: 90vh;
  min-height: 500px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

#app > h1 {
  font-size: 50px;
  font-weight: 100;
  line-height: 1;
  margin-bottom: 0;
}

#app > .author {
  font-size: 18px;
  font-weight: 300;
  margin-bottom: 50px;
}

#app > .main {
  width: 90%;
  height: 200px;
  max-width: 400px;
}

#app > .upload .ant-upload-btn {
  padding: 24px 16px 16px;
}

#app > .upload .ant-upload-text.file {
  font-family: monospace;
}

#app > .progress {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

#app > .buttons {
  margin-top: 40px;
}

.footer {
  opacity: 0.5;
  font-size: 12px;
  text-align: center;
}
</style>
