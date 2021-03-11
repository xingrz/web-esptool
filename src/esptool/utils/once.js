export default function once(emitter, evt, timeout) {
  return new Promise((resolve, reject) => {
    let timer, listener;
    let ongoing = true;

    listener = (ret) => {
      if (ongoing) {
        ongoing = false;
        clearTimeout(timer);
        resolve(ret);
      }
    };

    timer = setTimeout(() => {
      if (ongoing) {
        ongoing = false;
        emitter.removeListener(evt, listener);
        reject(new Error('Timeout'));
      }
    }, timeout);

    emitter.once(evt, listener);
  });
}
