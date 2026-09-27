import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Safe CavalloCode APIs exposed to the renderer process
const api = {
  // Serial port operations (IPC calls to main process)
  listSerialPorts: () => ipcRenderer.invoke('serial:list'),
  connectSerial: (port: string, baud: number) => ipcRenderer.invoke('serial:connect', port, baud),
  disconnectSerial: () => ipcRenderer.invoke('serial:disconnect'),
  sendSerialData: (data: string) => ipcRenderer.invoke('serial:send', data),

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
  compileHardware: (params?: any) => ipcRenderer.invoke('hardware:compile', params),
  flashHardware: (params?: any) => ipcRenderer.invoke('hardware:flash', params),

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

