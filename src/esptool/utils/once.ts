import type { EventEmitter } from 'events';

export default async function once<T>(emitter: EventEmitter, evt: string, timeout: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const listener = (ret: T) => {
      clearTimeout(timer);
      resolve(ret);
    };

    const timer = setTimeout(() => {
      emitter.removeListener(evt, listener);
      reject(new Error('Timeout'));
    }, timeout);

    emitter.once(evt, listener);
  });

}
