const { parse } = require('elfy');
const { promisify } = require('util');
const deflate = promisify(require('zlib').deflate);

async function pack(buffer) {
  return (await deflate(buffer, { level: 9 })).toString('base64');
}

const loader = module.exports = async function (source) {
  const callback = this.async();

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

  callback(null, `module.exports = ${JSON.stringify(stub)};`);
}

loader.raw = true;
