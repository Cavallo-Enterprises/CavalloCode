import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface WorkspaceEntry {
    name: string
    path: string
    isDirectory: boolean
  }

  interface CavalloAPI {
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
  }
}
