import type { Buffer } from 'buffer';
import type { IFlashArgs } from '..';

//First byte of the application image
const ESP_IMAGE_MAGIC = 0xe9;

export default function update_image_flash_params(address: number, args: IFlashArgs, image: Buffer,
  bootloaderFlashOffset: number, supportedFlashSizes: Record<string, number>): Buffer {
  if (address != bootloaderFlashOffset) {
    return image;  // not flashing bootloader offset, so don't modify this
  }

  const magic = image[0]!;
  let flash_mode = image[2]!;
  let flash_freq = image[3]! & 0x0F;
  let flash_size = image[3]! & 0xF0;

  if (magic != ESP_IMAGE_MAGIC) {
    console.warn(`Warning: Image file at ${address} doesn't look like an image file, so not changing any flash settings.`);
    return image;
  }

  // TODO: verify bootloader image

  if (args.flashMode && args.flashMode != 'keep') {
    flash_mode = { 'qio': 0, 'qout': 1, 'dio': 2, 'dout': 3 }[args.flashMode]!;
  }

  if (args.flashFreq && args.flashFreq != 'keep') {
    flash_freq = { '40m': 0, '26m': 1, '20m': 2, '80m': 0xf }[args.flashFreq]!;
  }

  if (args.flashSize && args.flashSize != 'keep') {
    flash_size = parse_flash_size_arg(args.flashSize, supportedFlashSizes);
  }

  image[2] = flash_mode;
  image[3] = flash_freq | flash_size;

  return image;
}

function parse_flash_size_arg(arg: string, supportedFlashSizes: Record<string, number>): number {
  if (supportedFlashSizes[arg]) {
    return supportedFlashSizes[arg];
  } else {
    const sizes = Object.keys(supportedFlashSizes).join(', ');
    throw new Error(`Flash size '${arg}' is not supported by this chip type. Supported sizes: ${sizes}`);
  }
}
