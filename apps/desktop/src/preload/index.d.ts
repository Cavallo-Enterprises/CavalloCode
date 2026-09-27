import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface WorkspaceEntry {
    name: string
    path: string
    isDirectory: boolean
  }

  interface CavalloAPI {
    cavallo: {
      listPorts(): Promise<Array<{ path: string; manufacturer?: string; vendorId?: string; productId?: string; serialNumber?: string }>>
      connectSerial(port: string, baud: number): Promise<{ success: boolean }>
      disconnectSerial(): Promise<{ success: boolean }>
      sendSerialData(data: string): Promise<{ success: boolean }>
      onSerialData(callback: (data: string) => void): () => void
    }
    listSerialPorts(): Promise<Array<{ path: string; manufacturer?: string; vendorId?: string; productId?: string; serialNumber?: string }>>
    connectSerial(port: string, baud: number): Promise<{ success: boolean }>
    disconnectSerial(): Promise<{ success: boolean }>
    sendSerialData(data: string): Promise<{ success: boolean }>
    onSerialData(callback: (data: string) => void): () => void
    onSerialError(callback: (message: string) => void): () => void
    openDirectory(): Promise<string | null>
    readFile(path: string): Promise<string>
    writeFile(path: string, content: string): Promise<void>
    readDirectory(path: string): Promise<WorkspaceEntry[]>
    compileProject(projectPath: string): Promise<{ success: boolean; output: string }>
    flashESP32(port: string, binPath: string): Promise<{ success: boolean; output: string }>
    flashArduino(board: 'uno' | 'nano', port: string, hexPath: string): Promise<{ success: boolean; output: string }>
    onHardwareBuildLog(callback: (line: string) => void): () => void
    [key: string]: any
  }

  interface Window {
    electron: ElectronAPI
    api: CavalloAPI
    cavallo: CavalloAPI['cavallo']
  }
}
