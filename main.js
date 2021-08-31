const { app, BrowserWindow } = require('electron')
const { ipcMain } = require('electron')

const path = require('path')
let mainWindow = null;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 300,
    frame: false,
    hasShadow: false,
    // resizable: true,
    titleBarStyle: 'customButtonOnHover',
    movable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('sendSchedule', (event, arg) => {
  mainWindow.show();
  mainWindow.setAlwaysOnTop(true);
})

ipcMain.on('hideWindow', (event, arg) => {
  mainWindow.hide();
})
