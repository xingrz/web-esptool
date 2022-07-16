export default function formatMAC(bytes: number[]): string {
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join(':');
}
