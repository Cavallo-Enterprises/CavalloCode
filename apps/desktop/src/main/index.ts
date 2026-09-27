import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'node:path'
import { promises as fs } from 'node:fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { compileProject, flashArduino, flashESP32, flashHardware, hardwareBuildEvents } from '../../../../packages/hardware-bridge/src/index'
import { connectSerial, disconnectSerial, getSerialStatus, listPorts, sendSerialData, serialEvents } from '../../../../packages/hardware-bridge/src/serial'
import { debugContinue, debugEvaluate, debugPause, debugRestart, debugSetBreakpoints, debugStepInto, debugStepOut, debugStepOver, debuggerEvents, startGDB, stopGDB } from '../../../../packages/hardware-bridge/src/debugger'
import { askAI, configureAI, getAIConfig, initializeAIService } from './aiService'
import { initializeUpdater } from './updater'
import { createProjectTemplate, ProjectTemplate } from '../../../../packages/hardware-bridge/src/templates'
import { ExtensionHostManager } from '../../../../packages/extension-host/src/host'
import esp32Plugin from '../../../../extensions/builtin-esp32/src/index'
import arduinoPlugin from '../../../../extensions/builtin-arduino/src/index'
import picoPlugin from '../../../../extensions/builtin-raspberrypi/src/index'

const extensionHost = new ExtensionHostManager()


function createWindow(): void {
  // Create the frameless browser window with custom titlebar.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#181818',
    title: 'CavalloCode - Hardware IDE',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })


  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Fallback to show window if ready-to-show takes too long
  setTimeout(() => {
    if (!mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show()
    }
  }, 3000)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Programmatic renderer console diagnostics
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] [${level}] ${message} (${sourceId}:${line})`)
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Renderer Load Failure] ${errorCode}: ${errorDescription} (${validatedURL})`)
    if (is.dev && validatedURL.startsWith('http')) {
      console.log('[Renderer] Falling back to local static build...')
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[Renderer Crash]', details)
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  const devUrl = process.env['ELECTRON_RENDERER_URL'] || 'http://localhost:5173'
  if (is.dev) {
    console.log(`[Main] Attempting to load renderer dev URL: ${devUrl}`)
    mainWindow.loadURL(devUrl).catch((err) => {
      console.warn(`[Main] Failed to load ${devUrl}, falling back to static html:`, err)
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}


app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.cavallo.ide')
  initializeAIService(join(app.getPath('userData'), 'ai-settings.json'))
  initializeUpdater()
  await Promise.all([
    extensionHost.registerPlugin('builtin-esp32', esp32Plugin, 'builtin:esp32'),
    extensionHost.registerPlugin('builtin-arduino', arduinoPlugin, 'builtin:arduino'),
    extensionHost.registerPlugin('builtin-raspberrypi', picoPlugin, 'builtin:raspberrypi'),
  ])

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // ── IPC HANDLERS ──────────────────────────────────────────────────────────

  ipcMain.handle('fs:open-directory', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const options = { properties: ['openDirectory'] as Array<'openDirectory'> }
    const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options)
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle('fs:read-file', async (_event, path: string) => fs.readFile(path, 'utf8'))
  ipcMain.handle('fs:write-file', async (_event, path: string, content: string) => fs.writeFile(path, content, 'utf8'))
  ipcMain.handle('fs:read-directory', async (_event, path: string) => {
    const entries = await fs.readdir(path, { withFileTypes: true })
    return entries.map((entry) => ({ name: entry.name, path: join(path, entry.name), isDirectory: entry.isDirectory() }))
      .sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name))
  })
  ipcMain.handle('project:create-template', async (event, name: string, template: ProjectTemplate) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const options = { title: 'Choose the parent folder for the new project', properties: ['openDirectory', 'createDirectory'] as Array<'openDirectory' | 'createDirectory'> }
    const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths[0]) return null
    return createProjectTemplate(result.filePaths[0], name, template)
  })

  hardwareBuildEvents.on('log', (line: string) => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send('hardware:build-log', line)
    }
  })

  ipcMain.handle('serial:list', () => listPorts())
  ipcMain.handle('serial:status', () => getSerialStatus())
  ipcMain.handle('serial:connect', (_event, port: string, baud: number) => connectSerial(port, baud))
  ipcMain.handle('serial:disconnect', () => disconnectSerial())
  ipcMain.handle('serial:send', (_event, data: string) => sendSerialData(data))
  serialEvents.on('data', (chunk: string) => {
    for (const window of BrowserWindow.getAllWindows()) if (!window.isDestroyed()) window.webContents.send('serial:data-received', chunk)
  })
  serialEvents.on('error', (message: string) => {
    for (const window of BrowserWindow.getAllWindows()) if (!window.isDestroyed()) window.webContents.send('serial:error', message)
  })
  debuggerEvents.on('output', (data: { stream: string; text: string }) => {
    for (const window of BrowserWindow.getAllWindows()) if (!window.isDestroyed()) window.webContents.send('debug:output', data)
  })
  ipcMain.handle('debug:start', (_event, elf: string, gdbPath?: string, breakpoints?: Array<{ file: string; line: number }>) => startGDB(elf, gdbPath, breakpoints))
  ipcMain.handle('debug:step-over', () => debugStepOver())
  ipcMain.handle('debug:step-into', () => debugStepInto())
  ipcMain.handle('debug:step-out', () => debugStepOut())
  ipcMain.handle('debug:continue', () => debugContinue())
  ipcMain.handle('debug:pause', () => debugPause())
  ipcMain.handle('debug:restart', () => debugRestart())
  ipcMain.handle('debug:stop', () => stopGDB())
  ipcMain.handle('debug:evaluate', (_event, expression: string) => debugEvaluate(expression))
  ipcMain.handle('debug:breakpoints', (_event, points: Array<{ file: string; line: number }>) => debugSetBreakpoints(points))
  ipcMain.handle('ai:get-config', () => getAIConfig())
  ipcMain.handle('ai:configure', (_event, config) => configureAI(config))
  ipcMain.handle('ai:ask', (_event, prompt: string, context) => askAI(prompt, context))

  ipcMain.handle('ext:list', () => extensionHost.listPlugins())

  // Window controls IPC
  ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  ipcMain.handle('window:isMaximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win?.isMaximized() ?? false;
  });

  ipcMain.handle('hardware:compile', async (_event, projectPath: string, board?: string) => compileProject(projectPath, board))
  ipcMain.handle('hardware:flash', async (_event, board: string, port: string, artifactPath: string) => flashHardware(board, port, artifactPath))
  ipcMain.handle('hardware:flash-esp32', async (_event, port: string, binPath: string) => flashESP32(port, binPath))
  ipcMain.handle('hardware:flash-arduino', async (_event, board: 'uno' | 'nano', port: string, hexPath: string) => flashArduino(board, port, hexPath))

  createWindow()


  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => { void extensionHost.dispose() })

