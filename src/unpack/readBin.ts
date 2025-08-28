import { Buffer } from 'buffer';

import type { IFlashArgs } from '@/esptool';

export default async function readBin(file: File): Promise<IFlashArgs> {
  const image = Buffer.from(await file.arrayBuffer());

  return {
    flashMode: 'qio',
    partitions: [
      { address: 0, name: file.name, image },
    ],
  };
}
