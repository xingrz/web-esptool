import type { IESPDevice, IFlashArgs, IFlashProgress } from '@/esptool';

export interface IState {
  stage: 'idle' | 'connecting' | 'flashing';
  firmware: File | undefined;
  device: IESPDevice | undefined;
  flashArgs: IFlashArgs | undefined;
  progress: IFlashProgress | undefined;
}
