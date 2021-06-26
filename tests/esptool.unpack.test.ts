import unpack from '../src/esptool/utils/unpack';

function toHexList(list: Buffer[]) {
  return list.map(buf => buf.toString('hex'));
}

test('unpack(C0 00 01 02 03 C0)', () => {
  const queueIn: Buffer = Buffer.alloc(0);

  const input: Buffer = Buffer.from([
    0xC0, 0x00, 0x01, 0x02, 0x03, 0xC0,
  ]);

  const outputExpect: Buffer[] = [
    Buffer.from([0x00, 0x01, 0x02, 0x03]),
  ];

  const queueExpect: Buffer = Buffer.from([
  ]);

  const { queue: queueOut, packets: outputActual } = unpack(queueIn, input);

  expect(toHexList(outputActual)).toStrictEqual(toHexList(outputExpect));
  expect(queueOut.toString('hex')).toBe(queueExpect.toString('hex'));
});

test('unpack(C0 {DB DC} 01 02 03 C0)', () => {
  const queueIn: Buffer = Buffer.alloc(0);

  const input: Buffer = Buffer.from([
    0xC0, 0xDB, 0xDC, 0x01, 0x02, 0x03, 0xC0,
  ]);

  const outputExpect: Buffer[] = [
    Buffer.from([0xC0, 0x01, 0x02, 0x03]),
  ];

  const queueExpect: Buffer = Buffer.from([
  ]);

  const { queue: queueOut, packets: outputActual } = unpack(queueIn, input);

  expect(toHexList(outputActual)).toStrictEqual(toHexList(outputExpect));
  expect(queueOut.toString('hex')).toBe(queueExpect.toString('hex'));
});

test('unpack(C0 00 {DB DC} 02 03 C0)', () => {
  const queueIn: Buffer = Buffer.alloc(0);

  const input: Buffer = Buffer.from([
    0xC0, 0x00, 0xDB, 0xDC, 0x02, 0x03, 0xC0,
  ]);

  const outputExpect: Buffer[] = [
    Buffer.from([0x00, 0xC0, 0x02, 0x03]),
  ];

  const queueExpect: Buffer = Buffer.from([
  ]);

  const { queue: queueOut, packets: outputActual } = unpack(queueIn, input);

  expect(toHexList(outputActual)).toStrictEqual(toHexList(outputExpect));
  expect(queueOut.toString('hex')).toBe(queueExpect.toString('hex'));
});

test('unpack(C0 00 01 {DB DC} 03 C0)', () => {
  const queueIn: Buffer = Buffer.alloc(0);

  const input: Buffer = Buffer.from([
    0xC0, 0x00, 0x01, 0xDB, 0xDC, 0x03, 0xC0,
  ]);

  const outputExpect: Buffer[] = [
    Buffer.from([0x00, 0x01, 0xC0, 0x03]),
  ];

  const queueExpect: Buffer = Buffer.from([
  ]);

  const { queue: queueOut, packets: outputActual } = unpack(queueIn, input);

  expect(toHexList(outputActual)).toStrictEqual(toHexList(outputExpect));
  expect(queueOut.toString('hex')).toBe(queueExpect.toString('hex'));
});

test('unpack(C0 00 01 02 {DB DC} C0)', () => {
  const queueIn: Buffer = Buffer.alloc(0);

  const input: Buffer = Buffer.from([
    0xC0, 0x00, 0x01, 0x02, 0xDB, 0xDC, 0xC0,
  ]);

  const outputExpect: Buffer[] = [
    Buffer.from([0x00, 0x01, 0x02, 0xC0]),
  ];

  const queueExpect: Buffer = Buffer.from([
  ]);

  const { queue: queueOut, packets: outputActual } = unpack(queueIn, input);

  expect(toHexList(outputActual)).toStrictEqual(toHexList(outputExpect));
  expect(queueOut.toString('hex')).toBe(queueExpect.toString('hex'));
});

test('unpack(C0 00 {DB DD} 02 03 C0)', () => {
  const queueIn: Buffer = Buffer.alloc(0);

  const input: Buffer = Buffer.from([
    0xC0, 0x00, 0xDB, 0xDD, 0x02, 0x03, 0xC0,
  ]);

  const outputExpect: Buffer[] = [
    Buffer.from([0x00, 0xDB, 0x02, 0x03]),
  ];

  const queueExpect: Buffer = Buffer.from([
  ]);

  const { queue: queueOut, packets: outputActual } = unpack(queueIn, input);

  expect(toHexList(outputActual)).toStrictEqual(toHexList(outputExpect));
  expect(queueOut.toString('hex')).toBe(queueExpect.toString('hex'));
});

test('unpack(C0 00 01 02 03 C0 | C0 04 05 06 07 C0)', () => {
  const queueIn: Buffer = Buffer.alloc(0);

  const input: Buffer = Buffer.from([
    0xC0, 0x00, 0x01, 0x02, 0x03, 0xC0,
    0xC0, 0x04, 0x05, 0x06, 0x07, 0xC0,
  ]);

  const outputExpect: Buffer[] = [
    Buffer.from([0x00, 0x01, 0x02, 0x03]),
    Buffer.from([0x04, 0x05, 0x06, 0x07]),
  ];

  const queueExpect: Buffer = Buffer.from([
  ]);

  const { queue: queueOut, packets: outputActual } = unpack(queueIn, input);

  expect(toHexList(outputActual)).toStrictEqual(toHexList(outputExpect));
  expect(queueOut.toString('hex')).toBe(queueExpect.toString('hex'));
});

test('unpack(C0 00 01 02)', () => {
  const queueIn: Buffer = Buffer.alloc(0);

  const input: Buffer = Buffer.from([
    0xC0, 0x00, 0x01, 0x02,
  ]);

  const outputExpect: Buffer[] = [
  ];

  const queueExpect: Buffer = Buffer.from([
    0xC0, 0x00, 0x01, 0x02,
  ]);

  const { queue: queueOut, packets: outputActual } = unpack(queueIn, input);

  expect(toHexList(outputActual)).toStrictEqual(toHexList(outputExpect));
  expect(queueOut.toString('hex')).toBe(queueExpect.toString('hex'));
});

test('unpack(C0 00 01 02 03 C0 | C0 04 05)', () => {
  const queueIn: Buffer = Buffer.alloc(0);

  const input: Buffer = Buffer.from([
    0xC0, 0x00, 0x01, 0x02, 0x03, 0xC0,
    0xC0, 0x04, 0x05,
  ]);

  const outputExpect: Buffer[] = [
    Buffer.from([0x00, 0x01, 0x02, 0x03]),
  ];

  const queueExpect: Buffer = Buffer.from([
    0xC0, 0x04, 0x05,
  ]);

  const { queue: queueOut, packets: outputActual } = unpack(queueIn, input);

  expect(toHexList(outputActual)).toStrictEqual(toHexList(outputExpect));
  expect(queueOut.toString('hex')).toBe(queueExpect.toString('hex'));
});

test('unpack(C0 00 01 02 03 C0 | C0 04 05 + 06 07 C0)', () => {
  const queueIn: Buffer = Buffer.alloc(0);

  const input1: Buffer = Buffer.from([
    0xC0, 0x00, 0x01, 0x02, 0x03, 0xC0,
    0xC0, 0x04, 0x05,
  ]);

  const input2: Buffer = Buffer.from([
    0x06, 0x07, 0xC0,
  ]);

  const output1Expect: Buffer[] = [
    Buffer.from([0x00, 0x01, 0x02, 0x03]),
  ];

  const output2Expect: Buffer[] = [
    Buffer.from([0x04, 0x05, 0x06, 0x07]),
  ];

  const queue1Expect: Buffer = Buffer.from([
    0xC0, 0x04, 0x05,
  ]);

  const queue2Expect: Buffer = Buffer.from([
  ]);

  const { queue: queue1Out, packets: output1Actual } = unpack(queueIn, input1);

  expect(toHexList(output1Actual)).toStrictEqual(toHexList(output1Expect));
  expect(queue1Out.toString('hex')).toBe(queue1Expect.toString('hex'));

  const { queue: queue2Out, packets: output2Actual } = unpack(queue1Out, input2);

  expect(toHexList(output2Actual)).toStrictEqual(toHexList(output2Expect));
  expect(queue2Out.toString('hex')).toBe(queue2Expect.toString('hex'));
});
