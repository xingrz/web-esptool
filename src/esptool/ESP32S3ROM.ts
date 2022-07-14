import { IStub } from './ESPLoader';
import ESP32ROM from './ESP32ROM';

export default class ESP32S3ROM extends ESP32ROM {

  static CHIP_DETECT_MAGIC_VALUE = [0x9];

  CHIP_NAME = 'ESP32-S3';

  EFUSE_BASE = 0x60007000;

  STUB_CLASS = ESP32S3StubLoader;

  async load_stub(): Promise<IStub | null> {
    const { default: stub } = await import('./stubs/stub_flasher_32s3.elf');
    return stub;
  }

  async get_chip_description(): Promise<string> {
    return 'ESP32-S3';
  }

}

class ESP32S3StubLoader extends ESP32S3ROM {

  FLASH_WRITE_SIZE = 0x4000;  // matches MAX_WRITE_BLOCK in stub_loader.c
  STATUS_BYTES_LENGTH = 2;  // same as ESP8266, different to ESP32 ROM
  IS_STUB = true;

}
