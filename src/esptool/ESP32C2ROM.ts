import { IStub } from './ESPLoader';
import ESP32C3ROM from './ESP32C3ROM';

export default class ESP32C2ROM extends ESP32C3ROM {

  // Magic value for ESP32C2 ECO0 and ECO1 respectively
  static CHIP_DETECT_MAGIC_VALUE = [0x6f51306f, 0x7c41a06f];

  CHIP_NAME = 'ESP32-C2';

  EFUSE_BASE = 0x60008800;
  EFUSE_BLK1 = this.EFUSE_BASE + 0x044;

  STUB_CLASS = ESP32C2StubLoader;

  async load_stub(): Promise<IStub | null> {
    const { default: stub } = await import('./stubs/stub_flasher_32c2.elf');
    return stub;
  }

  async get_pkg_version(): Promise<number> {
    // EFUSE_BLK1, 117, 3, PKG_VERSION
    const word3 = await this.read_efuse(this.EFUSE_BLK1, 3);
    return (word3 >> 21) & 0x07;
  }

  async get_chip_revision(): Promise<number> {
    // FIXME
    return 0;
  }

  async get_chip_description(): Promise<string> {
    const chip_name = {
      0: 'ESP32-C2',
    }[await this.get_pkg_version()] || 'unknown ESP32-C3';

    return chip_name;
  }

}

class ESP32C2StubLoader extends ESP32C2ROM {

  FLASH_WRITE_SIZE = 0x4000;  // matches MAX_WRITE_BLOCK in stub_loader.c
  STATUS_BYTES_LENGTH = 2;  // same as ESP8266, different to ESP32 ROM
  IS_STUB = true;

}
