import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { EventEmitter } from 'events'

export const debuggerEvents = new EventEmitter()
let gdbProcess: ChildProcessWithoutNullStreams | null = null
let currentElf = ''

export function startGDB(targetElf: string, gdbPath = 'arm-none-eabi-gdb', breakpoints: Array<{ file: string; line: number }> = []) {
  stopGDB()
  currentElf = targetElf
  const process = spawn(gdbPath, [targetElf], { windowsHide: true })
  gdbProcess = process
  const forward = (stream: 'stdout' | 'stderr') => (chunk: Buffer) => debuggerEvents.emit('output', { stream, text: chunk.toString() })
  process.stdout.on('data', forward('stdout'))
  process.stderr.on('data', forward('stderr'))
  process.on('error', (error) => debuggerEvents.emit('output', { stream: 'stderr', text: error.message }))
  process.on('close', (code) => {
    if (gdbProcess === process) gdbProcess = null
    debuggerEvents.emit('output', { stream: 'stdout', text: `GDB exited (${code ?? 'unknown'}).\n` })
  })
  process.stdin.write('target remote localhost:3333\n')
  for (const point of breakpoints) process.stdin.write(`break "${point.file.replace(/"/g, '\\"')}":${point.line}\n`)
  process.stdin.write('info locals\ninfo registers\nbt\n')
  return { success: true, elf: currentElf }
}

function sendCommand(command: string) {
  if (!gdbProcess || gdbProcess.killed) return { success: false, error: 'GDB is not running.' }
  gdbProcess.stdin.write(`${command}\n`)
  return { success: true }
}

export const debugContinue = () => sendCommand('continue')
export const debugStepOver = () => sendCommand('next')
export const debugStepInto = () => sendCommand('step')
export const debugStepOut = () => sendCommand('finish')
export const debugPause = () => sendCommand('\u0003')
export const debugRestart = () => sendCommand('monitor reset halt\nload\ncontinue')
export const debugEvaluate = (expression: string) => sendCommand(`print ${expression.replace(/[\r\n]/g, '')}`)

export function stopGDB() {
  if (gdbProcess && !gdbProcess.killed) gdbProcess.kill()
  gdbProcess = null
  return { success: true }
}
