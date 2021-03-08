import { promisify } from 'util';
import EventEmitter from 'events';
import SerialPort from '@serialport/stream';
import WSABinding from 'serialport-binding-webserialapi';

import ESPLoader from './ESPLoader';
import ESP8266ROM from './ESP8266ROM';
import ESP32ROM from './ESP32ROM';

import { sleep, gracefully } from './utils';

SerialPort.Binding = WSABinding;

export default class ESPTool extends EventEmitter {

  async open(path) {
    if (this.serial) {
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

    if (await this.serial.openAsync()) {
      console.warn('Failed opening serial');
      this.serial = null;
      return false;
    }

    const detector = new ESPLoader(this.serial);
    await detector.sync();
    const chip_magic_value = await detector.read_reg(ESPLoader.CHIP_DETECT_MAGIC_REG_ADDR);
    for (const cls of [ESP8266ROM, ESP32ROM]) {
      if (chip_magic_value == cls.CHIP_DETECT_MAGIC_VALUE) {
        this.loader = new cls(this.serial);
      }
    }
    detector.release();

    if (!this.loader) {
      console.warn('Unsupported chip');
      this.serial = null;
      return false;
    }

    this.serial.once('close', () => {
      console.log('Connection closed');
      this.emit('disconnect');
    });

    const chip_description = await this.loader.get_chip_description();
    console.log(`Detected ${chip_description}`);

    process.nextTick(() => {
      this.emit('connect', { chip_description });
    });

    return true;
  }

  async flash(file) {
  }

}
