// Test dosyalarını üretir: tests/fixtures/{turkce.pdf, ornek.docx}
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const PDFLib = require('../app/lib/pdf-lib.min.js');
const fontkit = require('@pdf-lib/fontkit');
const root = path.join(__dirname, '..'), out = path.join(root, 'tests', 'fixtures');

async function pdf() {
  const d = await PDFLib.PDFDocument.create();
  d.registerFontkit(fontkit);
  const f = await d.embedFont(fs.readFileSync(path.join(root, 'app/fonts/LiberationSans-Regular.ttf')), { subset: true });
  const lines = [
    ['Şişli İlçe Müdürlüğüne', 680],
    ['Konu: Gizli bilgi 12345', 640],
    ['Çalışma ağacı öğütücü ışık', 600],
  ];
  for (let i = 0; i < 2; i++) {
    const p = d.addPage([595.28, 841.89]);
    for (const [t, y] of lines) p.drawText(t + (i ? ' (2)' : ''), { x: 72, y, size: 16, font: f });
    p.drawRectangle({ x: 72, y: 300, width: 200, height: 100, color: PDFLib.rgb(0.2, 0.5, 0.8) });
  }
  fs.writeFileSync(path.join(out, 'turkce.pdf'), await d.save());
}

// Kütüphanesiz, sıkıştırmasız zip
function zip(files) {
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = b => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const parts = [], cen = []; let off = 0;
  for (const [name, str] of files) {
    const n = Buffer.from(name), data = Buffer.from(str), c = crc(data);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt32LE(c, 14); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(n.length, 26);
    const ce = Buffer.alloc(46); ce.writeUInt32LE(0x02014b50, 0); ce.writeUInt16LE(20, 4); ce.writeUInt16LE(20, 6); ce.writeUInt32LE(c, 16); ce.writeUInt32LE(data.length, 20); ce.writeUInt32LE(data.length, 24); ce.writeUInt16LE(n.length, 28); ce.writeUInt32LE(off, 42);
    parts.push(h, n, data); cen.push(ce, n); off += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(cen), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, e]);
}
function docx() {
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const body = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>DİLEKÇE BAŞLIĞI</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">Sayın yetkili, ışığı söndürünüz ve çiçekleri sulayınız. </w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>Eğik yazı.</w:t></w:r></w:p>
</w:body></w:document>`;
  fs.writeFileSync(path.join(out, 'ornek.docx'), zip([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/document.xml', body],
  ]));
}
(async () => { await pdf(); docx(); console.log('tests/fixtures hazır'); })();
