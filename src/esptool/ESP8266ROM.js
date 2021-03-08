import ESPLoader from './ESPLoader';

export default class ESP8266ROM extends ESPLoader {

  static CHIP_DETECT_MAGIC_VALUE = 0xfff0c101;

  CHIP_NAME = 'ESP8266';
  IS_STUB = false;

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

  async get_chip_description() {
    const id0 = await this.read_reg(0x3ff00050);
    const id1 = await this.read_reg(0x3ff00054);
    const id2 = await this.read_reg(0x3ff00058);
    const id3 = await this.read_reg(0x3ff0005c);
    if ((id0 & (1 << 4)) || (id2 & (1 << 16))) {
      return "ESP8285";
    } else {
      return "ESP8266EX";
    }
  }

  get_erase_size(offset, size) {
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

  async flash_spi_attach() {
    await this.flash_begin(0, 0);
  }

}
