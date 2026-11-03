// Gerçek Electron programını açar: dosyayı komut satırından açtırır, PDF olarak kaydeder,
// yazı tiplerinin preload köprüsünden okunduğunu ve PDF'te metin olduğunu doğrular.
// Linux'ta: xvfb-run -a node tests/electron-smoke.js
const { _electron: electron } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
(async () => {
  const ROOT = path.join(__dirname, '..');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nusmac-'));
  const app = await electron.launch({ args: [ROOT, '--no-sandbox', path.join(__dirname, 'fixtures', 'ornek.docx')], env: { ...process.env, BM_TEST_DIR: dir } });
  const win = await app.firstWindow();
  const errors = []; win.on('pageerror', e => errors.push(e.message));
  const font = await win.evaluate(() => { const b = window.desktop.readFont('LiberationSans-Regular.ttf', false); return b ? b.byteLength : 0; });
  if (!font) throw new Error('Yazı tipi preload ile okunamadı');
  await win.waitForSelector('.tdoc', { timeout: 20000 });
  await win.click('#saveBtn'); await win.check('input[name="svf"][value="pdf"]'); await win.fill('#svName', 'electron'); await win.click('#svGo');
  const out = path.join(dir, 'electron.pdf');
  for (let i = 0; i < 100 && !(fs.existsSync(out) && fs.statSync(out).size > 0); i++) await new Promise(r => setTimeout(r, 200));
  await new Promise(r => setTimeout(r, 500));
  if (!fs.existsSync(out)) throw new Error('PDF kaydedilmedi');
  const txt = await win.evaluate(async b64 => {
    const doc = await pdfjsLib.getDocument({ data: Uint8Array.from(atob(b64), c => c.charCodeAt(0)) }).promise;
    return (await (await doc.getPage(1)).getTextContent()).items.map(i => i.str).join(' ');
  }, fs.readFileSync(out).toString('base64'));
  await app.close();
  if (!txt.includes('DİLEKÇE')) throw new Error('PDF içinde metin yok: ' + txt);
  if (errors.length) throw new Error('Sayfa hataları: ' + errors.join(' | '));
  console.log('Electron: program açıldı, Word dosyası açıldı, PDF kaydedildi, metin var ✓');
})().catch(e => { console.error('Electron testi başarısız:', e.message); process.exit(1); });
