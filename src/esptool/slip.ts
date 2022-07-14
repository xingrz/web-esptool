import EventEmitter from 'events';

import ESPLoader from './ESPLoader';
import { Command } from './cmds';

import pack from './utils/pack';
import unpack from './utils/unpack';
import hex from './utils/hex';
import once from './utils/once';

interface IResponse {
  val: number;
  data: Buffer;
}

export default class SlipReader extends EventEmitter {
  private readonly port: SerialPort;

  private reader?: ReadableStreamDefaultReader<Uint8Array>;
  private queue: Buffer;

  private _trace: (text?: string) => void;

  constructor(port: SerialPort) {
    super();

    this.port = port;

    this.queue = Buffer.alloc(0);

    this._trace = ESPLoader.TRACE
      ? (text) => console.log(`%cTRACE ${text}`, 'color: darkcyan')
      : () => null;
  }

  start(): void {
    this.read();
  }

  async stop(): Promise<void> {
    await this.reader?.cancel();
  }

  private async read(): Promise<void> {
    if (!this.port?.readable) return;

    const reader = this.reader = this.port.readable.getReader();
    try {
      while (this.reader) {
        const { value, done } = await reader.read();
        if (!value || done) break;
        const data = Buffer.from(value);
        this._trace(`Read ${data.length} bytes: ${data.toString('hex')}`);
        const { queue, packets } = unpack(this.queue, data);
        this.queue = queue;
        for (const packet of packets) {
          this.dispatch(packet);
        }
      }
    } finally {
      reader.releaseLock();
      delete this.reader;
    }
  }

  private async dispatch(data: Buffer): Promise<void> {
    if (data.length < 8) return;
    if (data[0] != 0x01) return;
    const op = data[1] as Command;
    const size = data.readUInt16LE(2);
    const val = data.readUInt32LE(4);
    data = data.slice(8);

    this._trace(`< res op=${hex(op)} len=${size} val=${val} data=${data.toString('hex')}`);

    this.emit(`res:${op}`, <IResponse>{ val, data });
  }

  private async write(data: Buffer): Promise<void> {
    data = pack(data);
    this._trace(`Write ${data.length} bytes: ${data.toString('hex')}`);
    const writer = this.port.writable?.getWriter();
    if (writer) {
      await writer.write(data);
      writer.releaseLock();
    }
  }

  async command(op: Command, data: Buffer, chk = 0, timeout = 500, tries = 5): Promise<IResponse> {
    this._trace(`> req op=${hex(op)} len=${data.length} data=${data.toString('hex')}`);

    const hdr = Buffer.alloc(8);
    hdr[0] = 0x00;
    hdr[1] = op;
    hdr.writeUInt16LE(data.length, 2);
    hdr.writeUInt32LE(chk, 4);
    const out = Buffer.concat([hdr, data]);
    for (let i = 0; i < tries; i++) {
      try {
        await this.write(out);
        return await once(this, `res:${op}`, timeout) as IResponse;
      } catch (e) {
        // ignored
      }
    }
    throw new Error('Timeout waiting for command response');
  }
}
