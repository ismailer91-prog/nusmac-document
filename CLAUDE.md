# Nusmac Document – proje rehberi

Nusmac Document; PDF, Word (.docx) ve resim dosyalarını **tek bir belgede** açıp düzenleyen, işaretleyen, imzalayan,
kesip parçalayan ve sonunda PDF / Word / JPG / PNG olarak kaydeden bir masaüstü programıdır (Windows, Electron).
Arayüz dili Türkçedir; kullanıcıya görünen tüm metinler Türkçe yazılmalıdır.

## Dosya yapısı
- `src/` — **asıl kaynak** (yalnız burası düzenlenir):
  - `src/index.html` — sayfa iskeleti: başlık çubuğu (hızlı erişim + belge adı + arama), Netcad tarzı **sekmeli şerit** (`nav.tabs` + `.rpanel` panelleri: Giriş, Yazı, Ekle, Çizim, Ölçü, Resim, Sayfa; büyük düğme `.bb` = simge üstte yazı altta, renk sınıfı `c-b/c-r/c-g/c-o/c-k`), sol panel (`#side`: Sayfalar + Nesneler ağacı), pencereler, kütüphane `<script>` etiketleri.
  - `src/styles.css` — tüm stiller.
  - `src/js/NN-ad.js` — program kodu, numara sırasıyla birleştirilir. Hepsi tek bir `(function(){'use strict'; … })()` içine konur; dosyalar ortak kapsamı paylaşır (import/export yok). Yeni dosya eklerken numarayla sıraya koyun; üst düzeyde hemen çalışan kod, kullandığı `const`/`let` tanımlarından sonra gelmelidir.
- `tools/build.js` — `src/` → `app/index.html` (masaüstü: kütüphaneler `app/lib/`'den, Google Fonts yok) ve `dist-web/nusmac.html` (tek dosyalık tarayıcı sürümü, CDN). **`app/index.html` elle düzenlenmez.**
- `app/main.js` — Electron ana süreci: pencere, Türkçe sağ tık menüsü + yazım denetimi önerileri, dosya ile açma (argv / ikinci örnek), kaydetme penceresi, kaydedilmemiş değişiklik uyarısı. `BM_TEST_DIR` ortam değişkeni varsa indirmeler soru sormadan oraya yazılır (testler için).
- `app/preload.js` — `window.desktop.onOpenFile`, `window.desktop.readAsset` (yalnız `app/lib` altını okur; yazı tanıma dosyaları için) ve `window.desktop.readFont` (PDF'e gömülecek yazı tipini Windows'tan ya da `app/fonts`'tan okur) köprüleri.
- `app/fonts/` — PDF'e gerçek metin yazmak için gömülen yazı tipleri (Liberation = Arial/Times/Courier eşdeğeri, Carlito = Calibri, Caladea = Cambria; lisanslar `LICENSES.txt`).
- `tests/e2e.js` — uçtan uca testler (Playwright). `tests/fixtures/` test dosyaları, `npm run fixtures` ile yeniden üretilir. Çıktılar `test-output/` klasörüne yazılır.
- `app/lib/` — pdf.js 3.11.174 (`pdf.js`, `pdf.worker.js`; worker ana iş parçacığında “fake worker” olarak çalışır), pdf-lib 1.17.1, @pdf-lib/fontkit 1.1.1, html2canvas 1.4.1, pako 2.1.0, UTIF.js, `tesseract/` (tesseract.js 7.0.0 + SIMD-LSTM çekirdeği + Türkçe dil dosyası `lang/tur.traineddata.gz`, yazı tanıma için; internet gerekmez).

## Çalıştırma / paketleme
- `npm install` → `npm start` (build + Electron ile aç).
- `npm test` → build + tüm testler. **Her değişiklikten sonra çalıştırın.**
- `npm run test:electron` → gerçek Electron programıyla kısa deneme (Linux’ta `xvfb-run -a` ile).
- GitHub Actions (`.github/workflows/build.yml`): her gönderimde testler + Windows kurulum dosyası (Actions → Artifacts). main dalına her gönderimde kurulum dosyası Releases sayfasına da konur (sürüm `package.json`dan; yeni sürüm için `version` artırın).
- `npm run dist` → `dist/` içinde Windows kurulum (.exe, NSIS) ve taşınabilir sürüm (electron-builder). Simge: `app/icon.ico`.

## Kod haritası (`src/js/`)
Yardımcılar (`01-temel.js`): `$`, `$$`, `el`, `esc`, `toast`, `busy`, `saveFile` (Türkçe karakterleri dosya adında sadeleştirir).
- `01-temel.js` — simgeler, arayüz yardımcıları, **durum**: `S` (belge durumu: `pages`, `k` ölçek, `tool`, `sel`, `ctx` ['txt'|'ann'], `undo/redo`, `wm` filigran, `pnum`, `objAuto` …), `pool` (id→sayfa), `E` (id→DOM); resim yardımcıları.
- **Sayfa modeli** — `S.pages` dizisi. `kind`: `'pdf'` (src+index), `'img'` (canvas/img), `'text'` (yazı sayfası, `html`). Ortak alanlar: `w,h` (pt), `rot`, `clip` (kırpma), `anns` (işaretler), `objMode/objSig` (PDF nesne modu), `comp` (gelişmiş düzenleyici katmanları).
- **İşaret (ann) türleri** — `text` (metin kutusu; `lineKey` varsa tek satır), `hl`, `path` (kalem), `rect`, `arrow`, `white` (beyaz örtü), `poly` (serbest kesim örtüsü), `img` (imza/kaşe/kesilen parça), `ellipse` (daire), `pline` (çoklu çizgi, `pts`), `dim` (mesafe, x1..y2), `area` (alan, `pts`), `xy` (koordinat noktası). Ölçü türlerinin `lbl` etiketi `renderOv` sırasında sayfanın ölçeğinden (`p.ms`) hesaplanır. İsteğe bağlı bayraklar: `hid` (gizli: ekranda görünmez, kaydedilmez), `lock` (kilitli: tıklanamaz). Koordinatlar pt, sayfanın görünen (döndürülmüş, kırpılmış) alanına göre. `auto:true` = nesne modunun ürettiği.
- `02-dosya-acma.js` — `openFiles`, `addPdf`, `addImage`, `addTiff`.
- `03-geri-al.js` — `snap/pushUndo/commitUndo/restore` (sayfa sırası + her sayfanın rot/anns/clip/objMode). Yazı sayfası içindeki yazım geri alması tarayıcının kendi `execCommand` geçmişidir.
- `04-goruntuleyici.js` — `buildViewer`, `renderBase`, `paintPage` (nesne modunda yazı+resimsiz çizim), küçük resimler, sayfa işlemleri, `renderOv`, `onDown` (tüm araçların fare işlemleri), `editText`, `editLineAt`, PDF içinde arama.
- `05-kaydet-pdf.js` — `composite`, `drawAnns`, `exportPdf` (değişmemiş PDF sayfaları vektör kopyalanır; değişenler arka plan resmi + gerçek metin; beyaz örtü/kesim olan sayfa her zaman yeniden çizilir ki örtülen yazı dosyada kalmasın), `PdfFonts`/`vecTexts`/`drawVecText` (metin kutularını gerçek PDF metni yazar), `wordBoxes`/`drawHiddenWords` (Word sayfalarına görünmez, seçilebilir metin katmanı), `decorate` (filigran + sayfa no), `exportSplit`.
- `06-pdf-word.js` — PDF yazısını yazı sayfasına çevirme. `07-imza.js` — imza/kaşe penceresi.
- `08-serit.js` — şerit grupları (Yazı, Paragraf, Ekle, Çizim, Resim, Sayfa), biçimlendirme, sayfa düğmeleri, klavye kısayolları.
- `09-yazi-sayfalari.js` — `textPage`, `addTextPageAt`, `textChanged`, satır içi resim (`wSel`, `freeImage`), açılır klasörler (`data-menu` → `.ddm`), bul-değiştir, sayfa numarası, filigran, çoğaltma.
- `10-resim-araclari.js` — `imageOp` (kes-ayır, serbest kes, görsel al), parçalama, PDF’ten gömülü resim çıkarma.
- `11-nesne-modu.js` — `objectify` (yazı satırlarını ve resimleri ayrıştırır; yazılı/yazısız iki çizimi karşılaştırarak görünmez OCR yazısını atlar ve yazı rengini bulur), `queueObj` (arka plan kuyruğu), `revertObj`.
- `12-zip-docx.js` — kütüphanesiz zip okuma/yazma (`unzip`, `zipStore`) ve kendi .docx okuyucumuz (`docxToHtml`).
- `13-kaydet-word-resim.js` — `textCanvases` (yazı sayfasını A4'lere böler), `exportDocx` (altChunk+MHT), `exportImages`, `exportSplitPdf`.
- `14-gorsel-alani.js` — katmanlı resim düzenleyici (`G` durumu, `gRender`, `gCrop`, `gSelCopy`, `gMerge` …); `openStudio/closeStudio`.
- `15-kaydet-penceresi.js` — `openSave` → PDF / Word / JPG / PNG; dosya seçme, sürükle-bırak, kaydedilmemiş değişiklik uyarısı.
- `16-yazdir.js` — `printDoc` (Yazdır düğmesi, Ctrl+P): sayfaları resim olarak `#printArea`'ya koyar, `window.print()`; yazdırma CSS'i `styles.css` sonunda.
- `17-sekmeler-nesne-agaci.js` — `setTab` (son sekme hatırlanır), vekil düğmeler (`data-proxy="#asılId"`: asıl düğmeye tıklar, `disabled`/`aria-pressed` durumunu kopyalar), sol panel ayırıcısı, nesne ağacı `buildTree`/`refreshTree` (bulunulan sayfanın işaretleri türe göre; göster/gizle, kilit, sil, tıklayınca seç).
- `18-ek-araclar.js` — Netcad: ölçü (mesafe/alan/çoklu çizgi/nokta), sayfa ölçeği `p.ms={mpp,n,name}` (metre/pt; yoksa kâğıt), bilinen uzunlukla ayar, imleç koordinatı; Photoshop: renk seçici, `adjustPage` (çevir, gri, siyah-beyaz, negatif, parlaklık/kontrast; PDF sayfası resim sayfasına döner, sürümler `IMGV`'de saklanır ki geri alınabilsin: `p.iv`); Word: `stepFont`, harf düzeni (`trCase`, Türkçe İ/ı), sembol; OCR: `ocrWorker` (Tesseract dosyaları blob olarak verilir; yerel dosyada fetch çalışmaz), `ocrCurrent`, `p.ocr` (tanınan satırlar → PDF'te görünmez metin katmanı, `ocrWords`).
- `99-acilis.js` — açılış, test kancası, masaüstünden dosya alma. Her zaman en son çalışır.

## Kurallar
- Kullanıcıya görünen metinler Türkçe, sade ve kısa. Hata mesajı neyin olmadığını ve ne yapılacağını söyler.
- Renkler `:root` değişkenlerinden gelir; açık/koyu tema ikisi de tanımlı.
- Her şerit sekmesi 1280 piksel genişlikte sığmalı. Aynı komutu başka yerde de göstermek için id'yi kopyalamayın; `data-proxy` kullanın. Araç düğmeleri `data-tool` ile istenen kadar tekrar edilebilir.
- Değişiklikten sonra: `npm test`; gerekirse `npm start` ile uygulamayı açıp ilgili akışı deneyin (dosya aç → düzenle → kaydet). Kaydedilen PDF’i başka bir okuyucuyla açıp kontrol edin.
- Testler `#test` adresiyle açılan sayfadaki `window.__nm` kancasını kullanır (yalnız test içindir).
- Bilinen sınırlar: düzenlenen PDF sayfalarında yazılar gerçek metindir ama arka plan (çizgi, tablo, renk) resim olur; Word sayfaları PDF'te görüntü + görünmez metin katmanıdır; tarayıcı sürümünde yazı tipi dosyası okunamadığı için metin kutuları resim olarak kalır; nesne modunda yazılar en yakın sistem yazı tipiyle gösterilir; .doc (eski Word) açılmaz.
