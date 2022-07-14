export default function pad_image(data: Buffer, alignment: number, pad_character = 0xFF): Buffer {
  const pad_mod = data.length % alignment;
  if (pad_mod != 0) {
    data = Buffer.concat([data, Buffer.alloc(pad_mod, pad_character)]);
  }
  return data;
}
