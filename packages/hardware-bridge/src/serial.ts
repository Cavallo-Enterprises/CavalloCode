import { SerialPort } from 'serialport'
import { EventEmitter } from 'node:events'

export const serialEvents = new EventEmitter()

let activePort: SerialPort | null = null

export async function listPorts() {
  return SerialPort.list()
}

export function getSerialStatus() {
  return { connected: Boolean(activePort?.isOpen), port: activePort?.path || '', baudRate: activePort?.baudRate || 115200 }
}

export async function connectSerial(portPath: string, baudRate: number) {
  if (!Number.isInteger(baudRate) || baudRate < 1) throw new Error('Baud rate must be a positive integer.')
  await disconnectSerial()
  const port = new SerialPort({ path: portPath, baudRate, autoOpen: false })
  activePort = port
  port.on('data', (chunk: Buffer) => serialEvents.emit('data', chunk.toString('utf8')))
  port.on('error', (error) => serialEvents.emit('error', error.message))
  port.on('close', () => { if (activePort === port) activePort = null })
  try {
    await new Promise<void>((resolve, reject) => port.open((error) => error ? reject(error) : resolve()))
  } catch (error) {
    if (activePort === port) activePort = null
    if (port.isOpen) await new Promise<void>((resolve) => port.close(() => resolve()))
    throw error
  }
  return { success: true }
}

export async function disconnectSerial() {
  const port = activePort
  activePort = null
  if (!port?.isOpen) return { success: true }
  await new Promise<void>((resolve, reject) => port.close((error) => error ? reject(error) : resolve()))
  return { success: true }
}

export async function sendSerialData(data: string) {
  if (!activePort?.isOpen) throw new Error('No serial port is connected.')
  await new Promise<void>((resolve, reject) => activePort!.write(data, (error) => error ? reject(error) : activePort!.drain((drainError) => drainError ? reject(drainError) : resolve())))
  return { success: true }
}
