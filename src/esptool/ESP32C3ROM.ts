import { IESPDevice } from '.';
import { IStub } from './ESPLoader';
import ESP32S2ROM from './ESP32S2ROM';

export default class ESP32C3ROM extends ESP32S2ROM {

  // Magic value for ESP32C3 eco 1+2 and ESP32C3 eco3 respectivly
  static CHIP_DETECT_MAGIC_VALUE = [0x6921506f, 0x1b31506f];

  CHIP_NAME = 'ESP32-C3';

  EFUSE_BASE = 0x60008800;
  EFUSE_BLK1 = this.EFUSE_BASE + 0x044;

  STUB_CLASS = ESP32C3StubLoader;

  async load_stub(): Promise<IStub | null> {
    const { default: stub } = await import('./stubs/stub_flasher_32c3.elf');
    return stub;
  }

  async get_chip_info(): Promise<IESPDevice> {
    const word3 = await this.read_efuse(this.EFUSE_BLK1, 3);

    // EFUSE_BLK1, 117, 3, PKG_VERSION
    const pkg_version = (word3 >> 21) & 0x07;

    // EFUSE_BLK1, 114, 3, WAFER_VERSION
    const chip_revision = (word3 >> 18) & 0x07;

    const chip_name = {
      0: 'ESP32-C3',
    }[pkg_version] || 'unknown ESP32-C3';

    return {
      model: chip_name,
      revision: chip_revision,
      description: `${chip_name} (revision ${chip_revision})`,
      mac: await this.read_mac(),
      flash_size: undefined,
      psram_size: undefined,
    };
  }

}

class ESP32C3StubLoader extends ESP32C3ROM {

  FLASH_WRITE_SIZE = 0x4000;  // matches MAX_WRITE_BLOCK in stub_loader.c
  STATUS_BYTES_LENGTH = 2;  // same as ESP8266, different to ESP32 ROM
  IS_STUB = true;

}
