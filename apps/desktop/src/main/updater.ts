import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'

export function initializeUpdater() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  const broadcast = (channel: string, payload?: unknown) => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send(channel, payload)
    }
  }

  autoUpdater.on('checking-for-update', () => broadcast('updater:checking-for-update'))
  autoUpdater.on('update-available', (info) => broadcast('updater:update-available', info))
  autoUpdater.on('update-not-available', (info) => broadcast('updater:update-not-available', info))
  autoUpdater.on('download-progress', (progress) => broadcast('updater:download-progress', progress))
  autoUpdater.on('update-downloaded', (info) => broadcast('updater:update-downloaded', info))
  autoUpdater.on('error', (error) => broadcast('updater:error', error.message))

  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) return { skipped: true, reason: 'Updates are checked in packaged releases.' }
    return autoUpdater.checkForUpdates()
  })
  ipcMain.handle('updater:restart-and-install', () => {
    autoUpdater.quitAndInstall()
    return { success: true }
  })

  if (app.isPackaged) void autoUpdater.checkForUpdates().catch((error: unknown) => {
    broadcast('updater:error', error instanceof Error ? error.message : String(error))
  })
}
