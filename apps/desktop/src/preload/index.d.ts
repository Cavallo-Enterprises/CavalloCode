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
      getStatus(): Promise<{ connected: boolean; port: string; baudRate: number }>
      connectSerial(port: string, baud: number): Promise<{ success: boolean }>
      disconnectSerial(): Promise<{ success: boolean }>
      sendSerialData(data: string): Promise<{ success: boolean }>
      onSerialData(callback: (data: string) => void): () => void
    }
    listSerialPorts(): Promise<Array<{ path: string; manufacturer?: string; vendorId?: string; productId?: string; serialNumber?: string }>>
    getSerialStatus(): Promise<{ connected: boolean; port: string; baudRate: number }>
    connectSerial(port: string, baud: number): Promise<{ success: boolean }>
    disconnectSerial(): Promise<{ success: boolean }>
    sendSerialData(data: string): Promise<{ success: boolean }>
    onSerialData(callback: (data: string) => void): () => void
    onSerialError(callback: (message: string) => void): () => void
    openDirectory(): Promise<string | null>
    readFile(path: string): Promise<string>
    writeFile(path: string, content: string): Promise<void>
    readDirectory(path: string): Promise<WorkspaceEntry[]>
    createProjectTemplate(name: string, template: 'esp32' | 'arduino-uno' | 'arduino-nano' | 'pico'): Promise<string | null>
    compileProject(projectPath: string, board?: string, platformioPath?: string): Promise<{ success: boolean; output: string }>
    openNewWindow(): Promise<void>
    openExternal(url: string): Promise<void>
    flashHardware(board: string, port: string, artifactPath: string): Promise<{ success: boolean; output: string }>
    flashESP32(port: string, binPath: string): Promise<{ success: boolean; output: string }>
    flashArduino(board: 'uno' | 'nano', port: string, hexPath: string): Promise<{ success: boolean; output: string }>
    onHardwareBuildLog(callback: (line: string) => void): () => void
    startDebug(targetElf: string, gdbPath?: string, breakpoints?: Array<{ file: string; line: number }>): Promise<{ success: boolean; elf: string }>
    debugStepOver(): Promise<{ success: boolean; error?: string }>
    debugStepInto(): Promise<{ success: boolean; error?: string }>
    debugStepOut(): Promise<{ success: boolean; error?: string }>
    debugContinue(): Promise<{ success: boolean; error?: string }>
    debugPause(): Promise<{ success: boolean; error?: string }>
    debugRestart(): Promise<{ success: boolean; error?: string }>
    debugStop(): Promise<{ success: boolean }>
    debugEvaluate(expression: string): Promise<{ success: boolean; error?: string }>
    debugSetBreakpoints(points: Array<{ file: string; line: number }>): Promise<{ success: boolean }>
    onDebugOutput(callback: (event: { stream: string; text: string }) => void): () => void
    getAIConfig(): Promise<{ provider: 'openai' | 'gemini' | 'anthropic' | 'ollama'; apiKey: string; hasApiKey: boolean; model: string; endpoint: string }>
    configureAI(config: { provider: 'openai' | 'gemini' | 'anthropic' | 'ollama'; apiKey: string; model: string; endpoint: string }): Promise<{ success: boolean }>
    askAI(prompt: string, context: { code: string; fileName: string; board: string; logs: string }): Promise<string>
    checkForUpdates(): Promise<unknown>
    restartAndInstallUpdate(): Promise<{ success: boolean }>
    onUpdaterEvent(channel: 'updater:checking-for-update' | 'updater:update-available' | 'updater:update-not-available' | 'updater:download-progress' | 'updater:update-downloaded' | 'updater:error', callback: (payload?: unknown) => void): () => void
    [key: string]: any
  }

  interface Window {
    electron: ElectronAPI
    api: CavalloAPI
    cavallo: CavalloAPI['cavallo']
  }
}
