export default function hex(v, bytes = 1) {
  return `0x${v.toString(16).padStart(bytes * 2, '0')}`;
}
