<template>
  <div :class="[$style.main, $style.upload]" v-if="progress == null">
    <a-upload-dragger accept=".zip,.hex" :showUploadList="false" :customRequest="handleFile">
      <p class="ant-upload-drag-icon">
        <file-zip-outlined v-if="firmware" />
        <inbox-outlined v-else />
      </p>
      <p class="ant-upload-text" :class="$style.file" v-if="firmware">{{ firmware.name }}</p>
      <p class="ant-upload-text" v-else>点击选择或将固件包拖放到此处</p>
    </a-upload-dragger>
  </div>
  <div :class="[$style.main, $style.progress]" v-if="progress != null">{{ Math.floor(progress || 0) }}%</div>
  <div :class="$style.buttons">
    <a-button size="large" v-if="stage != 'flashing'" :type="completed ? 'default' : 'primary'" :ghost="completed"
      :disabled="!firmware" :loading="stage == 'connecting'" @click="handleStart">
      开始烧录</a-button>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineEmits, defineProps, toRefs } from 'vue';
import { InboxOutlined, FileZipOutlined } from '@ant-design/icons-vue';

import type { IState } from '@/types/state';
import useTotalProgress from '@/composables/useTotalProgress';

const props = defineProps<{
  state: IState,
}>();

const emit = defineEmits<{
  (e: 'file', file: File): void;
  (e: 'start'): void;
}>();

const { stage, firmware } = toRefs(props.state);
const progress = useTotalProgress(props.state);
const completed = computed(() => progress.value == 100);

function handleFile({ file }: { file: File }): void {
  emit('file', file);
}

function handleStart(): void {
  emit('start');
}
</script>

<style lang="scss" module>
.main {
  width: 90%;
  height: 200px;
  max-width: 400px;
}

.upload {
  :global(.ant-upload-btn) {
    display: flex !important;
    flex-direction: column;
    justify-content: center;
    padding: 24px 16px 16px;
  }

  .file {
    font-family: monospace;
  }
}

.progress {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  max-width: unset;
  font-size: 100px;
  font-weight: 100;
}

.buttons {
  margin-top: 40px;
  height: 50px;
}
</style>
