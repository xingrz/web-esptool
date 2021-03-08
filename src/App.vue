<template>
  <div id="app">
    <h1>Web ESPTool</h1>
    <div class="author">by XiNGRZ</div>
    <div class="main upload" v-if="progress == null">
      <a-upload-dragger
        accept=".zip"
        v-bind:showUploadList="false"
        v-bind:customRequest="({ file }) => (this.file = file)"
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
        v-bind:status="progress == 100 ? 'success' : 'active'"
        v-bind:format="() => (progress == 100 ? '完成' : `${progress}%`)"
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
</template>

<script>
import ESPTool from './esptool';
import WSABinding from 'serialport-binding-webserialapi';

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
    progress: null,
    busy: false,
    connected: false,
  }),
  mounted() {
    hackWSABinding();
    this.esp = new ESPTool();

    this.esp.on('connect', ({ chip_description }) => {
      this.connected = true;
      console.log(`Connected: ${chip_description}`);
    });

    this.esp.on('disconnect', () => {
      this.connected = false;
      console.log('Disconnected');
    });

    this.esp.on('progress', ({ value }) => {
      this.progress = value;
    });
  },
  methods: {
    async start() {
      if (!this.connected) {
        await this.esp.open('wsa://default');
      }
      this.progress = 0;
      this.busy = true;
      await this.esp.flash(this.file);
      this.busy = false;
    },
  },
};
</script>

<style>
#app {
  width: 100vw;
  height: 100vh;
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
</style>
