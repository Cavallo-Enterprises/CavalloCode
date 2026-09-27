import { SerialPort } from 'serialport'
import { EventEmitter } from 'events'

export const serialEvents = new EventEmitter()

let activePort: SerialPort | null = null

export async function listPorts() {
  return SerialPort.list()
}

export async function connectSerial(portPath: string, baudRate: number) {
  await disconnectSerial()
  const port = new SerialPort({ path: portPath, baudRate, autoOpen: false })
  await new Promise<void>((resolve, reject) => port.open((error) => error ? reject(error) : resolve()))
  activePort = port
  port.on('data', (chunk: Buffer) => serialEvents.emit('data', chunk.toString('utf8')))
  port.on('error', (error) => serialEvents.emit('error', error.message))
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
