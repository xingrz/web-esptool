import ESP32ROM from './ESP32ROM';
import ESP32C3Stub from './stubs/ESP32C3Stub';

export default class ESP32C3ROM extends ESP32ROM {

  // Magic value for ESP32C3 eco 1+2 and ESP32C3 eco3 respectivly
  static CHIP_DETECT_MAGIC_VALUE = [0x6921506f, 0x1b31506f];

  CHIP_NAME = 'ESP32-C3';

  EFUSE_BASE = 0x60008800;
  EFUSE_BLK0 = this.EFUSE_BASE + 0x030;
  EFUSE_BLK1 = this.EFUSE_BASE + 0x044;

  STUB_CLASS = ESP32C3StubLoader;
  STUB_CODE = ESP32C3Stub;

  async get_pkg_version(): Promise<number> {
    // EFUSE_BLK1, 117, 3, PKG_VERSION
    const word3 = await this.read_efuse(this.EFUSE_BLK1, 3);
    return (word3 >> 21) & 0x07;
  }

  async get_chip_revision(): Promise<number> {
    // EFUSE_BLK1, 114, 3, WAFER_VERSION
    const word3 = await this.read_efuse(this.EFUSE_BLK1, 3);
    return (word3 >> 18) & 0x07;
  }

  async get_chip_description(): Promise<string> {
    const chip_name = {
      0: 'ESP32-C3',
    }[await this.get_pkg_version()] || 'unknown ESP32-C3';

    const chip_revision = await this.get_chip_revision();

    return `${chip_name} (revision ${chip_revision})`;
  }

}

class ESP32C3StubLoader extends ESP32C3ROM {

  FLASH_WRITE_SIZE = 0x4000;  // matches MAX_WRITE_BLOCK in stub_loader.c
  STATUS_BYTES_LENGTH = 2;  // same as ESP8266, different to ESP32 ROM
  IS_STUB = true;

}
