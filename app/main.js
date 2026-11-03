const { app, BrowserWindow, Menu, ipcMain, session, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const OPENABLE = /\.(pdf|docx|doc|jpe?g|png|tiff?|webp|gif|bmp)$/i;
let win = null, ready = false;
const queue = [];

function filesFromArgs(argv) {
  return argv.slice(1).filter(a => !a.startsWith('-') && OPENABLE.test(a) && fs.existsSync(a));
}
function sendFile(p) {
  try {
    const buf = fs.readFileSync(p);
    const data = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    win.webContents.send('open-file', { name: path.basename(p), data });
  } catch (e) { /* unreadable file: ignore */ }
}
function openPaths(paths) {
  if (!paths.length) return;
  if (win && ready) paths.forEach(sendFile); else queue.push(...paths);
}

if (!app.requestSingleInstanceLock()) { app.quit(); }
else {
  app.on('second-instance', (_e, argv) => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
    openPaths(filesFromArgs(argv));
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    try { session.defaultSession.setSpellCheckerLanguages(['tr']); } catch (e) {}

    win = new BrowserWindow({
      width: 1400, height: 900, show: false,
      title: 'Nusmac Document',
      icon: path.join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
      backgroundColor: '#e2e4ea',
      webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: true, contextIsolation: true, sandbox: false }
    });
    win.maximize();
    win.once('ready-to-show', () => win.show());
    win.loadFile(path.join(__dirname, 'index.html'));

    ipcMain.on('renderer-ready', () => { ready = true; const q = queue.splice(0); q.forEach(sendFile); });
    openPaths(filesFromArgs(process.argv));

    // Kaydet: always ask where to save
    session.defaultSession.on('will-download', (_e, item) => {
      if (process.env.BM_TEST_DIR) { item.setSavePath(path.join(process.env.BM_TEST_DIR, item.getFilename())); return; }
      item.setSaveDialogOptions({ title: 'Kaydet', defaultPath: path.join(app.getPath('documents'), item.getFilename()) });
    });

    win.webContents.on('will-prevent-unload', (e) => {
      const r = dialog.showMessageBoxSync(win, { type: 'question', buttons: ['Kaydetmeden kapat', 'Vazgeç'], defaultId: 1, cancelId: 1, title: 'Nusmac Document', message: 'Kaydedilmemiş değişiklikler var.', detail: 'Kapatırsanız son kaydettiğiniz andan sonraki değişiklikler kaybolur.' });
      if (r === 0) e.preventDefault();
    });
    win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
    win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); } });

    // Turkish right-click menu with spelling suggestions
    win.webContents.on('context-menu', (_e, p) => {
      const t = [];
      if (p.misspelledWord) {
        p.dictionarySuggestions.slice(0, 6).forEach(s => t.push({ label: s, click: () => win.webContents.replaceMisspelling(s) }));
        if (!p.dictionarySuggestions.length) t.push({ label: 'Öneri yok', enabled: false });
        t.push({ label: 'Sözlüğe ekle', click: () => session.defaultSession.addWordToSpellCheckerDictionary(p.misspelledWord) });
        t.push({ type: 'separator' });
      }
      if (p.isEditable) {
        t.push({ label: 'Geri al', role: 'undo', enabled: p.editFlags.canUndo });
        t.push({ type: 'separator' });
        t.push({ label: 'Kes', role: 'cut', enabled: p.editFlags.canCut });
        t.push({ label: 'Kopyala', role: 'copy', enabled: p.editFlags.canCopy });
        t.push({ label: 'Yapıştır', role: 'paste', enabled: p.editFlags.canPaste });
        t.push({ label: 'Tümünü seç', role: 'selectAll' });
      } else if (p.selectionText && p.selectionText.trim()) {
        t.push({ label: 'Kopyala', role: 'copy' });
      }
      if (t.length) Menu.buildFromTemplate(t).popup({ window: win });
    });

    // Zoom and devtools shortcuts without a menu bar
    win.webContents.on('before-input-event', (e, input) => {
      if (input.type !== 'keyDown') return;
      if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
      if (input.key === 'F12' && input.control && input.shift) { win.webContents.toggleDevTools(); e.preventDefault(); }
    });
  });

  app.on('open-file', (e, p) => { e.preventDefault(); openPaths([p]); });
  app.on('window-all-closed', () => app.quit());
}
