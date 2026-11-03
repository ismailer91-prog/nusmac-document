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

  await test('Sekmeler ve vekil düğmeler çalışır', async page => {
    await page.click('[data-tab="sayfa"]');
    assert(await page.isVisible('#rotL'), 'Sayfa sekmesi açılmadı');
    assert(!(await page.isVisible('#saveBtn')), 'Giriş sekmesi gizlenmedi');
    // hızlı erişimdeki Kaydet, asıl Kaydet düğmesini çalıştırır (boş belgede uyarı verir)
    await page.click('.qat [data-proxy="#saveBtn"]');
    assert((await page.textContent('#toast')).includes('Kaydedilecek sayfa yok'), 'Vekil Kaydet çalışmadı');
    assert(await page.isDisabled('#undoBtn'), 'Geri al kapalı olmalı');
  });

  await test('Nesne ağacı: gizlenen yazı kaydedilmez, kilitlenen seçilemez', async page => {
    await openFiles(page, 'turkce.pdf');
    await page.waitForSelector('.ti');
    const n = (await page.$$('.ti')).length;
    assert(n === 3, `Ağaçta 3 yazı satırı bekleniyordu, ${n} var`);
    // 2. satırı gizle
    await page.locator('.ti input').nth(1).click();
    assert(await page.evaluate(() => window.__nm.S.pages[0].anns.filter(a => a.hid).length === 1), 'Gizleme işlenmedi');
    // 3. satırı kilitle; sayfada tıklanamamalı
    await page.locator('.ti .tl').nth(2).click();
    const pe = await page.evaluate(() => { const a = window.__nm.S.pages[0].anns.find(a => a.lock); const d = document.querySelector(`[data-aid="${a.id}"]`); return d && getComputedStyle(d).pointerEvents; });
    assert(pe === 'none', 'Kilitli nesne hâlâ tıklanabilir: ' + pe);
    const t = await pdfText(page, await save(page));
    assert(!t[0].includes('12345'), 'Gizlenen satır kaydedildi: ' + t[0]);
    assert(t[0].includes('Çalışma ağacı'), 'Kilitli satır kaydedilmeli: ' + t[0]);
    // Geri al: gizleme geri gelir
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z');
    assert(await page.evaluate(() => !window.__nm.S.pages[0].anns.some(a => a.hid)), 'Geri al gizlemeyi geri getirmedi');
  });

  // Türkçe yazılı bir "taranmış" PNG üretir ve açar
  async function openScan(page) {
    const b64 = await page.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 1240; c.height = 1754; const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#111'; x.font = '44px Arial';
      x.fillText('Şişli İlçe Müdürlüğüne', 120, 200); x.fillText('Konu: Gizli bilgi 12345', 120, 290); x.fillText('Çalışma ağacı öğütücü ışık', 120, 380);
      return c.toDataURL('image/png').split(',')[1];
    });
    await page.setInputFiles('#fileIn', { name: 'tarama.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') });
    await page.waitForFunction(() => window.__nm.S.pages.length === 1 && document.querySelector('#busy').hidden);
  }

  await test('Yazı tanıma (OCR): resimdeki Türkçe yazı okunur ve PDF’te aranabilir olur', async page => {
    await openScan(page);
    await page.click('[data-proxy="#ocrBtn"]');
    await page.waitForSelector('#ocrModal:not([hidden])', { timeout: 60000 });
    const txt = await page.inputValue('#ocrText');
    assert(txt.includes('Müdürlüğüne') && txt.includes('12345') && txt.includes('öğütücü'), 'Tanınan yazı eksik: ' + txt);
    await page.click('#ocrClose');
    const t = await pdfText(page, await save(page));
    assert(t[0].includes('Müdürlüğüne') && t[0].includes('12345'), 'PDF’te tanınan yazı yok: ' + t[0]);
    // sayfada düzenlenebilir yap
    await page.click('[data-proxy="#ocrBtn"]');
    await page.waitForSelector('#ocrModal:not([hidden])', { timeout: 60000 });
    await page.click('#ocrEdit');
    const n = await page.evaluate(() => window.__nm.S.pages[0].anns.filter(a => a.type === 'text' && a.bg).length);
    assert(n === 3, `3 düzenlenebilir satır bekleniyordu, ${n} oldu`);
  });

  await test('Ölçü: ölçek 1:1000, mesafe ve alan doğru hesaplanır', async page => {
    await openFiles(page, 'turkce.pdf');
    await page.click('[data-tab="olcu"]');
    await page.click('#scaleBtn'); await page.selectOption('#scaleSel', '1000'); await page.click('#scaleGo');
    assert((await page.textContent('#scaleLbl')).includes('1:1.000'), 'Ölçek etiketi: ' + await page.textContent('#scaleLbl'));
    const box = await page.evaluate(() => { const r = document.querySelector('.ov').getBoundingClientRect(); return { x: r.x, y: r.y, k: window.__nm.S.k }; });
    const P = (x, y) => [box.x + x * box.k, box.y + y * box.k];
    await page.click('[data-tool="dist"]');
    await page.mouse.move(...P(100, 290)); await page.mouse.down(); await page.mouse.move(...P(150, 290)); await page.mouse.move(...P(200, 290)); await page.mouse.up();
    const lbl = await page.evaluate(() => window.__nm.S.pages[0].anns.find(a => a.type === 'dim').lbl);
    assert(lbl === '35,28 m', '100 pt × 1:1000 = 35,28 m olmalı: ' + lbl);
    await page.click('[data-tool="area"]');
    for (const [x, y] of [[300, 180], [400, 180], [400, 280]]) { await page.mouse.click(...P(x, y)); await page.waitForTimeout(400); }
    await page.keyboard.press('Enter');
    const area = await page.evaluate(() => window.__nm.S.pages[0].anns.find(a => a.type === 'area').lbl);
    assert(area.startsWith('Alan: 622,26 m²'), 'Üçgen alanı yanlış: ' + area);
    assert((await page.textContent('#objTree')).includes('Mesafe · 35,28 m'), 'Nesne listesinde ölçü yok');
  });

  await test('Resim ayarı (gri ton) uygulanır ve geri alınır', async page => {
    await openScan(page);
    const iv0 = await page.evaluate(() => window.__nm.S.pages[0].img);
    await page.evaluate(() => document.querySelector('[data-adj="gray"]').click());
    await page.waitForFunction(() => window.__nm.S.pages[0].iv > 1);
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('Control+z');
    const back = await page.evaluate(() => { const p = window.__nm.S.pages[0]; return p.iv === 1 && p.img.tagName === 'IMG'; });
    assert(back, 'Geri al eski resmi getirmedi');
    // PDF sayfası da resim sayfasına dönüşebilmeli
  });

  await test('Word komutları: BÜYÜK HARF ve sembol ekle', async page => {
    await openFiles(page, 'ornek.docx');
    const pt = await page.evaluate(() => {
      const b = document.querySelector('.tbody'); const tw = document.createTreeWalker(b, NodeFilter.SHOW_TEXT); let n;
      while ((n = tw.nextNode())) { const i = n.nodeValue.indexOf('yetkili'); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 7); const q = r.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; } }
    });
    await page.mouse.dblclick(pt[0], pt[1]);
    await page.click('[data-tab="yazi"]');
    await page.click('[data-menu="mCase"]'); await page.click('[data-case="upper"]');
    let t = await page.textContent('.tbody');
    assert(t.includes('Sayın YETKİLİ,'), 'Büyük harf olmadı: ' + t);
    await page.click('[data-menu="mSym"]'); await page.click('[data-sym="₺"]');
    t = await page.textContent('.tbody');
    assert(t.includes('₺'), 'Sembol eklenmedi: ' + t);
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
