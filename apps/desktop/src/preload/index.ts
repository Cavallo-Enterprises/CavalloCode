import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Safe CavalloCode APIs exposed to the renderer process
const api = {
  // Serial port operations (IPC calls to main process)
  listSerialPorts: () => ipcRenderer.invoke('serial:list'),
  connectSerial: (port: string, baud: number) => ipcRenderer.invoke('serial:connect', port, baud),
  disconnectSerial: () => ipcRenderer.invoke('serial:disconnect'),
  sendSerialData: (data: string) => ipcRenderer.invoke('serial:send', data),

  // Native workspace file operations
  openDirectory: () => ipcRenderer.invoke('fs:open-directory'),
  readFile: (path: string) => ipcRenderer.invoke('fs:read-file', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:write-file', path, content),
  readDirectory: (path: string) => ipcRenderer.invoke('fs:read-directory', path),

  // Subscribe to incoming serial data from main
  onSerialData: (callback: (data: string) => void) => {
    ipcRenderer.on('serial:data', (_event, data) => callback(data));
  },
  removeSerialDataListener: () => {
    ipcRenderer.removeAllListeners('serial:data');
  },

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Hardware operations
  compileProject: (projectPath: string) => ipcRenderer.invoke('hardware:compile', projectPath),
  flashESP32: (port: string, binPath: string) => ipcRenderer.invoke('hardware:flash-esp32', port, binPath),
  flashArduino: (board: 'uno' | 'nano', port: string, hexPath: string) => ipcRenderer.invoke('hardware:flash-arduino', board, port, hexPath),
  onHardwareBuildLog: (callback: (line: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, line: string) => callback(line)
    ipcRenderer.on('hardware:build-log', listener)
    return () => ipcRenderer.removeListener('hardware:build-log', listener)
  },

  // Extension host
  getInstalledExtensions: () => ipcRenderer.invoke('ext:list'),
}


if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}

