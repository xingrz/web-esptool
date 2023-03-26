import ESP32S2ROM from './ESP32S2ROM';

import type { IESPDevice } from '.';
import type { IStub } from './ESPLoader';

export default class ESP32C6ROM extends ESP32S2ROM {

  // Magic value for ESP32C6
  static CHIP_DETECT_MAGIC_VALUE = [0x2ce0806f];

  CHIP_NAME = 'ESP32-C6';

  EFUSE_BASE = 0x600b0800;
  EFUSE_BLK1 = this.EFUSE_BASE + 0x044;

  STUB_CLASS = ESP32C6StubLoader;

  async load_stub(): Promise<IStub | undefined> {
    const { default: stub } = await import('./stubs/stub_flasher_32c6.json');
    return stub;
  }

  async get_chip_info(): Promise<IESPDevice> {
    const word3 = await this.read_efuse(this.EFUSE_BLK1, 3);

    // EFUSE_BLK1, 125, 3, PKG_VERSION
    const pkg_version = (word3 >> 29) & 0x7;

    // EFUSE_BLK1, 118, 2, WAFER_VERSION_MAJOR
    const major_rev = (word3 >> 22) & 0x3;

    // EFUSE_BLK1, 114, 4, WAFER_VERSION_MINOR
    const minor_rev = (word3 >> 18) & 0xf;

    const chip_name = {
      0: 'ESP32-C6',
    }[pkg_version] || 'unknown ESP32-C6';

    return {
      model: chip_name,
      chip_version_major: major_rev,
      chip_version_minor: minor_rev,
      description: `${chip_name} (revision v${major_rev}.${minor_rev})`,
      mac: await this.read_mac(),
      flash_size: undefined,
      psram_size: undefined,
    };
  }

}

class ESP32C6StubLoader extends ESP32C6ROM {

  FLASH_WRITE_SIZE = 0x4000;  // matches MAX_WRITE_BLOCK in stub_loader.c
  STATUS_BYTES_LENGTH = 2;  // same as ESP8266, different to ESP32 ROM
  IS_STUB = true;

}
