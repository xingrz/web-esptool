import type { IFlashArgs, IFlashPartition } from '@/esptool';

const MAGIC_FIRST = 0x0A324655;
const MAGIC_SECOND = 0x9E5D5157;
const MAGIC_FINAL = 0x0AB16F30;

const FLAG_NOT_MAIN_FLASH = 0x00000001;

export default async function readUf2(file: File): Promise<IFlashArgs | undefined> {
  const flashArgs = <IFlashArgs>{
    partitions: [],
  };

  let current: IFlashPartition | undefined;

  const image = Buffer.from(await file.arrayBuffer());
  if (image.length < 512 || image.length % 512 != 0) {
    console.error(`Invalid UF2: Invalid file size: ${image.length}`);
    return;
  }

  for (let i = 0; i < image.length; i += 512) {
    const block = image.slice(i, i + 512);

    if (block.readUInt32LE(0) != MAGIC_FIRST) {
      console.error(`Invalid UF2: Invalid first magic of block at offset ${i}`);
      return;
    }
    if (block.readUInt32LE(4) != MAGIC_SECOND) {
      console.error(`Invalid UF2: Invalid second magic of block at offset ${i}`);
      return;
    }
    if (block.readUInt32LE(508) != MAGIC_FINAL) {
      console.error(`Invalid UF2: Invalid final magic of block at offset ${i}`);
      return;
    }

    const flags = block.readUInt32LE(8);
    if ((flags & FLAG_NOT_MAIN_FLASH) != 0) {
      // Skip non flash blocks
      continue;
    }

    const targetAddr = block.readUInt32LE(12);
    const payloadSize = block.readUInt32LE(16);
    if (payloadSize > 476) {
      console.error(`Invalid UF2: Invalid payloadSize (${payloadSize}) of block at offset ${i}`);
      return;
    }

    // const blockNo = block.readUInt32LE(20);
    // const numBlocks = block.readUInt32LE(24);

    // const familyIdPresent = (flags & FLAG_FAMILYID_PRESENT) != 0;
    // const familyId = familyIdPresent ? block.readUInt32LE(28) : undefined;
    // const fileSize = familyIdPresent ? undefined : block.readUInt32LE(28);
    // TODO: Ensure familyId before flash

    const data = block.slice(32, 32 + payloadSize);

    if (current && current.address + current.image.length == targetAddr) {
      current.image = Buffer.concat([current.image, data]);
    } else {
      current = {
        address: targetAddr,
        image: data,
      };
      flashArgs.partitions.push(current);
    }
  }

  return flashArgs;
}
