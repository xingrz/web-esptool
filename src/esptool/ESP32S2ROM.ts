import ESP32ROM from './ESP32ROM';
import ESP32S2Stub from './stubs/stub_flasher_32s2.elf';

export default class ESP32S2ROM extends ESP32ROM {

  static CHIP_DETECT_MAGIC_VALUE = [0x000007c6];

  CHIP_NAME = 'ESP32-S2';

  EFUSE_BASE = 0x3f41A000;
  EFUSE_BLK0 = this.EFUSE_BASE + 0x030;
  EFUSE_BLK1 = this.EFUSE_BASE + 0x044;

  STUB_CLASS = ESP32S2StubLoader;
  STUB_CODE = ESP32S2Stub;

  async get_pkg_version(): Promise<number> {
    // EFUSE_BLK1, 117, 4, PKG_VERSION
    const word3 = await this.read_efuse(this.EFUSE_BLK1, 3);
    return (word3 >> 21) & 0x0F;
  }

  async get_chip_description(): Promise<string> {
    return {
      0: 'ESP32-S2',
      1: 'ESP32-S2FH16',
      2: 'ESP32-S2FH32',
    }[await this.get_pkg_version()] || 'unknown ESP32-S2';
  }

}

class ESP32S2StubLoader extends ESP32S2ROM {

  FLASH_WRITE_SIZE = 0x4000;  // matches MAX_WRITE_BLOCK in stub_loader.c
  STATUS_BYTES_LENGTH = 2;  // same as ESP8266, different to ESP32 ROM
  IS_STUB = true;

}
