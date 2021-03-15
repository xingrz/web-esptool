export default function pack(data) {
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
  if (lastIndex < data.length) {
    parts.push(data.slice(lastIndex, data.length));
  }
  parts.push(Buffer.from([0xC0]));
  return Buffer.concat(parts);
}
