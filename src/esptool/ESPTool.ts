import EventEmitter from 'events';
import promisify from 'pify';
import { zlib as _zlib, unzlib as _unzlib } from 'fflate';

const zlib = promisify(_zlib);
const unzlib = promisify(_unzlib);

import ESPLoader from './ESPLoader';
import ESP8266ROM from './ESP8266ROM';
import ESP32ROM from './ESP32ROM';
import ESP32S2ROM from './ESP32S2ROM';
import ESP32S3ROM from './ESP32S3ROM';
import ESP32C2ROM from './ESP32C2ROM';
import ESP32C3ROM from './ESP32C3ROM';

import { IFlashArgs, IESPDevice, IFlashProgress } from './';
import sleep from './utils/sleep';
import hex from './utils/hex';
import pad_image from './utils/pad_image';
import update_image_flash_params from './utils/update_image_flash_params';

const BAUD_RATE_DEFAULT = 115200;
const BAUD_RATE_BOOST = 960000;

// This ROM address has a different value on each chip model
const CHIP_DETECT_MAGIC_REG_ADDR = 0x40001000;

const LOADERS = [
  ESP8266ROM,
  ESP32ROM,
  ESP32S2ROM,
  ESP32S3ROM,
  ESP32C2ROM,
  ESP32C3ROM,
];

const COMPRESS = true;

export default class ESPTool extends EventEmitter {

  serial: SerialPort | null = null;
  loader: ESPLoader | null = null;

  async open(serial: SerialPort): Promise<void> {
    this.serial = serial;
    this.serial.addEventListener('disconnect', () => {
      this.close();
    }, { once: true });

    try {
      // 1. Open serial port with default baud
      await this.serial.open({ baudRate: BAUD_RATE_DEFAULT });

      // 2. Detect chip model
      const detector = new ESPLoader(this.serial);
      detector.start();
      await detector.connect();
      const chip_magic_value = await detector.read_reg(CHIP_DETECT_MAGIC_REG_ADDR);
      for (const cls of LOADERS) {
        if (cls.CHIP_DETECT_MAGIC_VALUE.includes(chip_magic_value)) {
          this.loader = new cls(this.serial);
        }
      }
      await detector.release();
      if (!this.loader) {
        throw new Error('Unsupported chip');
      }
      this.loader.start();

      const info = await this.loader.get_chip_info();
      console.log(`Detected ${info.description}`);
      this.emit('connect', info);

      // 3. Load stub loader if present
      const stub = await this.run_stub(this.serial);
      if (!stub) {
        return;
      }
      await this.loader.release();
      this.loader = stub;
      this.loader.start();

      // 4. Boost baud rate
      await this.loader.change_baud(BAUD_RATE_BOOST, BAUD_RATE_DEFAULT);
      await sleep(100);
      await this.loader.release();
      await this.serial.close();
      await this.serial.open({ baudRate: BAUD_RATE_BOOST });
      this.loader.start();
    } catch (e) {
      console.warn('Failed launching loader', e);
      await this.serial.close();
      this.serial = null;
      throw e;
    }
  }

  async close(): Promise<void> {
    if (this.loader) {
      await this.loader.release();
      this.loader = null;
    }
    if (this.serial) {
      await this.serial.close();
      this.serial = null;
    }
    this.emit('disconnect');
  }

  async run_stub(serial: SerialPort): Promise<ESPLoader | null> {
    if (!this.loader) return null;

    const {
      RAM_WRITE_SIZE,
    } = this.loader;

    const stub = await this.loader.load_stub();
    if (!stub) {
      return null;
    }

    console.log('Uploading stub...');
    for (const field of ['text', 'data']) {
      if (!stub[field]) continue;
      const offs = stub[`${field}_start`] as number;
      const code = await unzlib(Buffer.from(stub[field] as string, 'base64'));
      const blocks = Math.floor((code.length + RAM_WRITE_SIZE - 1) / RAM_WRITE_SIZE);
      await this.loader.mem_begin(code.length, blocks, RAM_WRITE_SIZE, offs);
      for (let seq = 0; seq < blocks; seq++) {
        const from_offs = seq * RAM_WRITE_SIZE;
        const to_offs = from_offs + RAM_WRITE_SIZE;
        await this.loader.mem_block(code.slice(from_offs, to_offs), seq);
      }
    }

    console.log('Running stub...');
    await this.loader.mem_finish(stub['entry'] as number);
    await sleep(500);

    console.log('Stub running...');
    return new this.loader.STUB_CLASS!(serial);
  }

  async flash(args: IFlashArgs): Promise<void> {
    if (!this.loader) return;

    const {
      IS_STUB,
      BOOTLOADER_FLASH_OFFSET,
      FLASH_SIZES,
      FLASH_WRITE_SIZE,
    } = this.loader;

    for (let i = 0; i < args.partitions.length; i++) {
      const { address } = args.partitions[i];
      let { image } = args.partitions[i];
      console.log(`Part ${i}: address=${hex(address, 4)} size=${image.length}`);

      image = pad_image(image, 4);
      if (image.length == 0) {
        console.warn(`Skipped empty part ${i} address=${hex(address, 4)}`);
        continue;
      }

      image = update_image_flash_params(address, args, image,
        BOOTLOADER_FLASH_OFFSET, FLASH_SIZES);

      let blocks;
      if (COMPRESS) {
        const uncsize = image.length;
        image = await zlib(image, { level: 9 });
        blocks = await this.loader.flash_defl_begin(uncsize, image.length, address);
      } else {
        blocks = await this.loader.flash_begin(image.length, address);
      }

      let seq = 0;
      let written = 0;
      while (image.length > 0) {
        const block = image.slice(0, FLASH_WRITE_SIZE);
        if (COMPRESS) {
          console.log(`Writing... (${Math.round((seq + 1) / blocks * 100)}%)`);
          await this.loader.flash_defl_block(block, seq);
        } else {
          console.log(`Writing at ${hex(address + written, 4)}... (${Math.round((seq + 1) / blocks * 100)}%)`);
          await this.loader.flash_block(block, seq);
        }
        image = image.slice(FLASH_WRITE_SIZE);
        seq += 1
        written += block.length;
        this.emit('progress', <IFlashProgress>{
          index: i,
          blocks_written: seq + 1,
          blocks_total: blocks,
        });
      }

      if (IS_STUB) {
        // Stub only writes each block to flash after 'ack'ing the receive, so do a final dummy operation which will
        // not be 'ack'ed until the last block has actually been written out to flash
        await this.loader.read_reg(CHIP_DETECT_MAGIC_REG_ADDR);
      }

      console.log(`Wrote ${written} bytes`);
    }

    console.log('Leaving...');

    if (IS_STUB) {
      // skip sending flash_finish to ROM loader here,
      // as it causes the loader to exit and run user code
      await this.loader.flash_begin(0, 0);
      if (COMPRESS) {
        await this.loader.flash_defl_finish(false);
      } else {
        await this.loader.flash_finish(false);
      }
    }

    await this.loader.hard_reset();
  }

}
