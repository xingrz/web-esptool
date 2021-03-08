import { promisify } from 'util';
import yauzl from 'yauzl';
import pond from 'pond';

const fromBuffer = promisify(yauzl.fromBuffer);

// Hack yauzl
window.setImmediate = process.nextTick;

function readEntry(zip) {
  return new Promise((resolve) => {
    let onEntry, onEnd;

    onEntry = (entry) => {
      zip.removeListener('end', onEnd);
      resolve(entry);
    };

    onEnd = () => {
      zip.removeListener('entry', onEntry);
      resolve(null);
    };

    zip.once('entry', onEntry);
    zip.once('end', onEnd);
    zip.readEntry();
  });
}

export default async function unzip(file) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const zip = await fromBuffer(buffer, { lazyEntries: true });
  const openReadStream = promisify(zip.openReadStream.bind(zip));

  const entries = {};
  let entry;
  while ((entry = await readEntry(zip)) != null) {
    if (entry.fileName.endsWith('/')) {
      continue;
    }

    const stream = await openReadStream(entry);
    entries[`/${entry.fileName}`] = await pond(stream).spoon();
  }

  return entries;
}
