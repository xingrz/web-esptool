import { promisify } from 'util';
import { unzip } from 'zlib';
import hex from './utils/hex';
import once from './utils/once';
import sleep from './utils/sleep';

const unzipAsync = promisify(unzip);

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
  STATUS_BYTES_LENGTH = 2

  constructor(port) {
    this._on_data = this._on_data.bind(this);

    this.port = port;
    this.port.on('data', this._on_data);

    this.port.writeAsync = promisify(this.port.write.bind(this.port));
    this.port.setAsync = promisify(this.port.set.bind(this.port));

    this.queue = Buffer.alloc(0);

    this._trace = ESPLoader.TRACE
      ? (text) => console.log(`%cTRACE ${text}`, 'color: darkcyan')
      : () => null;
  }

  release() {
    this.port.removeListener('data', this._on_data);
  }

  _on_data(data) {
    this._trace(`Read ${data.length} bytes: ${data.toString('hex')}`);

    this.queue = Buffer.concat([this.queue, data]);

    let parts = null;
    let lastIndex = 0;
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i] == 0xC0) {
        if (parts == null) {
          parts = [];
          lastIndex = i + 1;
        } else {
          if (lastIndex < i) {
            parts.push(this.queue.slice(lastIndex, i));
          }
          this._dispatch(Buffer.concat(parts));
          parts = null;
          this.queue = this.queue.slice(i + 1);
        }
      } else if (i < this.queue.length - 1) {
        const bh = this.queue[i];
        const bl = this.queue[i + 1];
        if (bh == 0xDB && bl == 0xDC) {
          parts.push(this.queue.slice(lastIndex, i));
          parts.push(Buffer.from([0xC0]));
        } else if (bh == 0xDB && bl == 0xDD) {
          parts.push(this.queue.slice(lastIndex, i));
          parts.push(Buffer.from([0xDB]));
        }
      }
    }
  }

  async _write(data) {
    const parts = [Buffer.from([0xC0])];
    let lastIndex = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] == 0xC0) {
        parts.push(data.slice(lastIndex, i));
        parts.push(Buffer.from([0xDB, 0xDC]));
        lastIndex = i + 1;
      } else if (data[i] == 0xDB) {
        parts.push(data.slice(lastIndex, i));
        parts.push(Buffer.from([0xDB, 0xDD]));
        lastIndex = i + 1;
      }
    }
    if (lastIndex < data.length) {
      parts.push(data.slice(lastIndex, data.length));
    }
    parts.push(Buffer.from([0xC0]));
    data = Buffer.concat(parts);

    this._trace(`Write ${data.length} bytes: ${data.toString('hex')}`);

    return await this.port.writeAsync(data);
  }

  _dispatch(data) {
    if (data.length < 8) return;
    if (data[0] != 0x01) return;
    const op = data[1];
    const size = data.readUInt16LE(2);
    const val = data.readUInt32LE(4);
    data = data.slice(8);

    this._trace(`< res op=${hex(op)} len=${size} val=${val} data=${data.toString('hex')}`);

    this.port.emit(`res:${op}`, { val, data });
  }

  async command(op, data, chk = 0, timeout = 500, tries = 5) {
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
        return await once(this.port, `res:${op}`, timeout);
      } catch (e) {
        // ignored
      }
    }
    throw new Error('Timeout waiting for command response');
  }

  check({ val, data }) {
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

  async sync() {
    const data = Buffer.concat([
      Buffer.from([0x07, 0x07, 0x12, 0x20]),
      Buffer.alloc(32, 0x55),
    ]);
    const { val } = await this.command(this.ESP_SYNC, data, 500, 1);
    return val;
  }

  async _connect_attempt(esp32r0_delay = false) {
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
    await this.port.setAsync({ dtr: false, rts: true });

    await sleep(100);
    if (esp32r0_delay) {
      // Some chips are more likely to trigger the esp32r0
      // watchdog reset silicon bug if they're held with EN=LOW
      // for a longer period
      await sleep(1200);
    }

    // IO0 = LOW
    // EN = HIGH, chip out of reset
    await this.port.setAsync({ dtr: true, rts: false });

    if (esp32r0_delay) {
      // Sleep longer after reset.
      // This workaround only works on revision 0 ESP32 chips,
      // it exploits a silicon bug spurious watchdog reset.
      await sleep(400);  // allow watchdog reset to occur
    }
    await sleep(50);

    // IO0 = HIGH, done
    await this.port.setAsync({ dtr: false, rts: false });

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

  async connect(attempts = 7) {
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

  async read_reg(addr) {
    const data = Buffer.alloc(4);
    data.writeUInt32LE(addr, 0);
    const { val } = await this.command(this.ESP_READ_REG, data);
    return val;
  }

  get_chip_description() {
    throw new Error('Not supported');
  }

  get_erase_size(offset, size) {
    return size;
  }

  _checksum(data) {
    let state = this.ESP_CHECKSUM_MAGIC;
    for (const b of data) {
      state ^= b;
    }
    return state;
  }

  async mem_begin(size, blocks, blocksize, offset) {
    const data = Buffer.alloc(16);
    data.writeUInt32LE(size, 0);
    data.writeUInt32LE(blocks, 4);
    data.writeUInt32LE(blocksize, 8);
    data.writeUInt32LE(offset, 12);

    return this.check(await this.command(this.ESP_MEM_BEGIN, data, 0, 5000, 1));
  }

  async mem_block(data, seq) {
    const hdr = Buffer.alloc(16);
    hdr.writeUInt32LE(data.length, 0);
    hdr.writeUInt32LE(seq, 4);
    hdr.writeUInt32LE(0, 8);
    hdr.writeUInt32LE(0, 12);

    const buf = Buffer.concat([hdr, data]);
    return this.check(await this.command(this.ESP_MEM_DATA, buf, this._checksum(data), 5000, 1));
  }

  async mem_finish(entrypoint = 0) {
    const data = Buffer.alloc(8);
    data.writeUInt32LE(entrypoint == 0, 0);
    data.writeUInt32LE(entrypoint, 4);
    this.check(await this.command(this.ESP_MEM_END, data, 0, 50, 1));
  }

  async flash_begin(size, offset) {
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

  async flash_block(data, seq) {
    const hdr = Buffer.alloc(16);
    hdr.writeUInt32LE(data.length, 0);
    hdr.writeUInt32LE(seq, 4);
    hdr.writeUInt32LE(0, 8);
    hdr.writeUInt32LE(0, 12);

    const buf = Buffer.concat([hdr, data]);
    this.check(await this.command(this.ESP_FLASH_DATA, buf, this._checksum(data), 5000, 1));
  }

  _pad_image(data, alignment, pad_character = 0xFF) {
    const pad_mod = data.length % alignment;
    if (pad_mod != 0) {
      data = Buffer.concat([data, Buffer.alloc(pad_mod, pad_character)]);
    }
    return data;
  }

  _parse_flash_size_arg(arg) {
    if (this.loader.FLASH_SIZES[arg]) {
      return this.loader.FLASH_SIZES[arg];
    } else {
      const sizes = Object.keys(this.loader.FLASH_SIZES).join(', ');
      throw new Error(`Flash size '${arg}' is not supported by this chip type. Supported sizes: ${sizes}`);
    }
  }

  async run_stub() {
    const stub = this.STUB_CODE;

    console.log('Uploading stub...');
    for (const field of ['text', 'data']) {
      if (!stub[field]) continue;
      const offs = stub[`${field}_start`];
      const code = await unzipAsync(Buffer.from(stub[field], 'base64'));
      const blocks = Math.floor((code.length + this.ESP_RAM_BLOCK - 1) / this.ESP_RAM_BLOCK);
      await this.mem_begin(code.length, blocks, this.ESP_RAM_BLOCK, offs);
      for (let seq = 0; seq < blocks; seq++) {
        const from_offs = seq * this.ESP_RAM_BLOCK;
        const to_offs = from_offs + this.ESP_RAM_BLOCK;
        await this.mem_block(code.slice(from_offs, to_offs), seq);
      }
    }

    console.log('Running stub...');
    await this.mem_finish(stub['entry']);
    await sleep(500);

    console.log('Stub running...');
    return new this.STUB_CLASS(this.port);
  }

  _update_image_flash_params(address, args, image) {
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
      flash_mode = { 'qio': 0, 'qout': 1, 'dio': 2, 'dout': 3 }[args.flashMode];
    }

    if (args.flashFreq && args.flashFreq != 'keep') {
      flash_freq = { '40m': 0, '26m': 1, '20m': 2, '80m': 0xf }[args.flashFreq];
    }

    if (args.flashSize && args.flashSize != 'keep') {
      flash_size = this._parse_flash_size_arg(args.flashSize);
    }

    image[2] = flash_mode;
    image[3] = flash_freq | flash_size;

    return image;
  }

  async flash(args, onProgress) {
    for (let i = 0; i < args.partitions.length; i++) {
      let { address, image } = args.partitions[i];
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

      console.log(`Wrote ${written} bytes`);
    }
  }

}
