const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')
const start = require('./Forgerun.js')


function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // WARNING: Only use this for prototyping
    }
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('do-node-stuff', async () => {
    start.start()
  })
})
