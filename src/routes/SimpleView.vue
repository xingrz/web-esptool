<template>
  <h1 :class="$style.title">Web ESPTool</h1>
  <div :class="$style.author">by XiNGRZ</div>
  <Transition name="slide-up" mode="out-in">
    <div :class="[$style.main, $style.upload]" v-if="progress == null">
      <a-upload-dragger :accept="acceptExts.join(',')" :showUploadList="false" :customRequest="handleFile">
        <p class="ant-upload-drag-icon">
          <file-zip-outlined v-if="firmware" />
          <inbox-outlined v-else />
        </p>
        <p class="ant-upload-text" :class="$style.file" v-if="firmware">{{ firmware.name }}</p>
        <p class="ant-upload-text" v-else>点击选择或将固件包拖放到此处</p>
      </a-upload-dragger>
    </div>
    <div :class="[$style.main, $style.progress]" v-else-if="completed">烧录完成</div>
    <div :class="[$style.main, $style.progress]" v-else>{{ Math.floor(progress || 0) }}%</div>
  </Transition>
  <div :class="$style.buttons">
    <Transition name="fade" mode="out-in">
      <template v-if="stage != 'flashing'">
        <a-button v-if="completed" size="large" type="default" ghost @click="handleClear" :class="$style.reset">
          再次烧录
        </a-button>
        <a-button v-else size="large" type="primary" :disabled="!firmware"
          :loading="['connecting', 'flashing'].includes(stage)" @click="handleStart">
          开始烧录
        </a-button>
      </template>
    </Transition>
  </div>
</template>

<script lang="ts" setup>
import { computed, toRefs } from 'vue';
import { InboxOutlined, FileZipOutlined } from '@ant-design/icons-vue';

import useTotalProgress from '@/composables/useTotalProgress';

import type { IState } from '@/types/state';

const props = defineProps<{
  state: IState;
  acceptExts: string[];
}>();

const emit = defineEmits<{
  (e: 'file', file: File): void;
  (e: 'connect'): void;
  (e: 'reset'): void;
  (e: 'flash'): void;
  (e: 'start'): void;
  (e: 'clear'): void;
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

function handleClear(): void {
  emit('clear');
}
</script>

<style lang="scss" module>
.title {
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

.reset:global(.ant-btn.ant-btn-background-ghost) {
  opacity: 0.8;

  &:hover,
  &:focus {
    color: white;
    border-color: white;
    opacity: 1.0;
  }
}

:global(.slide-up-enter-active),
:global(.slide-up-leave-active) {
  transition: all 0.25s ease-out;
}

:global(.slide-up-enter-from) {
  opacity: 0;
  transform: translateY(30px);
}

:global(.slide-up-leave-to) {
  opacity: 0;
  transform: translateY(-30px);
}

:global(.fade-enter-active),
:global(.fade-leave-active) {
  transition: opacity 0.5s ease;
}

:global(.fade-enter-from),
:global(.fade-leave-to) {
  opacity: 0;
}
</style>
