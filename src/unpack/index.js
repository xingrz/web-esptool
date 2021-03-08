import unzip from './unzip';

export default async function unpack(file) {
  const entries = await unzip(file);

  const { dir, content } = findFlashArgs(entries) || {};
  if (content == null) {
    return null;
  }

  const args = Buffer.from(content)
    .toString()
    .replace(/\n/g, ' ')
    .split(' ')
    .map(i => i.trim())
    .filter(i => !!i);

  const flashArgs = {
    flashMode: 'qio',
    partitions: [],
  };

  for (let i = 0; i < args.length - 1; i++) {
    if (args[i] == '--flash_mode') {
      flashArgs.flashMode = args[i + 1];
    } else if (args[i].match(/^0x([A-Fa-f0-9]+)$/)) {
      const address = parseInt(RegExp.$1, 16);
      const key = `${dir}/${args[i + 1]}`;
      if (entries[key]) {
        flashArgs.partitions.push({ address, image: entries[key] });
      }
    } else if (args[i].match(/^([0-9]+)$/)) {
      const address = parseInt(RegExp.$1);
      const key = `${dir}/${args[i + 1]}`;
      if (entries[key]) {
        flashArgs.partitions.push({ address, image: entries[key] });
      }
    }
  }

  return flashArgs;
}

function findFlashArgs(entries) {
  for (const name in entries) {
    if (name.match(/^(.*)\/flash_args$/)) {
      return {
        dir: RegExp.$1,
        content: entries[name],
      };
    }
  }
  return null;
}
