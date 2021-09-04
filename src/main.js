"use strict";
exports.__esModule = true;
var electron_1 = require("electron");
var path = require("path");
var mainWindow = null;
var popupWindow = null;
var createWindow = function () {
    mainWindow = new electron_1.BrowserWindow({
        width: 600,
        height: 300,
        frame: false,
        hasShadow: false,
        titleBarStyle: "customButtonsOnHover",
        movable: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    mainWindow.loadFile(path.join(__dirname, "../index.html"));
    createPopupWindow();
    // Open the DevTools.
    // mainWindow.webContents.openDevTools()
};
var createPopupWindow = function () {
    popupWindow = new electron_1.BrowserWindow({
        parent: mainWindow,
        modal: true,
        show: false,
        width: 450,
        height: 250,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    popupWindow.loadFile(path.join(__dirname, "../popup.html"));
    popupWindow.on("show", function () {
        popupWindow.webContents.send("fromMain");
    });
};
electron_1.app.whenReady().then(function () {
    createWindow();
    electron_1.app.on("activate", function () {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
/* eslint-disable no-undef */
electron_1.app.on("window-all-closed", function () {
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
/* eslint-disable no-undef */
electron_1.ipcMain.on("sendSchedule", function () {
    mainWindow.restore();
    mainWindow.setAlwaysOnTop(true);
});
electron_1.ipcMain.on("hideWindow", function () {
    mainWindow.minimize();
});
electron_1.ipcMain.on("showPopup", function () {
    popupWindow.show();
});
electron_1.ipcMain.on("hidePopup", function () {
    popupWindow.hide();
});
