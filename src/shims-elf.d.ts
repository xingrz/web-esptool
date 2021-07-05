declare module '*.elf' {
  import { IStub } from './esptool/ESPLoader';
  export default IStub;
}
