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

