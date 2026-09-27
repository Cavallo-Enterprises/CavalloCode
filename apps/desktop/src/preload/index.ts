import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Safe CavalloCode APIs exposed to the renderer process
const api = {
  // Serial port operations (IPC calls to main process)
  listSerialPorts: () => ipcRenderer.invoke('serial:list'),
  getSerialStatus: () => ipcRenderer.invoke('serial:status'),
  connectSerial: (port: string, baud: number) => ipcRenderer.invoke('serial:connect', port, baud),
  disconnectSerial: () => ipcRenderer.invoke('serial:disconnect'),
  sendSerialData: (data: string) => ipcRenderer.invoke('serial:send', data),

  // Native workspace file operations
  openDirectory: () => ipcRenderer.invoke('fs:open-directory'),
  readFile: (path: string) => ipcRenderer.invoke('fs:read-file', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:write-file', path, content),
  readDirectory: (path: string) => ipcRenderer.invoke('fs:read-directory', path),
  createProjectTemplate: (name: string, template: 'esp32' | 'arduino-uno' | 'arduino-nano' | 'pico') => ipcRenderer.invoke('project:create-template', name, template),

  onSerialData: (callback: (data: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: string) => callback(data)
    ipcRenderer.on('serial:data-received', listener)
    return () => ipcRenderer.removeListener('serial:data-received', listener)
  },
  onSerialError: (callback: (message: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message)
    ipcRenderer.on('serial:error', listener)
    return () => ipcRenderer.removeListener('serial:error', listener)
  },
  cavallo: {
    listPorts: () => ipcRenderer.invoke('serial:list'),
    getStatus: () => ipcRenderer.invoke('serial:status'),
    connectSerial: (port: string, baud: number) => ipcRenderer.invoke('serial:connect', port, baud),
    disconnectSerial: () => ipcRenderer.invoke('serial:disconnect'),
    sendSerialData: (data: string) => ipcRenderer.invoke('serial:send', data),
    onSerialData: (callback: (data: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: string) => callback(data)
      ipcRenderer.on('serial:data-received', listener)
      return () => ipcRenderer.removeListener('serial:data-received', listener)
    },
  },

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Hardware operations
  compileProject: (projectPath: string, board?: string) => ipcRenderer.invoke('hardware:compile', projectPath, board),
  flashHardware: (board: string, port: string, artifactPath: string) => ipcRenderer.invoke('hardware:flash', board, port, artifactPath),
  flashESP32: (port: string, binPath: string) => ipcRenderer.invoke('hardware:flash-esp32', port, binPath),
  flashArduino: (board: 'uno' | 'nano', port: string, hexPath: string) => ipcRenderer.invoke('hardware:flash-arduino', board, port, hexPath),
  onHardwareBuildLog: (callback: (line: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, line: string) => callback(line)
    ipcRenderer.on('hardware:build-log', listener)
    return () => ipcRenderer.removeListener('hardware:build-log', listener)
  },

  startDebug: (targetElf: string, gdbPath?: string, breakpoints?: Array<{ file: string; line: number }>) => ipcRenderer.invoke('debug:start', targetElf, gdbPath, breakpoints),
  debugStepOver: () => ipcRenderer.invoke('debug:step-over'),
  debugStepInto: () => ipcRenderer.invoke('debug:step-into'),
  debugStepOut: () => ipcRenderer.invoke('debug:step-out'),
  debugContinue: () => ipcRenderer.invoke('debug:continue'),
  debugPause: () => ipcRenderer.invoke('debug:pause'),
  debugRestart: () => ipcRenderer.invoke('debug:restart'),
  debugStop: () => ipcRenderer.invoke('debug:stop'),
  debugEvaluate: (expression: string) => ipcRenderer.invoke('debug:evaluate', expression),
  debugSetBreakpoints: (points: Array<{ file: string; line: number }>) => ipcRenderer.invoke('debug:breakpoints', points),
  onDebugOutput: (callback: (event: { stream: string; text: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { stream: string; text: string }) => callback(data)
    ipcRenderer.on('debug:output', listener)
    return () => ipcRenderer.removeListener('debug:output', listener)
  },
  getAIConfig: () => ipcRenderer.invoke('ai:get-config'),
  configureAI: (config: { provider: 'openai' | 'gemini' | 'anthropic' | 'ollama'; apiKey: string; model: string; endpoint: string }) => ipcRenderer.invoke('ai:configure', config),
  askAI: (prompt: string, context: { code: string; fileName: string; board: string; logs: string }) => ipcRenderer.invoke('ai:ask', prompt, context),

  // Extension host
  getInstalledExtensions: () => ipcRenderer.invoke('ext:list'),
}


if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('cavallo', api.cavallo)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
  // @ts-ignore
  window.cavallo = api.cavallo
}

