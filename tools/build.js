// Kaynaktan çalışan programı üretir.
//   src/index.html + src/styles.css + src/js/*.js (ad sırasıyla)
//     → dist-web/nusmac.html  (tek dosya, kütüphaneler CDN'den; tarayıcıda açılır)
//     → app/index.html        (masaüstü; kütüphaneler app/lib içinden, internet gerekmez)
// JS dosyaları tek bir (function(){ 'use strict'; ... })() içinde birleştirilir;
// yani dosyalar birbirinin fonksiyon ve değişkenlerini doğrudan görür.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const src = path.join(root, 'src');
const read = f => fs.readFileSync(path.join(src, f), 'utf8');

const jsFiles = fs.readdirSync(path.join(src, 'js')).filter(f => /^\d+-.+\.js$/.test(f)).sort();
const js = jsFiles.map(f => `/* ===== js/${f} ===== */\n` + read('js/' + f)).join('');

let page = read('index.html');
const LINK = '<link rel="stylesheet" href="styles.css">';
const MARK = /<!-- @scripts:[^>]*-->/;
if (!page.includes(LINK) || !MARK.test(page)) throw new Error('src/index.html içinde stil bağlantısı veya @scripts işareti bulunamadı');
page = page.replace(LINK, () => '<style>\n' + read('styles.css') + '</style>');
page = page.replace(MARK, () => "<script>\n(function(){\n'use strict';\n" + js + '})();\n</script>');

function wrap(body) {
  const i = body.indexOf('<div id="app">');
  return '<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + body.slice(0, i) + '</head>\n<body>\n' + body.slice(i) + '\n</body>\n</html>\n';
}

// Tarayıcı sürümü
fs.mkdirSync(path.join(root, 'dist-web'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist-web', 'nusmac.html'), wrap(page));

// Masaüstü sürümü
const rep = {
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js': 'lib/pdf.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js': 'lib/pdf.worker.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js': 'lib/pdf-lib.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js': 'lib/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js': 'lib/pako.min.js',
  'https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js': 'lib/UTIF.js',
  'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js': 'lib/fontkit.umd.min.js',
};
let desk = page;
for (const [a, b] of Object.entries(rep)) {
  if (!desk.includes(a)) throw new Error('Bulunamadı: ' + a);
  desk = desk.split(a).join(b);
}
desk = desk.replace(/<link rel="(preconnect|stylesheet)" href="https:\/\/fonts[^>]*>\n/g, '');
desk = desk.replace('İnternet bağlantısını kontrol edip sayfayı yenileyin.', 'Programı yeniden kurmayı deneyin.');
fs.writeFileSync(path.join(root, 'app', 'index.html'), wrap(desk));
console.log(`app/index.html ve dist-web/nusmac.html oluşturuldu (${jsFiles.length} JS dosyası)`);
