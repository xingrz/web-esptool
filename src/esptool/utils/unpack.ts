export default function unpack(queue: Buffer, data: Buffer): { queue: Buffer, packets: Buffer[] } {
  queue = Buffer.concat([queue, data]);
  const packets = [];
  let pi = 0, qi = 0;
  let packet = Buffer.alloc(queue.length);
  while (qi < queue.length) {
    if (queue[qi] == 0xC0) {
      if (pi > 0) {
        packets.push(packet.slice(0, pi));
        packet = Buffer.alloc(queue.length);
      }
      pi = 0;
      qi += 1;
    } else if (qi < queue.length - 1 && queue[qi] == 0xDB && queue[qi + 1] == 0xDC) {
      packet[pi] = 0xC0;
      pi += 1;
      qi += 2;
    } else if (qi < queue.length - 1 && queue[qi] == 0xDB && queue[qi + 1] == 0xDD) {
      packet[pi] = 0xDB;
      pi += 1;
      qi += 2;
    } else {
      packet[pi] = queue[qi];
      pi += 1;
      qi += 1;
    }
  }
  return { queue: packet.slice(0, pi), packets };
}
