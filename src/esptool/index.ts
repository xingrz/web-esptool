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
  image: Buffer;
}

export interface IFlashProgress {
  index: number;
  blocks_written: number;
  blocks_total: number;
}

export interface IESPDevice {
  chip_description: string;
}
