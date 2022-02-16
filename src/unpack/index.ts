import unzip from './unzip';
import { IFlashArgs, IFlashMode } from '@/esptool';

export interface IMfgConfig {
  address: number;
  images: Record<string, Buffer>;
}

export default async function unpack(file: File): Promise<{ flashArgs: IFlashArgs, mfgConfig: IMfgConfig | null} | null> {
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

  return {
    flashArgs: flashArgs,
    mfgConfig: getMfgConfig(entries),
  };
}

function getMfgConfig(entries: Record<string, Buffer>) : IMfgConfig | null {
  const { dir, content } = findMfgConfig(entries) || {};
  if (!content) {
    return null;
  }

  const args = Buffer.from(content)
    .toString()
    .split(' ')
    .map(i => i.trim())
    .filter(i => !!i);

  const mfgConfig : IMfgConfig = {
    address: 0,
    images: {},
  };

  if (args[0].match(/^0x([A-Fa-f0-9]+)$/)) {
    mfgConfig.address = parseInt(RegExp.$1, 16);
  } else if (args[0].match(/^([0-9]+)$/)) {
    mfgConfig.address = parseInt(RegExp.$1);
  } else {
    return null;
  }
  const regex = new RegExp(`^${dir}/${args[1]}(.*)$`.replace(/\//g, "\\/"));
  for (const name in entries) {
    if (name.match(regex)) {
      mfgConfig.images[RegExp.$1] = entries[name];
    }
  }

  return mfgConfig;
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

function findMfgConfig(entries: Record<string, Buffer>): { dir: string, content: Buffer } | null {
  for (const name in entries) {
    if (name.match(/^(.*)\/mfg_config$/)) {
      return {
        dir: RegExp.$1,
        content: entries[name],
      };
    }
  }
  return null;
}
