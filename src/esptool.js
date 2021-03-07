import SerialPort from '@serialport/stream';
import WSABinding from 'serialport-binding-webserialapi';

SerialPort.Binding = WSABinding;

export default class ESPTool {

    open(path) {
        return new Promise((resolve) => {
            this.serial = new SerialPort(path, {
                baudRate: 115200,
                autoOpen: false,
            });

            this.serial.open((ret) => resolve(!ret));
        });
    }

    async flash(file, onProgress) {
        console.log(file);
        await new Promise((resolve) => {
            let i = 0;
            let t = setInterval(() => {
                onProgress(i);
                if (i >= 100) {
                    resolve();
                    clearInterval(t);
                }
                i++;
            }, 200);
        });
    }

}
