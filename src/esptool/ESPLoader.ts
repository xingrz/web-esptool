import { promisify } from 'util';
import { unzip } from 'zlib';
import SerialPort from '@serialport/stream';
import hex from './utils/hex';
import once from './utils/once';
import sleep from './utils/sleep';
import pack from './utils/pack';
import unpack from './utils/unpack';
import { set, update } from './utils/serial';
import { IFlashArgs } from './';

const unzipAsync = promisify(unzip);

interface IResponse {
  val: number;
  data: Buffer;
}

export interface IStub {
  text: string;
  text_start: number;
  entry: number;
  data: string;
  data_start: number;
}

export interface IFlashProgress {
  index: number;
  blocks_written: number;
  blocks_total: number;
}

export default class ESPLoader {

  static TRACE = false;

  // This ROM address has a different value on each chip model
  static CHIP_DETECT_MAGIC_REG_ADDR = 0x40001000;

  CHIP_NAME = 'Espressif device';
  IS_STUB = false;

  // Commands supported by ESP8266 ROM bootloader
  ESP_FLASH_BEGIN = 0x02;
  ESP_FLASH_DATA = 0x03;
  ESP_FLASH_END = 0x04;
  ESP_MEM_BEGIN = 0x05;
  ESP_MEM_END = 0x06;
  ESP_MEM_DATA = 0x07;
  ESP_SYNC = 0x08;
  ESP_READ_REG = 0x0A;

  // Some comands supported by ESP32 ROM bootloader(or -8266 w / stub)
  ESP_SPI_ATTACH = 0x0D;
  ESP_CHANGE_BAUDRATE = 0x0F;

  // Maximum block sized for RAM and Flash writes, respectively.
  ESP_RAM_BLOCK = 0x1800;

  FLASH_WRITE_SIZE = 0x400;

  //First byte of the application image
  ESP_IMAGE_MAGIC = 0xe9;

  // Initial state for the checksum routine
  ESP_CHECKSUM_MAGIC = 0xef;

  // Flash sector size, minimum unit of erase.
  FLASH_SECTOR_SIZE = 0x1000;

  // The number of bytes in the UART response that signify command status
  STATUS_BYTES_LENGTH = 2;

  BOOTLOADER_FLASH_OFFSET = 0;
  FLASH_SIZES: Record<string, number> = {};

  port: SerialPort;
  queue: Buffer;

  STUB_CODE?: IStub;
  STUB_CLASS?: { new(port: SerialPort): ESPLoader };

  private _trace: (text?: string) => void;

  constructor(port: SerialPort) {
    this._on_data = this._on_data.bind(this);

    this.port = port;
    this.port.on('data', this._on_data);

    this.queue = Buffer.alloc(0);

    this._trace = ESPLoader.TRACE
      ? (text) => console.log(`%cTRACE ${text}`, 'color: darkcyan')
      : () => null;
  }

  release(): void {
    this.port.removeListener('data', this._on_data);
  }

  _on_data(data: Buffer): void {
    this._trace(`Read ${data.length} bytes: ${data.toString('hex')}`);
    const { queue, packets } = unpack(this.queue, data);
    this.queue = queue;
    for (const packet of packets) {
      this._dispatch(packet);
    }
  }

  _write(data: Buffer): void {
    data = pack(data);
    this._trace(`Write ${data.length} bytes: ${data.toString('hex')}`);
    this.port.write(data);
  }

  _dispatch(data: Buffer): void {
    if (data.length < 8) return;
    if (data[0] != 0x01) return;
    const op = data[1];
    const size = data.readUInt16LE(2);
    const val = data.readUInt32LE(4);
    data = data.slice(8);

    this._trace(`< res op=${hex(op)} len=${size} val=${val} data=${data.toString('hex')}`);

    this.port.emit(`res:${op}`, { val, data } as IResponse);
  }

  async command(op: number, data: Buffer, chk = 0, timeout = 500, tries = 5): Promise<IResponse> {
    this._trace(`> req op=${hex(op)} len=${data.length} data=${data.toString('hex')}`);

    const hdr = Buffer.alloc(8);
    hdr[0] = 0x00;
    hdr[1] = op;
    hdr.writeUInt16LE(data.length, 2);
    hdr.writeUInt32LE(chk, 4);
    const out = Buffer.concat([hdr, data]);
    for (let i = 0; i < tries; i++) {
      try {
        this._write(out);
        return await once(this.port, `res:${op}`, timeout) as IResponse;
      } catch (e) {
        // ignored
      }
    }
    throw new Error('Timeout waiting for command response');
  }

  check({ val, data }: IResponse): number | Buffer {
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
      return data.slice(this.STATUS_BYTES_LENGTH);
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
    const { val } = await this.command(this.ESP_SYNC, data);
    return val;
  }

  async _connect_attempt(esp32r0_delay = false): Promise<boolean> {
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
    await set(this.port, { dtr: false, rts: true });

    await sleep(100);
    if (esp32r0_delay) {
      // Some chips are more likely to trigger the esp32r0
      // watchdog reset silicon bug if they're held with EN=LOW
      // for a longer period
      await sleep(1200);
    }

    // IO0 = LOW
    // EN = HIGH, chip out of reset
    await set(this.port, { dtr: true, rts: false });

    if (esp32r0_delay) {
      // Sleep longer after reset.
      // This workaround only works on revision 0 ESP32 chips,
      // it exploits a silicon bug spurious watchdog reset.
      await sleep(400);  // allow watchdog reset to occur
    }
    await sleep(50);

    // IO0 = HIGH, done
    await set(this.port, { dtr: false, rts: false });

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
    const { val } = await this.command(this.ESP_READ_REG, data);
    return val;
  }

  async get_chip_description(): Promise<string> {
    throw new Error('Not supported');
  }

  get_erase_size(offset: number, size: number): number {
    return size;
  }

  async flash_spi_attach(hspi_arg: number): Promise<void> {
    hspi_arg;
    throw new Error('Not supported');
  }

  _checksum(data: Buffer): number {
    let state = this.ESP_CHECKSUM_MAGIC;
    for (const b of data) {
      state ^= b;
    }
    return state;
  }

  async mem_begin(size: number, blocks: number, blocksize: number, offset: number): Promise<void> {
    const data = Buffer.alloc(16);
    data.writeUInt32LE(size, 0);
    data.writeUInt32LE(blocks, 4);
    data.writeUInt32LE(blocksize, 8);
    data.writeUInt32LE(offset, 12);

    this.check(await this.command(this.ESP_MEM_BEGIN, data, 0, 5000, 1));
  }

  async mem_block(data: Buffer, seq: number): Promise<void> {
    const hdr = Buffer.alloc(16);
    hdr.writeUInt32LE(data.length, 0);
    hdr.writeUInt32LE(seq, 4);
    hdr.writeUInt32LE(0, 8);
    hdr.writeUInt32LE(0, 12);

    const buf = Buffer.concat([hdr, data]);
    this.check(await this.command(this.ESP_MEM_DATA, buf, this._checksum(data), 5000, 1));
  }

  async mem_finish(entrypoint = 0): Promise<void> {
    const data = Buffer.alloc(8);
    data.writeUInt32LE(entrypoint == 0 ? 1 : 0, 0);
    data.writeUInt32LE(entrypoint, 4);
    this.check(await this.command(this.ESP_MEM_END, data, 0, 50, 1));
  }

  async flash_begin(size: number, offset: number): Promise<number> {
    const num_blocks = Math.floor((size + this.FLASH_WRITE_SIZE - 1) / this.FLASH_WRITE_SIZE);
    const erase_size = this.get_erase_size(offset, size);

    const data = Buffer.alloc(16);
    data.writeUInt32LE(erase_size, 0);
    data.writeUInt32LE(num_blocks, 4);
    data.writeUInt32LE(this.FLASH_WRITE_SIZE, 8);
    data.writeUInt32LE(offset, 12);

    this.check(await this.command(this.ESP_FLASH_BEGIN, data, 0, 5000, 1));

    return num_blocks;
  }

  async flash_block(data: Buffer, seq: number): Promise<void> {
    const hdr = Buffer.alloc(16);
    hdr.writeUInt32LE(data.length, 0);
    hdr.writeUInt32LE(seq, 4);
    hdr.writeUInt32LE(0, 8);
    hdr.writeUInt32LE(0, 12);

    const buf = Buffer.concat([hdr, data]);
    this.check(await this.command(this.ESP_FLASH_DATA, buf, this._checksum(data), 5000, 1));
  }

  async flash_finish(reboot = false): Promise<void> {
    const data = Buffer.alloc(4);
    data.writeUInt32LE(reboot ? 0 : 1, 0);
    this.check(await this.command(this.ESP_FLASH_END, data));
  }

  _pad_image(data: Buffer, alignment: number, pad_character = 0xFF): Buffer {
    const pad_mod = data.length % alignment;
    if (pad_mod != 0) {
      data = Buffer.concat([data, Buffer.alloc(pad_mod, pad_character)]);
    }
    return data;
  }

  _parse_flash_size_arg(arg: string): number {
    if (this.FLASH_SIZES[arg]) {
      return this.FLASH_SIZES[arg];
    } else {
      const sizes = Object.keys(this.FLASH_SIZES).join(', ');
      throw new Error(`Flash size '${arg}' is not supported by this chip type. Supported sizes: ${sizes}`);
    }
  }

  async run_stub(): Promise<ESPLoader> {
    const stub = this.STUB_CODE as unknown as Record<string, string | number>;

    console.log('Uploading stub...');
    for (const field of ['text', 'data']) {
      if (!stub[field]) continue;
      const offs = stub[`${field}_start`] as number;
      const code = await unzipAsync(Buffer.from(stub[field] as string, 'base64'));
      const blocks = Math.floor((code.length + this.ESP_RAM_BLOCK - 1) / this.ESP_RAM_BLOCK);
      await this.mem_begin(code.length, blocks, this.ESP_RAM_BLOCK, offs);
      for (let seq = 0; seq < blocks; seq++) {
        const from_offs = seq * this.ESP_RAM_BLOCK;
        const to_offs = from_offs + this.ESP_RAM_BLOCK;
        await this.mem_block(code.slice(from_offs, to_offs), seq);
      }
    }

    console.log('Running stub...');
    await this.mem_finish(stub['entry'] as number);
    await sleep(500);

    console.log('Stub running...');
    return new this.STUB_CLASS!(this.port);
  }

  async change_baud(baud: number): Promise<void> {
    console.log(`Changing baud rate to ${baud}`);
    const data = Buffer.alloc(8);
    data.writeUInt32LE(baud, 0);
    data.writeUInt32LE(this.IS_STUB ? this.port.baudRate : 0, 4);  // stub takes the new baud rate and the old one
    await this.command(this.ESP_CHANGE_BAUDRATE, data);
    console.log('Changed.');
    await update(this.port, { baudRate: baud });
    await sleep(50);  // get rid of crap sent during baud rate change
  }

  _update_image_flash_params(address: number, args: IFlashArgs, image: Buffer): Buffer {
    if (address != this.BOOTLOADER_FLASH_OFFSET) {
      return image;  // not flashing bootloader offset, so don't modify this
    }

    const magic = image[0];
    let flash_mode = image[2];
    let flash_freq = image[3] & 0x0F;
    let flash_size = image[3] & 0xF0;

    if (magic != this.ESP_IMAGE_MAGIC) {
      console.warn(`Warning: Image file at ${address} doesn't look like an image file, so not changing any flash settings.`);
      return image;
    }

    // TODO: verify bootloader image

    if (args.flashMode && args.flashMode != 'keep') {
      flash_mode = { 'qio': 0, 'qout': 1, 'dio': 2, 'dout': 3 }[args.flashMode]!;
    }

    if (args.flashFreq && args.flashFreq != 'keep') {
      flash_freq = { '40m': 0, '26m': 1, '20m': 2, '80m': 0xf }[args.flashFreq]!;
    }

    if (args.flashSize && args.flashSize != 'keep') {
      flash_size = this._parse_flash_size_arg(args.flashSize);
    }

    image[2] = flash_mode;
    image[3] = flash_freq | flash_size;

    return image;
  }

  async flash(args: IFlashArgs, onProgress: (progress: IFlashProgress) => void): Promise<void> {
    for (let i = 0; i < args.partitions.length; i++) {
      const { address } = args.partitions[i];
      let { image } = args.partitions[i];
      console.log(`Part ${i}: address=${hex(address, 4)} size=${image.length}`);

      image = this._pad_image(image, 4);
      if (image.length == 0) {
        console.warn(`Skipped empty part ${i} address=${hex(address, 4)}`);
        continue;
      }

      image = this._update_image_flash_params(address, args, image);

      const blocks = await this.flash_begin(image.length, address);

      let seq = 0;
      let written = 0;
      while (image.length > 0) {
        console.log(`Writing at ${hex(address + seq * this.FLASH_WRITE_SIZE, 4)}... (${Math.round((seq + 1) / blocks * 100)}%)`);
        const block = image.slice(0, this.FLASH_WRITE_SIZE);
        await this.flash_block(block, seq);
        image = image.slice(this.FLASH_WRITE_SIZE);
        seq += 1
        written += block.length;
        onProgress({ index: i, blocks_written: seq + 1, blocks_total: blocks });
      }

      if (this.IS_STUB) {
        // Stub only writes each block to flash after 'ack'ing the receive, so do a final dummy operation which will
        // not be 'ack'ed until the last block has actually been written out to flash
        await this.read_reg(ESPLoader.CHIP_DETECT_MAGIC_REG_ADDR);
      }

      console.log(`Wrote ${written} bytes`);
    }

    console.log('Leaving...');

    if (this.IS_STUB) {
      // skip sending flash_finish to ROM loader here,
      // as it causes the loader to exit and run user code
      await this.flash_begin(0, 0);
      await this.flash_finish(false);
    }
  }

  async hard_reset(): Promise<void> {
    await set(this.port, { dtr: false, rts: true });  // EN->LOW
    await sleep(100);
    await set(this.port, { dtr: false, rts: false });
  }

}
