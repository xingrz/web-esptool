import { Command } from './cmds';
import SlipReader from './slip';

import sleep from './utils/sleep';
import checksum from './utils/checksum';

const DTR = 'dataTerminalReady';
const RTS = 'requestToSend';

// Device PIDs
const USB_JTAG_SERIAL_PID = 0x1001;

const SECURITY_INFO_BYTES_ESP32S2 = 12;
const SECURITY_INFO_BYTES_ESP32S3_OR_LATER = 20;

interface IResponse {
  val: number;
  data: Buffer;
}

export type IStub = Record<string, string | number>;

export interface ISecurityInfo {
  flags: number;
  flash_crypt_cnt: number;
  key_purposes: Buffer;
  chip_id: number | undefined;
  api_version: number | undefined;
}

export default class ESPLoader {

  static TRACE = false;

  CHIP_NAME = 'Espressif device';
  IS_STUB = false;

  RAM_WRITE_SIZE = 0x1800;
  FLASH_WRITE_SIZE = 0x400;

  // Flash sector size, minimum unit of erase.
  FLASH_SECTOR_SIZE = 0x1000;

  // The number of bytes in the UART response that signify command status
  STATUS_BYTES_LENGTH = 2;

  BOOTLOADER_FLASH_OFFSET = 0;
  FLASH_SIZES: Record<string, number> = {};

  port: SerialPort;
  reader: SlipReader;

  usb_jtag_serial = false;

  STUB_CLASS?: { new(port: SerialPort): ESPLoader };

  constructor(port: SerialPort) {
    this.port = port;
    this.reader = new SlipReader(port);
  }

  start(): void {
    this.reader.start();
  }

  async release(): Promise<void> {
    await this.reader.stop();
  }

  private check({ val, data }: IResponse): number | Buffer {
    if (data.length < this.STATUS_BYTES_LENGTH) {
      throw new Error(`Only got ${data.length} byte status response.`);
    }

    const status_bytes = data.slice(0, this.STATUS_BYTES_LENGTH);
    if (status_bytes[0] != 0) {
      throw new Error(`Command failed: ${status_bytes.toString('hex')}`);
    }

    // if we had more data than just the status bytes, return it as the result
    // (this is used by the md5sum command, maybe other commands ?)
    if (data.length > this.STATUS_BYTES_LENGTH) {
      return data.slice(0, data.length - this.STATUS_BYTES_LENGTH);
    } else {
      // otherwise, just return the 'val' field which comes from the reply header(this is used by read_reg)
      return val;
    }
  }

  async sync(): Promise<number> {
    const data = Buffer.concat([
      Buffer.from([0x07, 0x07, 0x12, 0x20]),
      Buffer.alloc(32, 0x55),
    ]);
    const { val } = await this.reader.command(Command.ESP_SYNC, data);
    return val;
  }

  private async _bootloader_reset(esp32r0_delay = false): Promise<void> {
    // esp32r0_delay is a workaround for bugs with the most common auto reset
    // circuit and Windows, if the EN pin on the dev board does not have
    // enough capacitance.
    //
    // Newer dev boards shouldn't have this problem (higher value capacitor
    // on the EN pin), and ESP32 revision 1 can't use this workaround as it
    // relies on a silicon bug.
    //
    // Details: https://github.com/espressif/esptool/issues/136

    // IO0 = HIGH
    // EN = LOW, chip in reset
    await this.port?.setSignals({ [DTR]: false, [RTS]: true });

    await sleep(100);
    if (esp32r0_delay) {
      // Some chips are more likely to trigger the esp32r0
      // watchdog reset silicon bug if they're held with EN=LOW
      // for a longer period
      await sleep(1200);
    }

    // IO0 = LOW
    // EN = HIGH, chip out of reset
    await this.port?.setSignals({ [DTR]: true, [RTS]: false });

    if (esp32r0_delay) {
      // Sleep longer after reset.
      // This workaround only works on revision 0 ESP32 chips,
      // it exploits a silicon bug spurious watchdog reset.
      await sleep(400);  // allow watchdog reset to occur
    }
    await sleep(50);

    // IO0 = HIGH, done
    await this.port?.setSignals({ [DTR]: false, [RTS]: false });
  }

  private async _bootloader_reset_usb(): Promise<void> {
    // Set IO0
    await this.port?.setSignals({ [DTR]: true, [RTS]: false });

    await sleep(100);

    // Reset. Note dtr/rts calls inverted so we go through (1,1) instead of (0,0)
    await this.port?.setSignals({ [DTR]: false, [RTS]: true });

    await sleep(100);

    // Done
    await this.port?.setSignals({ [DTR]: false, [RTS]: false });
  }

  private async _connect_attempt(esp32r0_delay = false): Promise<boolean> {
    if (this.usb_jtag_serial) {
      await this._bootloader_reset_usb();
    } else {
      await this._bootloader_reset(esp32r0_delay);
    }

    for (let i = 0; i < 5; i++) {
      try {
        await this.sync();
        return true;
      } catch (e) {
        await sleep(50);
      }
    }

    return false;
  }

  async connect(attempts = 7): Promise<boolean> {
    if (this.port?.getInfo()?.usbProductId == USB_JTAG_SERIAL_PID) {
      this.usb_jtag_serial = true;
      console.log('Detected integrated USB Serial/JTAG');
    }

    for (let i = 0; i < attempts; i++) {
      try {
        if (await this._connect_attempt(false)) {
          return true;
        } else if (await this._connect_attempt(true)) {
          return true;
        }
      } catch (e) {
        // ignored
      }
    }

    return false;
  }

  async read_reg(addr: number): Promise<number> {
    const data = Buffer.alloc(4);
    data.writeUInt32LE(addr, 0);
    const { val } = await this.reader.command(Command.ESP_READ_REG, data);
    return val;
  }

  async get_chip_description(): Promise<string> {
    throw new Error('Not supported');
  }

  async get_security_info(): Promise<ISecurityInfo> {
    const res = this.check(await this.reader.command(Command.ESP_GET_SECURITY_INFO)) as Buffer;
    if (!Buffer.isBuffer(res)) {
      throw new Error('Failed getting security info');
    }

    const s2 = res.length == SECURITY_INFO_BYTES_ESP32S2;
    return {
      flags: res.readUInt32LE(0),
      flash_crypt_cnt: res.readUInt8(4),
      key_purposes: res.slice(5, 12),
      chip_id: s2 ? undefined : res.readUInt32LE(12),
      api_version: s2 ? undefined : res.readUInt32LE(16),
    };
  }

  get_erase_size(_offset: number, size: number): number {
    return size;
  }

  async mem_begin(size: number, blocks: number, blocksize: number, offset: number): Promise<void> {
    const data = Buffer.alloc(16);
    data.writeUInt32LE(size, 0);
    data.writeUInt32LE(blocks, 4);
    data.writeUInt32LE(blocksize, 8);
    data.writeUInt32LE(offset, 12);

    this.check(await this.reader.command(Command.ESP_MEM_BEGIN, data, 0, 5000, 1));
  }

  async mem_block(data: Buffer, seq: number): Promise<void> {
    const hdr = Buffer.alloc(16);
    hdr.writeUInt32LE(data.length, 0);
    hdr.writeUInt32LE(seq, 4);
    hdr.writeUInt32LE(0, 8);
    hdr.writeUInt32LE(0, 12);

    const buf = Buffer.concat([hdr, data]);
    this.check(await this.reader.command(Command.ESP_MEM_DATA, buf, checksum(data), 5000, 1));
  }

  async mem_finish(entrypoint = 0): Promise<void> {
    const data = Buffer.alloc(8);
    data.writeUInt32LE(entrypoint == 0 ? 1 : 0, 0);
    data.writeUInt32LE(entrypoint, 4);
    this.check(await this.reader.command(Command.ESP_MEM_END, data, 0, 50, 1));
  }

  async flash_begin(size: number, offset: number): Promise<number> {
    const num_blocks = Math.floor((size + this.FLASH_WRITE_SIZE - 1) / this.FLASH_WRITE_SIZE);
    const erase_size = this.get_erase_size(offset, size);

    const data = Buffer.alloc(16);
    data.writeUInt32LE(erase_size, 0);
    data.writeUInt32LE(num_blocks, 4);
    data.writeUInt32LE(this.FLASH_WRITE_SIZE, 8);
    data.writeUInt32LE(offset, 12);

    this.check(await this.reader.command(Command.ESP_FLASH_BEGIN, data, 0, 5000, 1));

    return num_blocks;
  }

  async flash_block(data: Buffer, seq: number): Promise<void> {
    const hdr = Buffer.alloc(16);
    hdr.writeUInt32LE(data.length, 0);
    hdr.writeUInt32LE(seq, 4);
    hdr.writeUInt32LE(0, 8);
    hdr.writeUInt32LE(0, 12);

    const buf = Buffer.concat([hdr, data]);
    this.check(await this.reader.command(Command.ESP_FLASH_DATA, buf, checksum(data), 5000, 1));
  }

  async flash_finish(reboot = false): Promise<void> {
    const data = Buffer.alloc(4);
    data.writeUInt32LE(reboot ? 0 : 1, 0);
    this.check(await this.reader.command(Command.ESP_FLASH_END, data));
  }

  async flash_defl_begin(size: number, compsize: number, offset: number): Promise<number> {
    const num_blocks = Math.floor((compsize + this.FLASH_WRITE_SIZE - 1) / this.FLASH_WRITE_SIZE);
    const erase_blocks = Math.floor((size + this.FLASH_WRITE_SIZE - 1) / this.FLASH_WRITE_SIZE);

    const write_size = this.IS_STUB
      ? size  // stub expects number of bytes here, manages erasing internally
      : erase_blocks * this.FLASH_WRITE_SIZE; // ROM expects rounded up to erase block size

    console.log(`Comporessed ${size} bytes to ${compsize}...`);

    const data = Buffer.alloc(16);
    data.writeUInt32LE(write_size, 0);
    data.writeUInt32LE(num_blocks, 4);
    data.writeUInt32LE(this.FLASH_WRITE_SIZE, 8);
    data.writeUInt32LE(offset, 12);

    this.check(await this.reader.command(Command.ESP_FLASH_DEFL_BEGIN, data, 0, 5000, 1));

    return num_blocks;
  }

  async flash_defl_block(data: Buffer, seq: number): Promise<void> {
    const hdr = Buffer.alloc(16);
    hdr.writeUInt32LE(data.length, 0);
    hdr.writeUInt32LE(seq, 4);
    hdr.writeUInt32LE(0, 8);
    hdr.writeUInt32LE(0, 12);

    const buf = Buffer.concat([hdr, data]);
    this.check(await this.reader.command(Command.ESP_FLASH_DEFL_DATA, buf, checksum(data), 5000, 1));
  }

  async flash_defl_finish(reboot = false): Promise<void> {
    const data = Buffer.alloc(4);
    data.writeUInt32LE(reboot ? 0 : 1, 0);
    this.check(await this.reader.command(Command.ESP_FLASH_DEFL_END, data));
  }

  async load_stub(): Promise<IStub | null> {
    return null;
  }

  async change_baud(baud: number, oldBaud: number): Promise<void> {
    console.log(`Changing baud rate from ${oldBaud} to ${baud}`);
    const data = Buffer.alloc(8);
    data.writeUInt32LE(baud, 0);
    data.writeUInt32LE(this.IS_STUB ? oldBaud : 0, 4);  // stub takes the new baud rate and the old one
    await this.reader.command(Command.ESP_CHANGE_BAUDRATE, data);
    console.log('Changed.');
  }

  async hard_reset(): Promise<void> {
    await this.port?.setSignals({ [DTR]: false, [RTS]: true });  // EN->LOW
    await sleep(100);
    await this.port?.setSignals({ [DTR]: false, [RTS]: false });
  }

}
