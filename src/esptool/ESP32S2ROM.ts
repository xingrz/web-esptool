import { IESPDevice } from '.';
import { IStub } from './ESPLoader';
import ESP32ROM from './ESP32ROM';

export default class ESP32S2ROM extends ESP32ROM {

  static CHIP_DETECT_MAGIC_VALUE = [0x000007c6];

  CHIP_NAME = 'ESP32-S2';

  EFUSE_BASE = 0x3F41A000;
  EFUSE_BLK1 = this.EFUSE_BASE + 0x044;

  STUB_CLASS = ESP32S2StubLoader;

  async load_stub(): Promise<IStub | null> {
    const { default: stub } = await import('./stubs/stub_flasher_32s2.elf');
    return stub;
  }

  async get_chip_info(): Promise<IESPDevice> {
    const word3 = await this.read_efuse(this.EFUSE_BLK1, 3);

    // EFUSE_BLK1, 117, 4, FLASH_VERSION
    const flash_version = (word3 >> 21) & 0xf;

    // EFUSE_BLK1, 124, 4, PSRAM_VERSION
    const psram_version = (word3 >> 28) & 0xf;

    const chip_name = [
      ['ESP32-S2', 'ESP32-S2R2'],
      ['ESP32-S2FH2', undefined],
      ['ESP32-S2FH4', 'ESP32-S2FN4R2'],
    ][flash_version]?.[psram_version] || 'unknown ESP32-S2';

    const psram_size = [undefined, 2][psram_version];

    return {
      model: chip_name,
      revision: 0,
      description: chip_name,
      psram_size: psram_size,
    };
  }

}

class ESP32S2StubLoader extends ESP32S2ROM {

  FLASH_WRITE_SIZE = 0x4000;  // matches MAX_WRITE_BLOCK in stub_loader.c
  STATUS_BYTES_LENGTH = 2;  // same as ESP8266, different to ESP32 ROM
  IS_STUB = true;

}
