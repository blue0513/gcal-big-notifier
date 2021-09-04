const { app, BrowserWindow } = require("electron");
const { ipcMain } = require("electron");

let mainWindow = null;
let popupWindow = null;

const createWindow = () => {
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
  createPopupWindow();

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
};

const createPopupWindow = () => {
  popupWindow = new BrowserWindow({
    parent: mainWindow,
    modal: true,
    show: false,
    width: 450,
    height: 250,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  popupWindow.loadFile("popup.html");

  popupWindow.on("show", () => {
    popupWindow.webContents.send("fromMain", "ABC");
  });
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

/* eslint-disable no-undef */
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
/* eslint-disable no-undef */

ipcMain.on("sendSchedule", () => {
  mainWindow.restore();
  mainWindow.setAlwaysOnTop(true);
});

ipcMain.on("hideWindow", () => {
  mainWindow.minimize();
});

ipcMain.on("showPopup", () => {
  popupWindow.show();
});

ipcMain.on("hidePopup", () => {
  popupWindow.hide();
});
