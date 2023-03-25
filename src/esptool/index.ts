import ESPTool from './ESPTool';
export default ESPTool;

export interface IFlashArgs {
  flashMode?: IFlashMode;
  flashFreq?: IFlashFreq;
  flashSize?: IFlashSize;
  partitions: IFlashPartition[];
}

export type IFlashMode = 'keep' | 'qio' | 'qout' | 'dio' | 'dout';
export type IFlashFreq = 'keep' | string;
export type IFlashSize = 'keep' | string;

export interface IFlashPartition {
  address: number;
  name?: string;
  image: Buffer;
}

export interface IFlashProgress {
  index: number;
  blocks_written: number;
  blocks_total: number;
}

export interface IESPDevice {
  model: string;
  revision: number;
  description: string;
  mac: string | undefined;
  flash_size: number | undefined;
  psram_size: number | undefined;
}
