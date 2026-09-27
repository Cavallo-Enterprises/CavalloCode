import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { EventEmitter } from 'node:events'
import { connectSerial, disconnectSerial, listPorts, sendSerialData } from './serial'

export const hardwareBuildEvents = new EventEmitter()

function runTool(command: string, args: string[]): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true })
    let output = ''
    let pending = ''
    let settled = false
    const forward = (chunk: Buffer) => {
      const text = chunk.toString()
      output += text
      pending += text
      const lines = pending.split(/\r?\n/)
      pending = lines.pop() || ''
      for (const line of lines) {
        if (line) hardwareBuildEvents.emit('log', line)
      }
    }
    child.stdout.on('data', forward)
    child.stderr.on('data', forward)
    child.on('error', (error) => {
      const spawnError = error as NodeJS.ErrnoException
      const message = spawnError.code === 'ENOENT'
        ? `[${command}] executable not found. Install it and add it to PATH, or configure its executable path.`
        : `[${command}] ${error.message}`
      hardwareBuildEvents.emit('log', message)
      if (!settled) { settled = true; resolve({ success: false, output: output + message + '\n' }) }
    })
    child.on('close', (code) => {
      if (pending) hardwareBuildEvents.emit('log', pending)
      if (!settled) { settled = true; resolve({ success: code === 0, output }) }
    })
  })
}

export async function compileProject(projectPath: string, board = '') {
  if (/pico|rp2040/i.test(board)) {
    const configure = await runTool(process.env.CAVALLO_CMAKE_PATH || 'cmake', ['-S', projectPath, '-B', join(projectPath, 'build')])
    if (!configure.success) return configure
    const build = await runTool(process.env.CAVALLO_CMAKE_PATH || 'cmake', ['--build', join(projectPath, 'build')])
    return { success: build.success, output: configure.output + build.output }
  }
  return runTool(process.env.CAVALLO_PLATFORMIO_PATH || 'platformio', ['run', '--project-dir', projectPath])
}

export function flashESP32(port: string, binPath: string) {
  return runTool(process.env.CAVALLO_ESPTOOL_PATH || 'esptool.py', ['--chip', 'esp32', '--port', port, '--baud', '921600', 'write_flash', '-z', '0x10000', binPath])
}

export function flashArduino(_board: 'uno' | 'nano', port: string, hexPath: string) {
  const part = 'atmega328p'
  return runTool(process.env.CAVALLO_AVRDUDE_PATH || 'avrdude', ['-v', `-p${part}`, '-carduino', `-P${port}`, '-b115200', '-D', `-Uflash:w:${hexPath}:i`])
}

export function flashHardware(board: string, port: string, artifactPath: string) {
  if (/uno|nano/i.test(board)) return flashArduino(/nano/i.test(board) ? 'nano' : 'uno', port, artifactPath)
  if (/pico|rp2040/i.test(board)) return runTool(process.env.CAVALLO_PICOTOOL_PATH || 'picotool', ['load', '-f', artifactPath])
  return flashESP32(port, artifactPath)
}

export class SerialManager {
  static async listPorts() {
    return listPorts()
  }

  static async connect(port: string, baudRate: number) {
    return connectSerial(port, baudRate)
  }

  static async disconnect() { return disconnectSerial() }
  static async send(data: string) { return sendSerialData(data) }
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
