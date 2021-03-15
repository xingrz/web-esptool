export default function unpack(queue, data) {
  const packets = [];

  queue = Buffer.concat([queue, data]);

  let parts = null;
  let lastIndex = 0;
  for (let i = 0; i < queue.length; i++) {
    if (queue[i] == 0xC0) {
      if (parts == null) {
        parts = [];
        lastIndex = i + 1;
      } else {
        if (lastIndex < i) {
          parts.push(queue.slice(lastIndex, i));
        }
        packets.push(Buffer.concat(parts));
        parts = null;
        queue = queue.slice(i + 1);
      }
    } else if (i < queue.length - 1) {
      const bh = queue[i];
      const bl = queue[i + 1];
      if (bh == 0xDB && bl == 0xDC) {
        parts.push(queue.slice(lastIndex, i));
        parts.push(Buffer.from([0xC0]));
      } else if (bh == 0xDB && bl == 0xDD) {
        parts.push(queue.slice(lastIndex, i));
        parts.push(Buffer.from([0xDB]));
      }
    }
  }

  return { queue, packets };
}
