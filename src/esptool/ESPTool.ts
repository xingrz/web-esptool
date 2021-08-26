import EventEmitter from 'events';

import ESPLoader from './ESPLoader';
import ESP8266ROM from './ESP8266ROM';
import ESP32ROM from './ESP32ROM';
import ESP32S2ROM from './ESP32S2ROM';
import ESP32C3ROM from './ESP32C3ROM';

import { IFlashArgs, IConnectEvent } from './';

export default class ESPTool extends EventEmitter {

  serial: SerialPort | null = null;
  loader: ESPLoader | null = null;

  async open(serial: SerialPort): Promise<void> {
    this.serial = serial;

    await this.serial.open({
      baudRate: 115200
    });

    this.serial.ondisconnect = () => {
      console.log('Connection closed');
      this.emit('disconnect');
    };

    try {
      const detector = new ESPLoader(this.serial);
      detector.start();
      await detector.connect();
      const chip_magic_value = await detector.read_reg(ESPLoader.CHIP_DETECT_MAGIC_REG_ADDR);
      for (const cls of [ESP8266ROM, ESP32ROM, ESP32S2ROM, ESP32C3ROM]) {
        if (cls.CHIP_DETECT_MAGIC_VALUE.includes(chip_magic_value)) {
          this.loader = new cls(this.serial);
        }
      }
      await detector.release();

      if (!this.loader) {
        throw new Error('Unsupported chip');
      }

      this.loader.start();

      const chip_description = await this.loader.get_chip_description();
      console.log(`Detected ${chip_description}`);
      this.emit('connect', { chip_description } as IConnectEvent);

      const stub = await this.loader.run_stub();
      if (stub != null) {
        await this.loader.release();
        this.loader = stub;
        this.loader.start();
      }
    } catch (e) {
      console.warn('Failed getting chip model', e);
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
  }

  async flash(args: IFlashArgs): Promise<void> {
    await this.loader?.flash(args, (progress) => this.emit('progress', progress));
    await this.loader?.hard_reset();
  }

}
