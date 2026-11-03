const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

contextBridge.exposeInMainWorld('desktop', {
  onOpenFile: (cb) => {
    ipcRenderer.on('open-file', (_e, f) => cb({ name: f.name, data: f.data }));
    ipcRenderer.send('renderer-ready');
  },
  // PDF'e gerçek metin yazmak için yazı tipi dosyası okur.
  // sys=true: Windows yazı tipleri klasöründen (ör. arial.ttf), değilse programla gelen app/fonts klasöründen.
  readFont: (file, sys) => {
    if (!/^[\w.-]+\.ttf$/i.test(file)) return null;
    if (sys && process.platform !== 'win32') return null;
    const dir = sys ? path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts') : path.join(__dirname, 'fonts');
    try { const b = fs.readFileSync(path.join(dir, file)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); }
    catch (e) { return null; }
  }
});
