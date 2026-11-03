const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  onOpenFile: (cb) => {
    ipcRenderer.on('open-file', (_e, f) => cb({ name: f.name, data: f.data }));
    ipcRenderer.send('renderer-ready');
  }
});
