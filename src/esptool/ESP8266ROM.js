import ESPLoader from './ESPLoader';

export default class ESP8266ROM extends ESPLoader {

  static CHIP_DETECT_MAGIC_VALUE = 0xfff0c101;

  CHIP_NAME = 'ESP8266';
  IS_STUB = false;

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

}
