import { parse } from 'elfy';
import { readFile } from 'fs/promises';
import { promisify } from 'util';
import { deflate as _deflate } from 'zlib';

const deflate = promisify(_deflate);

export default function elf() {
  return {
    name: 'elf',
    resolveId(source) {
      if (source.endsWith('.elf')) {
        return source;
      } else {
        return null;
      }
    },
    async load(id) {
      if (!id.endsWith('.elf')) {
        return null;
      }

      const source = await readFile(id);

      const elf = parse(source);
      const stub = {};

      const text = elf.body.sections.find(({ name }) => name == '.text');
      if (text.data.length % 4 != 0) {
        const code = text.data;
        text.data = Buffer.alloc(Math.ceil(code.length / 4) * 4, 0);
        code.copy(text.data);
      }
      stub.text = await pack(text.data);
      stub.text_start = text.addr;

      const data = elf.body.sections.find(({ name }) => name == '.data');
      if (data) {
        stub.data = await pack(data.data);
        stub.data_start = data.addr;
      }

      stub.entry = elf.entry;

      return `export default ${JSON.stringify(stub)};`;
    },
  }
}

async function pack(buffer) {
  return (await deflate(buffer, { level: 9 })).toString('base64');
}
