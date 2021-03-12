import { promisify } from 'util';
import EventEmitter from 'events';
import SerialPort from '@serialport/stream';
import WSABinding from 'serialport-binding-webserialapi';

import ESPLoader from './ESPLoader';
import ESP8266ROM from './ESP8266ROM';
import ESP32ROM from './ESP32ROM';

import sleep from './utils/sleep';
import gracefully from './utils/gracefully';

SerialPort.Binding = WSABinding;

export default class ESPTool extends EventEmitter {

  async open(path) {
    if (this.serial && this.serial.isOpen) {
      await gracefully(this.serial.close());
      this.serial = null;
      await sleep(200);
    }

    this.serial = new SerialPort(path, {
      baudRate: 115200,
      autoOpen: false,
    });

    this.serial.openAsync = promisify(this.serial.open.bind(this.serial));
    this.serial.closeAsync = promisify(this.serial.close.bind(this.serial));

    try {
      await this.serial.openAsync();

      const detector = new ESPLoader(this.serial);
      await detector.connect();
      const chip_magic_value = await detector.read_reg(ESPLoader.CHIP_DETECT_MAGIC_REG_ADDR);
      for (const cls of [ESP8266ROM, ESP32ROM]) {
        if (chip_magic_value == cls.CHIP_DETECT_MAGIC_VALUE) {
          this.loader = new cls(this.serial);
        }
      }
      detector.release();

      if (!this.loader) {
        console.warn('Unsupported chip');
        await gracefully(this.serial.close());
        this.serial = null;
        return false;
      }

      this.serial.once('close', () => {
        console.log('Connection closed');
        this.emit('disconnect');
      });

      const chip_description = await this.loader.get_chip_description();
      console.log(`Detected ${chip_description}`);

      if (this.loader.STUB_CODE) {
        const stub = await this.loader.run_stub();
        this.loader.release();
        this.loader = stub;
      }

      await this.loader.flash_spi_attach(0);

      process.nextTick(() => {
        this.emit('connect', { chip_description });
      });
    } catch (e) {
      console.warn('Failed getting chip model', e);
      if (this.serial.isOpen) {
        await gracefully(this.serial.close());
      }
      this.serial = null;
      throw e;
    }
  }

  async flash(args) {
    return await this.loader.flash(args, (progress) => this.emit('progress', progress));
  }

}
