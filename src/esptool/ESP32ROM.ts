import ESPLoader from './ESPLoader';

import formatMAC from './utils/formatMAC';

import type { IESPDevice } from '.';
import type { IStub } from './ESPLoader';

export default class ESP32ROM extends ESPLoader {

  static CHIP_DETECT_MAGIC_VALUE = [0x00f01d83];

  CHIP_NAME = 'ESP32';

  // ESP32 uses a 4 byte status reply
  STATUS_BYTES_LENGTH = 4;

  EFUSE_BASE = 0x3FF5A000;
  EFUSE_BLK0 = this.EFUSE_BASE;

  SYSCON_BASE = 0x3FF66000;
  SYSCON_DATE = this.SYSCON_BASE + 0x7C;

  FLASH_SIZES = {
    '1MB': 0x00,
    '2MB': 0x10,
    '4MB': 0x20,
    '8MB': 0x30,
    '16MB': 0x40,
    '32MB': 0x50,
    '64MB': 0x60,
    '128MB': 0x70,
  };

  BOOTLOADER_FLASH_OFFSET = 0x1000;

  STUB_CLASS = ESP32StubLoader;

  async load_stub(): Promise<IStub | undefined> {
    const { default: stub } = await import('./stubs/stub_flasher_32.json');
    return stub;
  }

  async read_efuse(block: number, n: number): Promise<number> {
    return await this.read_reg(block + (4 * n));
  }

  async read_mac(): Promise<string | undefined> {
    const word1 = await this.read_efuse(this.EFUSE_BLK0, 1);
    const word2 = await this.read_efuse(this.EFUSE_BLK0, 2);

    // EFUSE_BLK0, 72, 8, Factory MAC addr [0]
    // EFUSE_BLK0, 64, 8, Factory MAC addr [1]
    // EFUSE_BLK0, 56, 8, Factory MAC addr [2]
    // EFUSE_BLK0, 48, 8, Factory MAC addr [3]
    // EFUSE_BLK0, 40, 8, Factory MAC addr [4]
    // EFUSE_BLK0, 32, 8, Factory MAC addr [5]
    return formatMAC([
      (word2 >> 8) & 0xff,
      (word2 >> 0) & 0xff,
      (word1 >> 24) & 0xff,
      (word1 >> 16) & 0xff,
      (word1 >> 8) & 0xff,
      (word1 >> 0) & 0xff,
    ]);
  }

  async get_chip_info(): Promise<IESPDevice> {
    const word3 = await this.read_efuse(this.EFUSE_BLK0, 3);
    const word5 = await this.read_efuse(this.EFUSE_BLK0, 5);

    // EFUSE_BLK0,  98, 1, EFUSE_RD_CHIP_VER_PKG_4BIT most significant bit
    // EFUSE_BLK0, 105, 3, EFUSE_RD_CHIP_VER_PKG least significant bits
    const pkg_version = (((word3 >> 2) & 0x1) << 3) | ((word3 >> 9) & 0x7);

    const major_rev = await (async () => {
      const syscon_date = await this.read_reg(this.SYSCON_DATE);

      // EFUSE_BLK0, 111, 1, EFUSE_RD_CHIP_VER_REV1
      // EFUSE_BLK0, 180, 1, EFUSE_RD_CHIP_VER_REV2
      const rev_bit0 = (word3 >> 15) & 0x1;
      const rev_bit1 = (word5 >> 20) & 0x1;
      const rev_bit2 = (syscon_date >> 31) & 0x1;

      return {
        0: 0,
        1: 1,
        3: 2,
        7: 3,
      }[(rev_bit2 << 2) | (rev_bit1 << 1) | rev_bit0] || 0;
    })();

    // EFUSE_BLK0, 184, 2, WAFER_VERSION_MINOR
    const minor_rev = (word5 >> 24) & 0x3;

    const rev3 = (major_rev == 3);

    // EFUSE_BLK0, 96, 1, FUSE_RD_CHIP_VER_DIS_APP_CPU
    const single_core = (word3 >> 0) & 0x1;

    const chip_name = [
      single_core ? 'ESP32-S0WDQ6' : (rev3 ? 'ESP32-D0WDQ6-V3' : 'ESP32-D0WDQ6'),
      single_core ? 'ESP32-S0WD' : (rev3 ? 'ESP32-D0WD-V3' : 'ESP32-D0WD'),
      'ESP32-D2WD',
      undefined,
      'ESP32-U4WDH',
      rev3 ? 'ESP32-PICO-V3' : 'ESP32-PICO-D4',
      'ESP32-PICO-V3-02',
      'ESP32-D0WDR2-V3',
    ][pkg_version] || 'unknown ESP32';

    const flash_size = {
      'ESP32-U4WDH': 4,
      'ESP32-PICO-V3': 4,
      'ESP32-PICO-V3-02': 8,
      'ESP32-PICO-D4': 4,
    }[chip_name];

    const psram_size = {
      'ESP32-PICO-V3-02': 2,
    }[chip_name];

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

class ESP32StubLoader extends ESP32ROM {

  FLASH_WRITE_SIZE = 0x4000;  // matches MAX_WRITE_BLOCK in stub_loader.c
  STATUS_BYTES_LENGTH = 2;  // same as ESP8266, different to ESP32 ROM
  IS_STUB = true;

}
