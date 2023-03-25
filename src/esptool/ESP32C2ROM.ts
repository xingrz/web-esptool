import ESP32C3ROM from './ESP32C3ROM';

import formatMAC from './utils/formatMAC';

import type { IESPDevice } from '.';
import type { IStub } from './ESPLoader';

export default class ESP32C2ROM extends ESP32C3ROM {

  // Magic value for ESP32C2 ECO0 and ECO1 respectively
  static CHIP_DETECT_MAGIC_VALUE = [0x6f51306f, 0x7c41a06f];

  CHIP_NAME = 'ESP32-C2';

  EFUSE_BASE = 0x60008800;
  EFUSE_BLK2 = this.EFUSE_BASE + 0x040;

  STUB_CLASS = ESP32C2StubLoader;

  async load_stub(): Promise<IStub | undefined> {
    const { default: stub } = await import('./stubs/stub_flasher_32c2.json');
    return stub;
  }

  async read_mac(): Promise<string | undefined> {
    const word0 = await this.read_efuse(this.EFUSE_BLK2, 0);
    const word1 = await this.read_efuse(this.EFUSE_BLK2, 1);

    // EFUSE_BLK2, 40, 8, Factory MAC addr [0]
    // EFUSE_BLK2, 32, 8, Factory MAC addr [1]
    // EFUSE_BLK2, 24, 8, Factory MAC addr [2]
    // EFUSE_BLK2, 16, 8, Factory MAC addr [3]
    // EFUSE_BLK2, 8, 8, Factory MAC addr [4]
    // EFUSE_BLK2, 0, 8, Factory MAC addr [5]
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
    const word1 = await this.read_efuse(this.EFUSE_BLK2, 1);

    // EFUSE_BLK2, 54, 3, PKG_VERSION
    const pkg_version = (word1 >> 22) & 0x7;

    // EFUSE_BLK2, 52, 2, WAFER_VERSION_MAJOR
    const major_rev = (word1 >> 20) & 0x3;

    // EFUSE_BLK2, 48, 4, WAFER_VERSION_MINOR
    const minor_rev = (word1 >> 16) & 0xf;

    const chip_name = {
      0: 'ESP32-C2',
      1: 'ESP32-C2',
    }[pkg_version] || 'unknown ESP32-C2';

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

class ESP32C2StubLoader extends ESP32C2ROM {

  FLASH_WRITE_SIZE = 0x4000;  // matches MAX_WRITE_BLOCK in stub_loader.c
  STATUS_BYTES_LENGTH = 2;  // same as ESP8266, different to ESP32 ROM
  IS_STUB = true;

}
