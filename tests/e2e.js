// Uçtan uca testler: app/index.html tarayıcıda açılır, dosya açılır, düzenlenir ve kaydedilir.
// Çalıştırma: npm test   (önce build yapılır)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const FIX = path.join(__dirname, 'fixtures');
const OUT = path.join(ROOT, 'test-output');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
let saveNo = 0;

let browser;
const results = [];

async function newApp() {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') page.errors.push(m.text()); });
  await page.goto('file://' + path.join(ROOT, 'app', 'index.html') + '#test');
  await page.waitForFunction(() => window.__nm);
  return page;
}

async function openFiles(page, ...names) {
  await page.setInputFiles('#fileIn', names.map(n => path.join(FIX, n)));
  await page.waitForFunction(n => window.__nm.S.pages.length >= n && document.querySelector('#busy').hidden, names.length);
  // PDF nesne modunun bitmesini bekle
  await page.waitForFunction(() => window.__nm.OBJQ.length === 0 && window.__nm.S.pages.every(p => p.kind !== 'pdf' || p.objMode || p.objTried || !window.__nm.S.objAuto), null, { timeout: 30000 });
  await page.waitForTimeout(200);
}

// Kaydet penceresinden kaydeder, inen dosyanın yolunu döndürür
async function save(page, fmt = 'pdf', { flat = false, name = 'kayit' + (++saveNo) } = {}) {
  await page.click('#saveBtn');
  await page.check(`input[name="svf"][value="${fmt}"]`);
  if (fmt === 'pdf') await page.setChecked('#svFlat', flat);
  await page.fill('#svName', name);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('#svGo')]);
  const file = path.join(OUT, dl.suggestedFilename());
  await dl.saveAs(file);
  return file;
}

// PDF'teki yazıyı sayfa sayfa çıkarır (programın kendi pdf.js'i ile)
async function pdfText(page, file) {
  const b64 = fs.readFileSync(file).toString('base64');
  return page.evaluate(async b64 => {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
    const out = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const tc = await (await doc.getPage(i)).getTextContent();
      out.push(tc.items.map(t => t.str).join(' ').replace(/\s+/g, ' '));
    }
    return out;
  }, b64);
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }

async function test(name, fn) {
  const page = await newApp();
  try {
    await fn(page);
    assert(!page.errors.length, 'Sayfa hataları: ' + page.errors.join(' | '));
    results.push([true, name]);
    console.log('  ✓ ' + name);
  } catch (e) {
    results.push([false, name, e.message]);
    console.log('  ✗ ' + name + '\n      ' + e.message.split('\n')[0]);
    await page.screenshot({ path: path.join(OUT, name.replace(/[^\w]+/g, '_') + '.png') }).catch(() => {});
  } finally {
    await page.close();
  }
}

(async () => {
  browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  console.log('Nusmac Document testleri');

  await test('Program hatasız açılıyor', async page => {
    assert(await page.isVisible('#saveBtn'), 'Kaydet düğmesi yok');
  });

  await test('PDF açılır, yazılar nesne olur, değişmeden kaydedilir', async page => {
    await openFiles(page, 'turkce.pdf');
    const n = await page.evaluate(() => window.__nm.S.pages[0].anns.filter(a => a.auto && a.type === 'text').length);
    assert(n === 3, `3 yazı satırı bekleniyordu, ${n} bulundu`);
    const t = await pdfText(page, await save(page));
    assert(t.length === 2, 'Sayfa sayısı 2 olmalı');
    assert(t[0].includes('Şişli İlçe Müdürlüğüne'), 'Türkçe yazı kayboldu: ' + t[0]);
  });

  await test('PDF satırı düzenlenince yazı seçilebilir metin olarak kaydedilir', async page => {
    await openFiles(page, 'turkce.pdf');
    await page.evaluate(() => {
      const { S, renderOv, pushUndo } = window.__nm; pushUndo();
      const a = S.pages[0].anns.find(a => a.auto && a.text.startsWith('Konu'));
      a.text = 'Konu: Düzeltilmiş satır ğüşıöç'; renderOv(S.pages[0]);
    });
    const t = await pdfText(page, await save(page));
    assert(t[0].includes('Düzeltilmiş satır ğüşıöç'), 'Düzenlenen satır metin olarak yok: ' + t[0]);
    assert(t[0].includes('Şişli İlçe Müdürlüğüne'), 'Diğer satırlar metin olarak yok: ' + t[0]);
    assert(!t[0].includes('12345'), 'Eski satır hâlâ dosyada: ' + t[0]);
  });

  await test('Eklenen metin kutusu seçilebilir metin olarak kaydedilir', async page => {
    await openFiles(page, 'turkce.pdf');
    await page.evaluate(() => {
      const { S, renderOv, pushUndo, nid } = window.__nm; pushUndo();
      S.pages[1].anns.push({ id: nid('a'), type: 'text', x: 72, y: 500, w: 300, h: 24, text: 'Eklenen not çğış', size: 14, color: '#c62828', bold: true, italic: false, underline: false, font: 'Arial', align: 'left', bg: null });
      renderOv(S.pages[1]);
    });
    const t = await pdfText(page, await save(page));
    assert(t[1].includes('Eklenen not çğış'), 'Eklenen metin seçilemiyor: ' + t[1]);
  });

  await test('Beyaz örtünün altındaki yazı dosyada kalmaz (nesne modu açık)', async page => {
    await openFiles(page, 'turkce.pdf');
    await page.evaluate(() => {
      const { S, renderOv, pushUndo, nid } = window.__nm; pushUndo();
      const a = S.pages[1].anns.find(a => a.auto && a.text.startsWith('Konu'));
      S.pages[1].anns.push({ id: nid('a'), type: 'white', x: a.x - 2, y: a.y - 2, w: a.w + 4, h: a.h + 4 });
      renderOv(S.pages[1]);
    });
    const t = await pdfText(page, await save(page));
    assert(!t[1].includes('12345'), 'Örtülen yazı PDF içinde duruyor: ' + t[1]);
    assert(t[1].includes('Şişli'), 'Örtülmeyen yazı kayboldu: ' + t[1]);
    assert(t[0].includes('12345'), 'Diğer sayfa etkilenmemeli: ' + t[0]);
  });

  await test('Beyaz örtünün altındaki yazı dosyada kalmaz (nesne modu kapalı)', async page => {
    await page.evaluate(() => { window.__nm.S.objAuto = false; });
    await openFiles(page, 'turkce.pdf');
    await page.evaluate(() => {
      const { S, renderOv, pushUndo, nid } = window.__nm; pushUndo();
      S.pages[0].anns.push({ id: nid('a'), type: 'white', x: 60, y: 190, w: 300, h: 24 });
      renderOv(S.pages[0]);
    });
    const t = await pdfText(page, await save(page));
    assert(!t[0].includes('12345'), 'Örtülen yazı PDF içinde duruyor: ' + t[0]);
  });

  await test('Word dosyası açılır ve PDF olarak seçilebilir metinle kaydedilir', async page => {
    await openFiles(page, 'ornek.docx');
    const t = await pdfText(page, await save(page));
    assert(t.join(' ').includes('DİLEKÇE BAŞLIĞI'), 'Word yazısı PDF içinde metin değil: ' + t.join(' | '));
    assert(t.join(' ').includes('ışığı söndürünüz'), 'Paragraf metni eksik: ' + t.join(' | '));
  });

  await test('Döndürülmüş PDF sayfasına eklenen metin doğru yönde kaydedilir', async page => {
    await openFiles(page, 'turkce.pdf');
    await page.evaluate(() => {
      const { S, renderOv, pushUndo, nid } = window.__nm; pushUndo();
      const p = S.pages[0]; p.rot = 90;
      p.anns.filter(a => !a.auto).length = 0;
      p.anns.push({ id: nid('a'), type: 'text', x: 40, y: 40, w: 300, h: 24, text: 'Döndürülmüş not', size: 14, color: '#111111', bold: false, italic: false, underline: false, font: 'Arial', align: 'left', bg: null });
    });
    const f = await save(page, 'pdf', { name: 'dondur' });
    const t = await pdfText(page, f);
    assert(t[0].includes('Döndürülmüş not'), 'Döndürülmüş sayfada metin yok: ' + t[0]);
    const info = await page.evaluate(async b64 => {
      const doc = await pdfjsLib.getDocument({ data: Uint8Array.from(atob(b64), c => c.charCodeAt(0)) }).promise;
      const pg = await doc.getPage(1); const vp = pg.getViewport({ scale: 1 });
      const it = (await pg.getTextContent()).items.find(i => i.str.includes('Döndürülmüş'));
      const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
      return { x, y, w: vp.width, h: vp.height };
    }, fs.readFileSync(f).toString('base64'));
    assert(info.w > info.h, 'Sayfa yatay olmalı');
    assert(Math.abs(info.x - 40) < 3 && info.y > 40 && info.y < 70, 'Metin yanlış yerde: ' + JSON.stringify(info));
  });

  await test('Word sayfasında beyaz örtünün altındaki kelime PDF’te kalmaz', async page => {
    await openFiles(page, 'ornek.docx');
    await page.evaluate(() => {
      const { S, pushUndo, nid } = window.__nm; pushUndo();
      S.pages[0].anns.push({ id: nid('a'), type: 'white', x: 0, y: 0, w: 595, h: 78 });
    });
    const t = (await pdfText(page, await save(page))).join(' ');
    assert(!t.includes('DİLEKÇE'), 'Örtülen başlık PDF içinde duruyor: ' + t);
    assert(t.includes('söndürünüz'), 'Örtülmeyen yazı kayboldu: ' + t);
  });

  await test('Yazdır: tüm sayfalar kâğıda hazırlanır', async page => {
    await openFiles(page, 'turkce.pdf');
    await openFiles(page, 'ornek.docx');
    await page.evaluate(() => {
      URL.revokeObjectURL = () => {};
      window.print = () => { window.__printed = document.getElementById('printArea').innerHTML; };
    });
    await page.keyboard.press('Control+p');
    await page.waitForFunction(() => window.__printed, null, { timeout: 30000 });
    const n = await page.evaluate(() => (window.__printed.match(/class="prpage"/g) || []).length);
    assert(n === 3, `3 sayfa bekleniyordu, ${n} hazırlandı`);
    // Yazdırma görünümünü PDF'e basıp sayfa sayısını kontrol et
    await page.evaluate(() => { document.getElementById('printArea').innerHTML = window.__printed; });
    const pdf = await page.pdf({ preferCSSPageSize: true });
    fs.writeFileSync(path.join(OUT, 'yazdir.pdf'), pdf);
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    assert(pages === 3, `Yazdırma çıktısı 3 sayfa olmalı, ${pages} oldu`);
  });

  await test('Word olarak kaydedilir', async page => {
    await openFiles(page, 'ornek.docx');
    const f = await save(page, 'docx');
    const buf = fs.readFileSync(f);
    assert(buf.slice(0, 2).toString() === 'PK', '.docx bir zip değil');
  });

  await test('JPG olarak kaydedilir', async page => {
    await openFiles(page, 'turkce.pdf');
    await page.click('#saveBtn');
    await page.check('input[name="svf"][value="jpg"]');
    await page.selectOption('#svRange', 'cur');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#svGo')]);
    const f = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(f);
    const b = fs.readFileSync(f);
    assert(b[0] === 0xff && b[1] === 0xd8, 'JPG değil');
  });

  await test('Düz görüntü PDF içinde yazı kalmaz', async page => {
    await openFiles(page, 'turkce.pdf');
    const t = await pdfText(page, await save(page, 'pdf', { flat: true }));
    assert(t.every(s => !s.trim()), 'Düz PDF içinde yazı var: ' + t.join(' | '));
  });

  await browser.close();
  const bad = results.filter(r => !r[0]);
  console.log(`\n${results.length - bad.length}/${results.length} test geçti`);
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
