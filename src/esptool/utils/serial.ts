import SerialPort from '@serialport/stream';
import { promisify } from 'util';

export function open(serial: SerialPort): Promise<void> {
  return promisify(serial.open.bind(serial))();
}

export function close(serial: SerialPort): Promise<void> {
  return promisify(serial.close.bind(serial))();
}

export async function closeGracefully(serial: SerialPort): Promise<void> {
  try {
    await close(serial);
  } catch (e) {
    // ignored
  }
}

export function set(serial: SerialPort, options: SerialPort.SetOptions): Promise<void> {
  return promisify(serial.set.bind(serial))(options);
}

export function update(serial: SerialPort, options: SerialPort.UpdateOptions): Promise<void> {
  return promisify(serial.update.bind(serial))(options);
}
