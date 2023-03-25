import ESP32ROM from './ESP32ROM';

import formatMAC from './utils/formatMAC';

import type { IESPDevice } from '.';
import type { IStub } from './ESPLoader';

export default class ESP32S2ROM extends ESP32ROM {

  static CHIP_DETECT_MAGIC_VALUE = [0x000007c6];

  CHIP_NAME = 'ESP32-S2';

  EFUSE_BASE = 0x3F41A000;
  EFUSE_BLK1 = this.EFUSE_BASE + 0x044;

  STUB_CLASS = ESP32S2StubLoader;

  async load_stub(): Promise<IStub | undefined> {
    const { default: stub } = await import('./stubs/stub_flasher_32s2.json');
    return stub;
  }

  async read_mac(): Promise<string | undefined> {
    const word0 = await this.read_efuse(this.EFUSE_BLK1, 0);
    const word1 = await this.read_efuse(this.EFUSE_BLK1, 1);

    // EFUSE_BLK1, 40, 8, Factory MAC addr [0]
    // EFUSE_BLK1, 32, 8, Factory MAC addr [1]
    // EFUSE_BLK1, 24, 8, Factory MAC addr [2]
    // EFUSE_BLK1, 16, 8, Factory MAC addr [3]
    // EFUSE_BLK1, 8, 8, Factory MAC addr [4]
    // EFUSE_BLK1, 0, 8, Factory MAC addr [5]
    return formatMAC([
      (word1 >> 8) & 0xff,
      (word1 >> 0) & 0xff,
      (word0 >> 24) & 0xff,
      (word0 >> 16) & 0xff,
      (word0 >> 8) & 0xff,
      (word0 >> 0) & 0xff,
    ]);
  }

  async get_chip_info(): Promise<IESPDevice> {
    const word3 = await this.read_efuse(this.EFUSE_BLK1, 3);
    const word4 = await this.read_efuse(this.EFUSE_BLK1, 4);

    // EFUSE_BLK1, 114, 2, WAFER_VERSION_MAJOR
    const major_rev = (word3 >> 18) & 0x3;

    // EFUSE_BLK1, 116, 1, WAFER_VERSION_MINOR msb
    // EFUSE_BLK1, 132, 3, WAFER_VERSION_MINOR lsb
    const minor_rev = (((word3 >> 20) & 0x1) << 3) | ((word4 >> 4) & 0x7);

    // EFUSE_BLK1, 117, 4, FLASH_VERSION
    const flash_version = (word3 >> 21) & 0xf;

    // EFUSE_BLK1, 124, 4, PSRAM_VERSION
    const psram_version = (word3 >> 28) & 0xf;

    const chip_name = [
      ['ESP32-S2', 'ESP32-S2R2'],
      ['ESP32-S2FH2', undefined],
      ['ESP32-S2FH4', 'ESP32-S2FN4R2'],
    ][flash_version]?.[psram_version] || 'unknown ESP32-S2';

    const flash_size = [undefined, 2, 4][flash_version];
    const psram_size = [undefined, 2][psram_version];

    return {
      model: chip_name,
      chip_version_major: major_rev,
      chip_version_minor: minor_rev,
      description: `${chip_name} (revision v${major_rev}.${minor_rev})`,
      mac: await this.read_mac(),
      flash_size: flash_size,
      psram_size: psram_size,
    };
  }

}

class ESP32S2StubLoader extends ESP32S2ROM {

  FLASH_WRITE_SIZE = 0x4000;  // matches MAX_WRITE_BLOCK in stub_loader.c
  STATUS_BYTES_LENGTH = 2;  // same as ESP8266, different to ESP32 ROM
  IS_STUB = true;

}
