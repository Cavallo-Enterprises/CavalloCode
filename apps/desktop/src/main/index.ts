import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { fork, ChildProcess } from 'child_process'
import { compileProject, flashArduino, flashESP32, hardwareBuildEvents } from '../../../../packages/hardware-bridge/src/index'


let extensionHostProcess: ChildProcess | null = null;

function startExtensionHost() {
  const hostPath = join(__dirname, '../../packages/extension-host/src/host.ts');
  console.log(`Starting extension host from ${hostPath}`);
  
  // In a real build, we would fork the compiled .js file
  extensionHostProcess = fork(hostPath, ['--run-worker'], {
    // env: process.env,
    // execArgv: ['--loader', 'ts-node/esm'] // If using ts-node
  });

  extensionHostProcess.on('message', (msg) => {
    console.log('Message from Extension Host:', msg);
  });
}

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


app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.cavallocode')

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

  hardwareBuildEvents.on('log', (line: string) => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send('hardware:build-log', line)
    }
  })

  // List available serial ports (stub; replace with node-serialport in real build)
  ipcMain.handle('serial:list', async () => {
    // Real impl: const { SerialPort } = await import('serialport');
    // return await SerialPort.list();
    return [
      { path: 'COM3', manufacturer: 'Arduino LLC' },
      { path: 'COM4', manufacturer: 'Silicon Labs (CP2102)' },
    ];
  });

  ipcMain.handle('serial:connect', async (_event, port: string, baud: number) => {
    console.log(`[MainProcess] Connecting to ${port} at ${baud}`);
    // Spawn SerialPort connection here and pipe data back via mainWindow.webContents.send('serial:data', chunk)
    return { success: true };
  });

  ipcMain.handle('serial:disconnect', async () => {
    console.log('[MainProcess] Disconnecting serial');
    return { success: true };
  });

  ipcMain.handle('serial:send', async (_event, data: string) => {
    console.log('[MainProcess] Serial TX:', data);
    return { success: true };
  });

  ipcMain.handle('ext:list', async () => {
    return [
      { id: 'builtin-esp32', name: 'ESP32 Support', version: '1.0.0' },
      { id: 'builtin-arduino', name: 'Arduino Support', version: '1.0.0' },
      { id: 'builtin-raspberrypi', name: 'Raspberry Pi Support', version: '1.0.0' },
    ];
  });

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

  ipcMain.handle('hardware:compile', async (_event, projectPath: string) => compileProject(projectPath))
  ipcMain.handle('hardware:flash-esp32', async (_event, port: string, binPath: string) => flashESP32(port, binPath))
  ipcMain.handle('hardware:flash-arduino', async (_event, board: 'uno' | 'nano', port: string, hexPath: string) => flashArduino(board, port, hexPath))

  ipcMain.on('ping', () => console.log('pong'))

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

