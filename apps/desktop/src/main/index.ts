import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { fork, ChildProcess } from 'child_process'

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
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
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

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
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

