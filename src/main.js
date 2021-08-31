const { app, BrowserWindow } = require("electron");
const { ipcMain } = require("electron");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 300,
    frame: false,
    hasShadow: false,
    // resizable: true,
    titleBarStyle: "customButtonOnHover",
    movable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("index.html");

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

/* eslint-disable no-undef */
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
/* eslint-disable no-undef */

ipcMain.on("sendSchedule", () => {
  mainWindow.show();
  mainWindow.setAlwaysOnTop(true);
});

ipcMain.on("hideWindow", () => {
  mainWindow.hide();
});
