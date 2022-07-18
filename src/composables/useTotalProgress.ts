import { computed } from 'vue';

import type { ComputedRef } from 'vue';
import type { IState } from '@/types/state';
import type { IFlashPartition } from '@/esptool';

export default function useTotalProgress(state: IState): ComputedRef<number | null> {
  return computed(() => {
    if (!state.flashArgs) return null;
    if (!state.progress) return null;

    const { partitions } = state.flashArgs;
    const { index, blocks_written, blocks_total } = state.progress;

    const total = totalLength(partitions);
    const succeed = totalLength(partitions.slice(0, index));
    const current = partitions[index].image.length * (blocks_written / blocks_total);

    return Math.min(100, (succeed + current) / total * 100);
  });
}

function totalLength(partitions: IFlashPartition[]): number {
  return partitions.reduce((total, { image }) => total + image.length, 0);
}
