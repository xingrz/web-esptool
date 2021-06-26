import EventEmitter from 'events';
import type { BaseBinding } from 'serialport';
import SerialPort from '@serialport/stream';
import WSABinding from 'serialport-binding-webserialapi';

import ESPLoader from './ESPLoader';
import ESP8266ROM from './ESP8266ROM';
import ESP32ROM from './ESP32ROM';

import { open, closeGracefully } from './utils/serial';
import sleep from './utils/sleep';
import { IFlashArgs, IConnectEvent } from './';

SerialPort.Binding = WSABinding as unknown as BaseBinding;

export default class ESPTool extends EventEmitter {

  serial: SerialPort | null = null;
  loader: ESPLoader | null = null;

  async open(path: string): Promise<void> {
    if (this.serial && this.serial.isOpen) {
      await closeGracefully(this.serial);
      this.serial = null;
      await sleep(200);
    }

    this.serial = new SerialPort(path, {
      baudRate: 115200,
      autoOpen: false,
    });

    try {
      await open(this.serial);

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
        closeGracefully(this.serial);
        this.serial = null;
        return;
      }

      this.serial.once('close', () => {
        console.log('Connection closed');
        this.emit('disconnect');
      });

      const chip_description = await this.loader.get_chip_description();
      console.log(`Detected ${chip_description}`);
      this.emit('connect', { chip_description } as IConnectEvent);

      if (this.loader.STUB_CODE) {
        const stub = await this.loader.run_stub();
        this.loader.release();
        this.loader = stub;
      }

      await this.loader?.flash_spi_attach(0);
    } catch (e) {
      console.warn('Failed getting chip model', e);
      if (this.serial && this.serial.isOpen) {
        closeGracefully(this.serial);
      }
      this.serial = null;
      throw e;
    }
  }

  async flash(args: IFlashArgs): Promise<void> {
    await this.loader?.flash(args, (progress) => this.emit('progress', progress));
    await this.loader?.hard_reset();
  }

}
