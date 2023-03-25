import ESP32S2ROM from './ESP32S2ROM';

import type { IESPDevice } from '.';
import type { IStub } from './ESPLoader';

export default class ESP32S3ROM extends ESP32S2ROM {

  static CHIP_DETECT_MAGIC_VALUE = [0x9];

  CHIP_NAME = 'ESP32-S3';

  EFUSE_BASE = 0x60007000;
  EFUSE_BLK1 = this.EFUSE_BASE + 0x044;
  EFUSE_BLK2 = this.EFUSE_BASE + 0x05C;

  STUB_CLASS = ESP32S3StubLoader;

  async load_stub(): Promise<IStub | undefined> {
    const { default: stub } = await import('./stubs/stub_flasher_32s3.json');
    return stub;
  }

  async get_chip_info(): Promise<IESPDevice> {
    const word1_3 = await this.read_efuse(this.EFUSE_BLK1, 3);
    const word1_5 = await this.read_efuse(this.EFUSE_BLK1, 5);
    const word2_4 = await this.read_efuse(this.EFUSE_BLK2, 4);

    // EFUSE_BLK1, 184, 2, WAFER_VERSION_MAJOR
    const raw_major_rev = (word1_5 >> 24) & 0x3;

    // EFUSE_BLK1, 183, 1, WAFER_VERSION_MINOR msb
    // EFUSE_BLK1, 114, 3, WAFER_VERSION_MINOR lsb
    const raw_minor_rev = (((word1_5 >> 23) & 0x1) << 3) | ((word1_3 >> 18) & 0x7);

    // EFUSE_BLK2, 128, 2, BLK_VERSION_MAJOR
    const blk_major_rev = (word2_4 >> 0) & 0x3;

    // EFUSE_BLK1, 120, 3, BLK_VERSION_MINOR
    const blk_minor_rev = (word1_3 >> 24) & 0x7;

    // Workaround: The major version field was allocated to other purposes
    // when block version is v1.1.
    // Luckily only chip v0.0 have this kind of block version and efuse usage.
    const is_eco0 = (raw_minor_rev & 0x7) == 0
      && blk_major_rev == 1
      && blk_minor_rev == 1;

    const major_rev = is_eco0 ? 0 : raw_major_rev;
    const minor_rev = is_eco0 ? 0 : raw_minor_rev;

    return {
      model: 'ESP32-S3',
      chip_version_major: major_rev,
      chip_version_minor: minor_rev,
      description: `${this.CHIP_NAME} (revision v${major_rev}.${minor_rev})`,
      mac: await this.read_mac(),
      flash_size: undefined,
      psram_size: undefined,
    };
  }

}

class ESP32S3StubLoader extends ESP32S3ROM {

  FLASH_WRITE_SIZE = 0x4000;  // matches MAX_WRITE_BLOCK in stub_loader.c
  STATUS_BYTES_LENGTH = 2;  // same as ESP8266, different to ESP32 ROM
  IS_STUB = true;

}
