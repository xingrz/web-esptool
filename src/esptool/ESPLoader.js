import { promisify } from 'util';

export default class ESPLoader {

  static TRACE = false;

  // This ROM address has a different value on each chip model
  static CHIP_DETECT_MAGIC_REG_ADDR = 0x40001000;

  CHIP_NAME = 'Espressif device';
  IS_STUB = false;

  // Commands supported by ESP8266 ROM bootloader
  ESP_SYNC = 0x08;
  ESP_READ_REG = 0x0A;

  constructor(port) {
    this._on_data = this._on_data.bind(this);

    this.port = port;
    this.port.on('data', this._on_data);

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
    if (lastIndex < data.length - 1) {
      parts.push(data.slice(lastIndex, data.length));
    }
    parts.push(Buffer.from([0xC0]));
    data = Buffer.concat(parts);

    this._trace(`Write ${data.length} bytes: ${data.toString('hex')}`);

    const writeAsync = promisify(this.port.write.bind(this.port));
    return await writeAsync(data);
  }

  _dispatch(data) {
    if (data.length < 8) return;
    if (data[0] != 0x01) return;
    const op = data[1];
    const size = data.readUInt16LE(2);
    const val = data.readUInt32LE(4);
    data = data.slice(8);

    this._trace(`< res op=${this._hex(op)} len=${size} val=${val} data=${data.toString('hex')}`);

    this.port.emit(`res:${op}`, { val, data });
  }

  _wait(evt, timeout) {
    return new Promise((resolve, reject) => {
      let timer, succeed, ongoing = true;
      succeed = (ret) => {
        if (ongoing) {
          ongoing = false;
          clearTimeout(timer);
          resolve(ret);
        }
      };
      timer = setTimeout(() => {
        if (ongoing) {
          ongoing = false;
          this.port.removeListener(evt, succeed);
          reject(new Error('Timeout'));
        }
      }, timeout);
      this.port.once(evt, succeed);
    });
  }

  async command(op, data, chk = 0) {
    this._trace(`> req op=${this._hex(op)} len=${data.length} data=${data.toString('hex')}`);

    const hdr = Buffer.alloc(8);
    hdr[0] = 0x00;
    hdr[1] = op;
    hdr.writeUInt16LE(data.length, 2);
    hdr.writeUInt32LE(chk, 4);
    const out = Buffer.concat([hdr, data]);
    for (let i = 0; i < 10; i++) {
      try {
        this._write(out);
        return await this._wait(`res:${op}`, 200);
      } catch (e) {
        // ignored
      }
    }
    throw new Error('Timeout waiting for command response');
  }

  async sync() {
    const data = Buffer.concat([
      Buffer.from([0x07, 0x07, 0x12, 0x20]),
      Buffer.alloc(32, 0x55),
    ]);
    const { val } = await this.command(this.ESP_SYNC, data);
    return val;
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

  _hex(v, bytes = 1) {
    return `0x${v.toString(16).padStart(bytes * 2, '0')}`;
  }

}
