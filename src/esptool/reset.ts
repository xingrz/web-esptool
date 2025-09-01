import sleep from './utils/sleep';

export const DEFAULT_RESET_DELAY_MS = 50;

const DTR = 'dataTerminalReady';
const RTS = 'requestToSend';

export interface ResetStrategy {
  reset(): Promise<void>;
}

export class ClassicReset implements ResetStrategy {
  constructor(
    private port: SerialPort,
    private delayMs = DEFAULT_RESET_DELAY_MS,
  ) { }

  async reset(): Promise<void> {
    console.log(`Issuing classic reset, delay=${this.delayMs}ms`);

    // IO0 = HIGH
    // EN = LOW, chip in reset
    await this.port.setSignals({ [DTR]: false, [RTS]: true });

    await sleep(100);

    // IO0 = LOW
    // EN = HIGH, chip out of reset
    await this.port.setSignals({ [DTR]: true, [RTS]: false });

    await sleep(this.delayMs);

    // IO0 = HIGH, done
    await this.port.setSignals({ [DTR]: false, [RTS]: false });
  }
}

export class USBJTAGSerialReset implements ResetStrategy {
  constructor(private port: SerialPort) { }

  async reset(): Promise<void> {
    console.log(`Issuing USB JTAG serial reset`);

    // Idle
    await this.port.setSignals({ [DTR]: false, [RTS]: false });

    await sleep(100);

    // Set IO0
    await this.port.setSignals({ [DTR]: true, [RTS]: false });

    await sleep(100);

    // Reset. Calls inverted to go through (1,1) instead of (0,0)
    await this.port.setSignals({ [RTS]: true });

    // RTS set as Windows only propagates DTR on RTS setting
    await this.port.setSignals({ [DTR]: false, [RTS]: true });

    await sleep(100);

    // Chip out of reset
    await this.port.setSignals({ [DTR]: false, [RTS]: false });
  }
}

export class HardReset implements ResetStrategy {
  constructor(private port: SerialPort) { }

  async reset(): Promise<void> {
    console.log(`Issuing hard reset`);

    await this.port?.setSignals({ [DTR]: false, [RTS]: true });  // EN->LOW
    await sleep(100);
    await this.port?.setSignals({ [DTR]: false, [RTS]: false });
  }
}
