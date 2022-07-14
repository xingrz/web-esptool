// Initial state for the checksum routine
const ESP_CHECKSUM_MAGIC = 0xef;

export default function checksum(data: Buffer): number {
  let state = ESP_CHECKSUM_MAGIC;
  for (const b of data) {
    state ^= b;
  }
  return state;
}
