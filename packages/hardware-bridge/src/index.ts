import { spawn } from 'child_process'
import { EventEmitter } from 'events'

export const hardwareBuildEvents = new EventEmitter()

function runTool(command: string, args: string[]): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true })
    let output = ''
    const forward = (chunk: Buffer) => {
      output += chunk.toString()
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (line) hardwareBuildEvents.emit('log', line)
      }
    }
    child.stdout.on('data', forward)
    child.stderr.on('data', forward)
    child.on('error', (error) => {
      const message = `[${command}] ${error.message}`
      hardwareBuildEvents.emit('log', message)
      resolve({ success: false, output: output + message + '\n' })
    })
    child.on('close', (code) => resolve({ success: code === 0, output }))
  })
}

export function compileProject(projectPath: string) {
  return runTool('platformio', ['run', '--project-dir', projectPath])
}

export function flashESP32(port: string, binPath: string) {
  return runTool('esptool.py', ['--chip', 'esp32', '--port', port, '--baud', '921600', 'write_flash', '-z', '0x10000', binPath])
}

export function flashArduino(board: 'uno' | 'nano', port: string, hexPath: string) {
  const part = board === 'nano' ? 'atmega328p' : 'atmega328p'
  return runTool('avrdude', ['-v', `-p${part}`, '-carduino', `-P${port}`, '-b115200', '-D', `-Uflash:w:${hexPath}:i`])
}

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
    return compileProject(projectPath)
  }
}

export class ESPToolBridge {
  static async flash(port: string, binPath: string) {
    return flashESP32(port, binPath)
  }
}
