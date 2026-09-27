import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process'
import { EventEmitter } from 'node:events'

export const debuggerEvents = new EventEmitter()
let gdbProcess: ChildProcessWithoutNullStreams | null = null
let currentElf = ''
let activeBreakpoints: Array<{ file: string; line: number }> = []

export function startGDB(targetElf: string, gdbPath = process.env.CAVALLO_GDB_PATH || 'arm-none-eabi-gdb', breakpoints: Array<{ file: string; line: number }> = []) {
  stopGDB()
  currentElf = targetElf
  const child = spawn(gdbPath, [targetElf], { windowsHide: true })
  gdbProcess = child
  const forward = (stream: 'stdout' | 'stderr') => (chunk: Buffer) => debuggerEvents.emit('output', { stream, text: chunk.toString() })
  child.stdout.on('data', forward('stdout'))
  child.stderr.on('data', forward('stderr'))
  child.on('error', (error) => debuggerEvents.emit('output', { stream: 'stderr', text: error.message }))
  child.on('close', (code) => {
    if (gdbProcess === child) gdbProcess = null
    debuggerEvents.emit('output', { stream: 'stdout', text: `GDB exited (${code ?? 'unknown'}).\n` })
  })
  activeBreakpoints = breakpoints
  child.stdin.write(`target remote ${process.env.CAVALLO_OPENOCD_ENDPOINT || 'localhost:3333'}\n`)
  for (const point of breakpoints) child.stdin.write(`break "${point.file.replace(/"/g, '\\"')}":${point.line}\n`)
  child.stdin.write('info locals\ninfo registers\nbt\n')
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
export const debugPause = () => {
  if (!gdbProcess || gdbProcess.killed) return { success: false, error: 'GDB is not running.' }
  gdbProcess.kill('SIGINT')
  return { success: true }
}
export const debugRestart = () => sendCommand('monitor reset halt\nload\ncontinue')
export const debugEvaluate = (expression: string) => sendCommand(`print ${expression.replace(/[\r\n]/g, '')}`)

export function debugSetBreakpoints(points: Array<{ file: string; line: number }>) {
  const key = (point: { file: string; line: number }) => `${point.file}\0${point.line}`
  const next = new Map(points.map((point) => [key(point), point]))
  const current = new Map(activeBreakpoints.map((point) => [key(point), point]))
  for (const [id, point] of current) {
    if (!next.has(id)) {
      const safeFile = point.file.replace(/\\/g, '/').replace(/"/g, '\\"')
      sendCommand(`clear "${safeFile}":${point.line}`)
    }
  }
  for (const [id, point] of next) {
    if (!current.has(id)) {
      const safeFile = point.file.replace(/\\/g, '/').replace(/"/g, '\\"')
      sendCommand(`break "${safeFile}":${point.line}`)
    }
  }
  activeBreakpoints = points
  return { success: true }
}

export function stopGDB() {
  if (gdbProcess && !gdbProcess.killed) gdbProcess.kill()
  gdbProcess = null
  activeBreakpoints = []
  return { success: true }
}
