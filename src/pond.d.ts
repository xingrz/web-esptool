declare module 'pond' {
  class Pond {
    spoon(): Promise<Buffer>;
  }
  export default function pond(input: Readable): Pond;
}
