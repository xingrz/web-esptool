<template>
  <div :class="$style.main" :style="{ marginBottom: '16px' }">
    <a-descriptions :title="state.device?.model || '未连接'" :column="2" size="small">
      <template #extra>
        <a-space>
          <a-button v-if="connected" @click="reset">断开</a-button>
          <a-button v-else type="primary" :loading="connecting" @click="connect">连接</a-button>
        </a-space>
      </template>
      <a-descriptions-item label="ECO 版本">
        {{ state.device?.revision || 'N/A' }}
      </a-descriptions-item>
      <a-descriptions-item label="MAC 地址">
        <code>{{ state.device?.mac || 'N/A' }}</code>
      </a-descriptions-item>
      <a-descriptions-item label="Flash 大小">
        {{ state.device?.flash_size ? `${state.device.flash_size} MB` : 'N/A' }}
      </a-descriptions-item>
      <a-descriptions-item label="PSRAM 大小">
        {{ state.device?.psram_size ? `${state.device.psram_size} MB` : 'N/A' }}
      </a-descriptions-item>
    </a-descriptions>
  </div>

  <a-table :columns="columns" :data-source="props.state.flashArgs?.partitions || []" :pagination="false" bordered
    size="small" :scroll="{ y: 300 }" :class="$style.main">
    <template #bodyCell="{ column, record, index }">
      <template v-if="column.key == 'address'">
        <code>{{ hex(record.address, 4) }}</code>
      </template>
      <template v-else-if="column.key == 'length'">
        <code>{{ record.image.length }}</code>
      </template>
      <template v-else-if="column.key == 'name'">
        <code>{{ record.name }}</code>
      </template>
      <template v-else-if="column.key == 'progress'">
        <a-progress :percent="Math.round(progresses[index] || 0)" size="small" />
      </template>
    </template>
  </a-table>
  <div :class="$style.main" :style="{ marginTop: '16px', textAlign: 'right' }">
    <a-space>
      <a-upload :accept="acceptExts.join(',')" :showUploadList="false" :customRequest="handleFile">
        <a-button>
          <template #icon>
            <folder-open-outlined />
          </template>
          选择固件
        </a-button>
      </a-upload>
      <a-button type="primary" :loading="flashing" :disabled="!connected || !props.state.firmware" @click="flash">
        <template #icon>
          <download-outlined />
        </template>
        烧录
      </a-button>
    </a-space>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineEmits, defineProps } from 'vue';
import { FolderOpenOutlined, DownloadOutlined } from '@ant-design/icons-vue';

import hex from '@/esptool/utils/hex';

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
}>();

const columns = [
  { title: '地址', key: 'address' },
  { title: '大小', key: 'length', align: 'right' },
  { title: '文件', key: 'name' },
  { title: '进度', key: 'progress', width: '150px' },
];

const connecting = computed(() => props.state.stage == 'connecting');
const connected = computed(() => !!props.state.device);
function connect() {
  emit('connect');
}
function reset() {
  emit('reset');
}

function handleFile({ file }: { file: File }): void {
  emit('file', file);
}

const flashing = computed(() => props.state.stage == 'flashing');
function flash() {
  emit('flash');
}

const progresses = computed(() => {
  const { progress, flashArgs } = props.state;
  if (!flashArgs || !progress) return [];
  return flashArgs.partitions.map((_, index) => {
    if (index < progress.index) {
      return 100;
    } else if (index > progress.index) {
      return 0;
    } else {
      return progress.blocks_written / progress.blocks_total * 100;
    }
  });
});
</script>

<style lang="scss" module>
.main {
  width: 90%;
  max-width: 800px;
}
</style>
