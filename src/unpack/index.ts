import unzip from './unzip';
import { IFlashArgs, IFlashMode } from '@/esptool';

export default async function unpack(file: File): Promise<IFlashArgs | null> {
  const entries = await unzip(file);

  const { dir, content } = findFlashArgs(entries) || {};
  if (!content) {
    return null;
  }

  const args = Buffer.from(content)
    .toString()
    .replace(/\n/g, ' ')
    .split(' ')
    .map(i => i.trim())
    .filter(i => !!i);

  const flashArgs: IFlashArgs = {
    flashMode: 'qio',
    partitions: [],
  };

  for (let i = 0; i < args.length - 1; i++) {
    if (args[i] == '--flash_mode') {
      flashArgs.flashMode = args[i + 1] as IFlashMode;
    } else if (args[i].match(/^0x([A-Fa-f0-9]+)$/)) {
      const address = parseInt(RegExp.$1, 16);
      const key = `${dir}/${args[i + 1]}`;
      if (entries[key]) {
        flashArgs.partitions.push({ address, image: entries[key] });
      }
    } else if (args[i].match(/^([0-9]+)$/)) {
      const address = parseInt(RegExp.$1);
      const key = `${dir}/${args[i + 1]}`;
      if (entries[key]) {
        flashArgs.partitions.push({ address, image: entries[key] });
      }
    }
  }

  return flashArgs;
}

function findFlashArgs(entries: Record<string, Buffer>): { dir: string, content: Buffer } | null {
  for (const name in entries) {
    if (name.match(/^(.*)\/flash_args$/)) {
      return {
        dir: RegExp.$1,
        content: entries[name],
      };
    }
  }
  return null;
}
