import { IESPDevice } from '.';
import { IStub } from './ESPLoader';
import ESP32C3ROM from './ESP32C3ROM';

export default class ESP32C2ROM extends ESP32C3ROM {

  // Magic value for ESP32C2 ECO0 and ECO1 respectively
  static CHIP_DETECT_MAGIC_VALUE = [0x6f51306f, 0x7c41a06f];

  CHIP_NAME = 'ESP32-C2';

  EFUSE_BASE = 0x60008800;
  EFUSE_BLK2 = this.EFUSE_BASE + 0x040;

  STUB_CLASS = ESP32C2StubLoader;

  async load_stub(): Promise<IStub | null> {
    const { default: stub } = await import('./stubs/stub_flasher_32c2.elf');
    return stub;
  }

  async get_chip_info(): Promise<IESPDevice> {
    const word1 = await this.read_efuse(this.EFUSE_BLK2, 1);

    // EFUSE_BLK2, 54, 3, PKG_VERSION
    // const pkg_version = (word1 >> 22) & 0x07;

    // FIXME: bit pos of this field is inconsistent between ESP-IDF, espefuse
    // and esptool. Review it in the future.
    const pkg_version = 0;

    const si = await this.get_security_info();
    const chip_revision = si.api_version!;

    const chip_name = {
      0: 'ESP32-C2',
    }[pkg_version] || 'unknown ESP32-C2';

    return {
      model: chip_name,
      revision: chip_revision,
      description: `${chip_name} (revision ${chip_revision})`,
      psram_size: undefined,
    };
  }

}

class ESP32C2StubLoader extends ESP32C2ROM {

  FLASH_WRITE_SIZE = 0x4000;  // matches MAX_WRITE_BLOCK in stub_loader.c
  STATUS_BYTES_LENGTH = 2;  // same as ESP8266, different to ESP32 ROM
  IS_STUB = true;

}
