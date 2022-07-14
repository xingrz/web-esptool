import ESPLoader, { IStub } from './ESPLoader';

export default class ESP8266ROM extends ESPLoader {

  static CHIP_DETECT_MAGIC_VALUE = [0xfff0c101];

  CHIP_NAME = 'ESP8266';

  EFUSE_BASE = 0x3FF00050;
  EFUSE_BLK0 = this.EFUSE_BASE + 0x000;
  EFUSE_BLK1 = this.EFUSE_BASE + 0x004;
  EFUSE_BLK2 = this.EFUSE_BASE + 0x008;
  EFUSE_BLK3 = this.EFUSE_BASE + 0x00C;

  FLASH_SIZES = {
    '512KB': 0x00,
    '256KB': 0x10,
    '1MB': 0x20,
    '2MB': 0x30,
    '4MB': 0x40,
    '2MB-c1': 0x50,
    '4MB-c1': 0x60,
    '8MB': 0x80,
    '16MB': 0x90,
  };

  BOOTLOADER_FLASH_OFFSET = 0;

  STUB_CLASS = ESP8266StubLoader;

  async load_stub(): Promise<IStub | null> {
    const { default: stub } = await import('./stubs/stub_flasher_8266.elf');
    return stub;
  }

  private _get_flash_size(efuses: number[]): number {
    const r0_4 = efuses[0] & (1 << 4);
    const r3_25 = efuses[3] & (1 << 25);
    const r3_26 = efuses[3] & (1 << 26);
    const r3_27 = efuses[3] & (1 << 27);

    if (r0_4 && !r3_25) {
      if (!r3_27 && !r3_26) {
        return 1;
      } else if (!r3_27 && r3_26) {
        return 2;
      }
    }
    if (!r0_4 && r3_25) {
      if (!r3_27 && !r3_26) {
        return 2;
      } else if (!r3_27 && r3_26) {
        return 4;
      }
    }
    return -1;
  }

  async get_chip_description(): Promise<string> {
    const efuses = [
      await this.read_reg(this.EFUSE_BLK0),
      await this.read_reg(this.EFUSE_BLK1),
      await this.read_reg(this.EFUSE_BLK2),
      await this.read_reg(this.EFUSE_BLK3),
    ];

    if ((efuses[0] & (1 << 4)) || (efuses[2] & (1 << 16))) {
      const flash_size = this._get_flash_size(efuses);
      const max_temp = efuses[0] & (1 << 5);
      const chip_name = {
        1: max_temp ? 'ESP8285H08' : 'ESP8285N08',
        2: max_temp ? 'ESP8285H16' : 'ESP8285N16',
      }[flash_size] || 'ESP8285';
      return chip_name;
    } else {
      return 'ESP8266EX';
    }
  }

  get_erase_size(offset: number, size: number): number {
    const sectors_per_block = 16;
    const sector_size = this.FLASH_SECTOR_SIZE;
    const num_sectors = Math.floor((size + sector_size - 1) / sector_size);
    const start_sector = Math.floor(offset / sector_size);

    let head_sectors = sectors_per_block - (start_sector % sectors_per_block);
    if (num_sectors < head_sectors) {
      head_sectors = num_sectors;
    }

    if (num_sectors < 2 * head_sectors) {
      return Math.floor((num_sectors + 1) / 2) * sector_size;
    } else {
      return (num_sectors - head_sectors) * sector_size;
    }
  }

}

class ESP8266StubLoader extends ESP8266ROM {

  FLASH_WRITE_SIZE = 0x4000;  // matches MAX_WRITE_BLOCK in stub_loader.c
  IS_STUB = true;

  get_erase_size(offset: number, size: number): number {
    return size;  // stub doesn't have same size bug as ROM loader
  }

}
