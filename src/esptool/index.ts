import ESPTool from './ESPTool';
export default ESPTool;

export interface IFlashArgs {
  flashMode?: IFlashMode;
  flashFreq?: IFlashFreq;
  flashSize?: IFlashSize;
  partitions: {
    address: number;
    image: Buffer;
  }[];
}

export type IFlashMode = 'keep' | 'qio' | 'qout' | 'dio' | 'dout';
export type IFlashFreq = 'keep' | string;
export type IFlashSize = 'keep' | string;

export interface IConnectEvent {
  chip_description: string;
}
