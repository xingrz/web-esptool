export default function pack(data) {
  const out = Buffer.alloc(data.length * 2 + 2);
  out[0] = 0xC0;
  let oi = 1;
  for (let di = 0; di < data.length; di++) {
    if (data[di] == 0xC0) {
      out[oi] = 0xDB;
      out[oi + 1] = 0xDC;
      oi += 2;
    } else if (data[di] == 0xDB) {
      out[oi] = 0xDB;
      out[oi + 1] = 0xDD;
      oi += 2;
    } else {
      out[oi] = data[di];
      oi += 1;
    }
  }
  out[oi] = 0xC0;
  return out.slice(0, oi + 1);
}
