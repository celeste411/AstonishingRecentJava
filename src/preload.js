const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("minecraftAPI", {
  sendProfileWithVersion: (data) => ipcRenderer.invoke("profile-with-version", data),
  runclient: (profilename) => ipcRenderer.invoke("runclient", profilename)
});
