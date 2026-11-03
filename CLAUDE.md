# Nusmac Document – proje rehberi

Nusmac Document; PDF, Word (.docx) ve resim dosyalarını **tek bir belgede** açıp düzenleyen, işaretleyen, imzalayan,
kesip parçalayan ve sonunda PDF / Word / JPG / PNG olarak kaydeden bir masaüstü programıdır (Windows, Electron).
Arayüz dili Türkçedir; kullanıcıya görünen tüm metinler Türkçe yazılmalıdır.

## Dosya yapısı
- `src/nusmac.html` — **asıl kaynak.** Tek dosyalık uygulama (HTML + CSS + JS). Kütüphaneleri CDN'den yükler; tarayıcıda da açılır.
- `tools/build.js` — `src/nusmac.html` → `app/index.html` (CDN adreslerini `app/lib/` içindeki yerel kopyalarla değiştirir, Google Fonts bağlantısını kaldırır). **`app/index.html` elle düzenlenmez**, her zaman build ile üretilir.
- `app/main.js` — Electron ana süreci: pencere, Türkçe sağ tık menüsü + yazım denetimi önerileri, dosya ile açma (argv / ikinci örnek), kaydetme penceresi, kaydedilmemiş değişiklik uyarısı. `BM_TEST_DIR` ortam değişkeni varsa indirmeler soru sormadan oraya yazılır (testler için).
- `app/preload.js` — `window.desktop.onOpenFile` ve `window.desktop.readFont` (PDF'e gömülecek yazı tipini Windows'tan ya da `app/fonts`'tan okur) köprüleri.
- `app/fonts/` — PDF'e gerçek metin yazmak için gömülen yazı tipleri (Liberation = Arial/Times/Courier eşdeğeri, Carlito = Calibri, Caladea = Cambria; lisanslar `LICENSES.txt`).
- `tests/e2e.js` — uçtan uca testler (Playwright). `tests/fixtures/` test dosyaları, `npm run fixtures` ile yeniden üretilir. Çıktılar `test-output/` klasörüne yazılır.
- `app/lib/` — pdf.js 3.11.174 (`pdf.js`, `pdf.worker.js`; worker ana iş parçacığında “fake worker” olarak çalışır), pdf-lib 1.17.1, @pdf-lib/fontkit 1.1.1, html2canvas 1.4.1, pako 2.1.0, UTIF.js.

## Çalıştırma / paketleme
- `npm install` → `npm start` (build + Electron ile aç).
- `npm test` → build + tüm testler. **Her değişiklikten sonra çalıştırın.**
- `npm run dist` → `dist/` içinde Windows kurulum (.exe, NSIS) ve taşınabilir sürüm (electron-builder). Simge: `app/icon.ico`.

## Kod haritası (src/nusmac.html içindeki `/* ---------- … ---------- */` başlıkları)
Tüm JS tek bir IIFE içinde, `'use strict'`. Yardımcılar: `$`, `$$`, `el`, `esc`, `toast`, `busy`, `saveFile` (Türkçe karakterleri dosya adında sadeleştirir).
- **state** — `S` (belge durumu: `pages`, `k` ölçek, `tool`, `sel`, `ctx` ['txt'|'ann'], `undo/redo`, `wm` filigran, `pnum`, `objAuto` …), `pool` (id→sayfa), `E` (id→DOM).
- **Sayfa modeli** — `S.pages` dizisi. `kind`: `'pdf'` (src+index), `'img'` (canvas/img), `'text'` (yazı sayfası, `html`). Ortak alanlar: `w,h` (pt), `rot`, `clip` (kırpma), `anns` (işaretler), `objMode/objSig` (PDF nesne modu), `comp` (gelişmiş düzenleyici katmanları).
- **İşaret (ann) türleri** — `text` (metin kutusu; `lineKey` varsa tek satır), `hl`, `path` (kalem), `rect`, `arrow`, `white` (beyaz örtü), `poly` (serbest kesim örtüsü), `img` (imza/kaşe/kesilen parça). Koordinatlar pt, sayfanın görünen (döndürülmüş, kırpılmış) alanına göre. `auto:true` = nesne modunun ürettiği.
- **viewer / overlay** — `buildViewer`, `renderBase`, `paintPage` (nesne modunda yazı+resimsiz çizim), `renderOv`, `onDown` (tüm araçların fare işlemleri), `editText`, `editLineAt`.
- **undo** — `snap/pushUndo/commitUndo/restore` (sayfa sırası + her sayfanın rot/anns/clip/objMode). Yazı sayfası içindeki yazım geri alması tarayıcının kendi `execCommand` geçmişidir.
- **compositing & export** — `composite`, `drawAnns`, `exportPdf` (değişmemiş PDF sayfaları vektör kopyalanır; değişenler arka plan resmi + gerçek metin olarak; beyaz örtü/kesim olan sayfa her zaman yeniden çizilir ki örtülen yazı dosyada kalmasın), `PdfFonts`/`vecTexts`/`drawVecText` (metin kutularını gerçek PDF metni yazar), `wordBoxes`/`drawHiddenWords` (Word sayfalarına görünmez, seçilebilir metin katmanı), `decorate` (filigran + sayfa no), `exportSplit`.
- **ribbon / formatting / keyboard** — şerit grupları (Yazı, Paragraf, Ekle, Çizim, Resim, Sayfa), açılır klasörler (`data-menu` → `.ddm`).
- **yazı sayfaları** — `textPage`, `addTextPageAt`, `textChanged`, satır içi resim ekleme/boyutlandırma (`wSel`, `freeImage` ile serbest konuma alma).
- **resim araçları** — `imageOp` (kes-ayır, serbest kes, görsel al), parçalama, PDF’ten gömülü resim çıkarma.
- **PDF nesne modu** — `objectify` (yazı satırlarını ve resimleri ayrıştırır; yazılı/yazısız iki çizimi karşılaştırarak görünmez OCR yazısını atlar ve yazı rengini bulur), `queueObj` (arka plan kuyruğu), `revertObj`.
- **zip / docx → html** — kütüphanesiz zip okuma/yazma (`unzip`, `zipStore`) ve kendi .docx okuyucumuz (`docxToHtml`).
- **Görsel alanı** — katmanlı resim düzenleyici (`G` durumu, `gRender`, `gCrop`, `gSelCopy`, `gMerge` …); sayfa üstü pencere olarak `openStudio/closeStudio` ile açılır.
- **kaydet penceresi** — `openSave` → PDF / Word (`exportDocx`, altChunk+MHT yöntemi) / JPG / PNG (çok sayfada .zip).

## Kurallar
- Kullanıcıya görünen metinler Türkçe, sade ve kısa. Hata mesajı neyin olmadığını ve ne yapılacağını söyler.
- Renkler `:root` değişkenlerinden gelir; açık/koyu tema ikisi de tanımlı.
- Değişiklikten sonra: `npm run build:html`, sonra uygulamayı açıp ilgili akışı deneyin (dosya aç → düzenle → kaydet). Kaydedilen PDF’i başka bir okuyucuyla açıp kontrol edin.
- Testler `#test` adresiyle açılan sayfadaki `window.__nm` kancasını kullanır (yalnız test içindir).
- Bilinen sınırlar: düzenlenen PDF sayfalarında yazılar gerçek metindir ama arka plan (çizgi, tablo, renk) resim olur; Word sayfaları PDF'te görüntü + görünmez metin katmanıdır; tarayıcı sürümünde yazı tipi dosyası okunamadığı için metin kutuları resim olarak kalır; nesne modunda yazılar en yakın sistem yazı tipiyle gösterilir; .doc (eski Word) açılmaz.
