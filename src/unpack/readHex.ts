import { IFlashArgs } from '@/esptool';

export default async function readHex(file: File): Promise<IFlashArgs | null> {
  const flashArgs: IFlashArgs = {
    partitions: [],
  };

  let partAddr = 0;
  let partData = Buffer.alloc(0);
  let extended = 0;

  const content = await file.text();
  for (const line of content.split(/\r?\n/)) {
    if (!line) continue;
    if (!line.match(/^:[0-9A-Fa-f]+$/) || line.length % 2 != 1) {
      console.error(`Invalid HEX: Invalid line format, line: "${line}"`);
      return null;
    }

    const buffer = Buffer.from(line.substring(1), 'hex');

    // verify byte_count
    if (1 + 2 + 1 + buffer[0] + 1 != buffer.length) {
      console.error(`Invalid HEX: Invalid byte count, line: "${line}"`);
      return null;
    }

    // verify checksum
    if (buffer.reduce((prev, curr) => (prev + curr) & 0xFF, 0x00) != 0x00) {
      console.error(`Invalid HEX: Invalid checksum, line: "${line}"`);
      return null;
    }

    const address = buffer.readUInt16BE(1);
    const recordType = buffer.readUInt8(3);
    const data = buffer.slice(4, buffer.length - 1);

    if (recordType == 0x01) {
      flashArgs.partitions.push({
        address: partAddr,
        image: partData,
      });
      partAddr = 0;
      partData = Buffer.alloc(0);
      extended = 0;
      break;
    }

    switch (recordType) {
      case 0x00: {
        if (partAddr + partData.length == extended + address) {
          partData = Buffer.concat([partData, data]);
        } else {
          flashArgs.partitions.push({
            address: partAddr,
            image: partData,
          });
          partAddr = extended + address;
          partData = Buffer.alloc(0);
        }
        break;
      }
      case 0x02: {
        if (data.length != 2) {
          console.error(`Invalid HEX: Invalid data length, line: "${line}"`);
          return null;
        }
        const nextExtend = data.readUInt16BE() << 4;
        if (partAddr + partData.length == nextExtend) {
          extended = nextExtend;
        } else {
          flashArgs.partitions.push({
            address: partAddr,
            image: partData,
          });
          partAddr = nextExtend;
          partData = Buffer.alloc(0);
          extended = nextExtend;
        }
        break;
      }
      case 0x04: {
        console.error(`Invalid HEX: Linear address is not supported, line: "${line}"`);
        return null;
      }
      default: {
        console.warn(`Ignored unsupported record type 0x${recordType.toString(16)}, line: "${line}"`);
      }
    }
  }

  return flashArgs;
}
