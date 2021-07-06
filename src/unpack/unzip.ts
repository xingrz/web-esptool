import { promisify } from 'util';
import yauzl, { Entry, Options, ZipFile } from 'yauzl';
import pond from 'pond';

const fromBuffer = promisify(yauzl.fromBuffer) as
  (buffer: Buffer, options?: Options) => Promise<ZipFile>;

// Hack yauzl
// @ts-ignore
window.setImmediate = process.nextTick;

function readEntry(zip: ZipFile): Promise<Entry | null> {
  return new Promise((resolve) => {
    const onEntry = (entry: Entry) => {
      zip.removeListener('end', onEnd);
      resolve(entry);
    };

    const onEnd = () => {
      zip.removeListener('entry', onEntry);
      resolve(null);
    };

    zip.once('entry', onEntry);
    zip.once('end', onEnd);
    zip.readEntry();
  });
}

export default async function unzip(file: File): Promise<Record<string, Buffer>> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const zip = await fromBuffer(buffer, { lazyEntries: true });
  const openReadStream = promisify(zip.openReadStream.bind(zip));

  const entries: Record<string, Buffer> = {};
  let entry;
  while ((entry = await readEntry(zip)) != null) {
    if (entry.fileName.endsWith('/')) {
      continue;
    }

    const stream = await openReadStream(entry);
    entries[`/${entry.fileName}`] = await pond(stream).spoon()!;
  }

  return entries;
}
