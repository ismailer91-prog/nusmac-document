// src/nusmac.html (tek dosya, kütüphaneleri CDN'den yükler) -> app/index.html (masaüstü, kütüphaneler app/lib içinde)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let src = fs.readFileSync(path.join(root, 'src', 'nusmac.html'), 'utf8');
const rep = {
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js': 'lib/pdf.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js': 'lib/pdf.worker.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js': 'lib/pdf-lib.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js': 'lib/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js': 'lib/pako.min.js',
  'https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js': 'lib/UTIF.js',
};
for (const [a, b] of Object.entries(rep)) {
  if (!src.includes(a)) throw new Error('Bulunamadı: ' + a);
  src = src.split(a).join(b);
}
src = src.replace(/<link rel="(preconnect|stylesheet)" href="https:\/\/fonts[^>]*>\n/g, '');
src = src.replace('İnternet bağlantısını kontrol edip sayfayı yenileyin.', 'Programı yeniden kurmayı deneyin.');
const i = src.indexOf('<div id="app">');
const head = '<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n';
fs.writeFileSync(path.join(root, 'app', 'index.html'), head + src.slice(0, i) + '</head>\n<body>\n' + src.slice(i) + '\n</body>\n</html>\n');
console.log('app/index.html oluşturuldu');
