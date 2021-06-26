export default function hex(v: number, bytes = 1): string {
  return `0x${v.toString(16).padStart(bytes * 2, '0')}`;
}
