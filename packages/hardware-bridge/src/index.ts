// Stub for hardware bridge interacting with serialport, esptool, platformio, avrdude

export class SerialManager {
  static async listPorts() {
    // In real implementation: import { SerialPort } from 'serialport';
    // return await SerialPort.list();
    return [
      { path: 'COM3', manufacturer: 'Arduino LLC' },
      { path: 'COM4', manufacturer: 'Silicon Labs' }
    ];
  }

  static async connect(port: string, baudRate: number) {
    console.log(`Connecting to ${port} at ${baudRate} baud...`);
    // return new SerialPort({ path: port, baudRate });
  }
}

export class PlatformIOBridge {
  static async compile(projectPath: string) {
    console.log(`Running pio run in ${projectPath}`);
    // return execa('pio', ['run'], { cwd: projectPath });
  }
}

export class ESPToolBridge {
  static async flash(port: string, binPath: string) {
    console.log(`Flashing ${binPath} to ${port} using esptool.py`);
    // return execa('esptool.py', ['--port', port, 'write_flash', '0x10000', binPath]);
  }
}
