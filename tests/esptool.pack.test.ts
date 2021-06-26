import pack from '../src/esptool/utils/pack';

test('pack(00 01 02 03)', () => {
  const input: Buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
  const output: Buffer = Buffer.from([0xC0, 0x00, 0x01, 0x02, 0x03, 0xC0]);
  const actual: Buffer = pack(input);

  expect(actual.toString('hex')).toBe(output.toString('hex'));
});

test('pack({C0} 01 02 03)', () => {
  const input: Buffer = Buffer.from([0xC0, 0x01, 0x02, 0x03]);
  const output: Buffer = Buffer.from([0xC0, 0xDB, 0xDC, 0x01, 0x02, 0x03, 0xC0]);
  const actual: Buffer = pack(input);

  expect(actual.toString('hex')).toBe(output.toString('hex'));
});

test('pack(00 {C0} 02 03)', () => {
  const input: Buffer = Buffer.from([0x00, 0xC0, 0x02, 0x03]);
  const output: Buffer = Buffer.from([0xC0, 0x00, 0xDB, 0xDC, 0x02, 0x03, 0xC0]);
  const actual: Buffer = pack(input);

  expect(actual.toString('hex')).toBe(output.toString('hex'));
});

test('pack(00 01 {C0} 03)', () => {
  const input: Buffer = Buffer.from([0x00, 0x01, 0xC0, 0x03]);
  const output: Buffer = Buffer.from([0xC0, 0x00, 0x01, 0xDB, 0xDC, 0x03, 0xC0]);
  const actual: Buffer = pack(input);

  expect(actual.toString('hex')).toBe(output.toString('hex'));
});

test('pack(00 01 02 {C0})', () => {
  const input: Buffer = Buffer.from([0x00, 0x01, 0x02, 0xC0]);
  const output: Buffer = Buffer.from([0xC0, 0x00, 0x01, 0x02, 0xDB, 0xDC, 0xC0]);
  const actual: Buffer = pack(input);

  expect(actual.toString('hex')).toBe(output.toString('hex'));
});

test('pack(00 {DB} 02 03)', () => {
  const input: Buffer = Buffer.from([0x00, 0xDB, 0x02, 0x03]);
  const output: Buffer = Buffer.from([0xC0, 0x00, 0xDB, 0xDD, 0x02, 0x03, 0xC0]);
  const actual: Buffer = pack(input);

  expect(actual.toString('hex')).toBe(output.toString('hex'));
});
