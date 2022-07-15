import { IESPDevice, IFlashArgs, IFlashProgress } from '@/esptool';

export interface IState {
  stage: 'idle' | 'connecting' | 'flashing';
  firmware: File | null;
  device: IESPDevice | null;
  flashArgs: IFlashArgs | null;
  progress: IFlashProgress | null;
}
