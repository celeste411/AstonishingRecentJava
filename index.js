const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const start = require('./src/compiledlibrary.js');
let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('testingfrontendtogetthefeaturesworking/index.html');
});

ipcMain.handle('profile-with-version', (event, data) => {
  const { profileName, version } = data;
  console.log(`🚀 Creating profile "${profileName}" with version "${version.id}"`);
  start.addprofile(profileName, version);
});
ipcMain.handle('runclient', (event, profilename) => {
  start.runprofileunderclient(profilename);
  console.log(`🚀 Running profile "${profilename}"`);
});
