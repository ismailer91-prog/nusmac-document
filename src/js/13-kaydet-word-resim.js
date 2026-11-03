/* yazı sayfasını A4 sayfalara böler; işaretler (imza, kaşe, kalem) üstüne çizilir */
async function textCanvases(p,scale=2,words=false){
  if(!window.html2canvas)throw new Error('Sayfa çizici yüklenemedi');
  syncText(p);const host=el('div','tdoc exporting');host.style.cssText='position:fixed;left:-30000px;top:0;width:606px;min-height:0;padding:0;background:#fff;zoom:1';
  const b=el('div','tbody');b.style.minHeight='0';b.innerHTML=p.html;host.append(b);document.body.append(host);
  try{
    await Promise.all([...b.querySelectorAll('img')].map(i=>i.decode?i.decode().catch(()=>{}):0));await tick();
    const full=await html2canvas(b,{scale,backgroundColor:'#ffffff',logging:false,useCORS:true});
    const wr=b.getBoundingClientRect();const total=Math.max(1,b.scrollHeight);const PH=935,M=94;
    const cands=$$('p,li,tr,h1,h2,h3,h4,h5,h6,table,ul,ol,blockquote,img,div,pre',b).map(e=>e.getBoundingClientRect().bottom-wr.top).filter(v=>v>0).sort((x,y)=>x-y);
    const breaks=$$('hr.pbreak',b).map(e=>{const r=e.getBoundingClientRect();return{top:r.top-wr.top-8,bottom:r.bottom-wr.top+8}});
    const ranges=[];let y=0,guard=0;
    while(y<total-2&&guard++<500){const lim=y+PH;let cut,next;const br=breaks.find(q=>q.top>=y-1&&q.top<=lim);
      if(br){cut=br.top;next=br.bottom}else if(lim>=total){cut=total;next=total}else{let best=null;for(const v of cands){if(v<=lim&&v>y+40)best=v}cut=best!=null?best:lim;next=cut}
      if(cut>y+1)ranges.push([y,cut]);y=Math.max(next,y+1)}
    if(!ranges.length)ranges.push([0,PH]);
    if(p.anns.length)await ensureImgs(p);
    /* beyaz örtü / kesim altında kalan kelimeler görünmez katmana da yazılmaz */
    const cov=p.anns.filter(q=>q.type==='white'||q.type==='poly').map(q=>{const r=annBox(q);return{x:r.x*PT2PX,y:r.y*PT2PX,w:r.w*PT2PX,h:r.h*PT2PX}});
    const W=words?wordBoxes(b,wr).filter(w=>!cov.some(r=>boxHit({x:w.x+M,y:w.y+M,w:w.w,h:w.h},r))):null;
    return ranges.map(([a,z])=>{const c=document.createElement('canvas');c.width=794*scale;c.height=1123*scale;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
      const h=Math.min((z-a)*scale,full.height-a*scale);if(h>0)x.drawImage(full,0,a*scale,full.width,h,M*scale,M*scale,full.width,h);
      if(p.anns.length){x.save();x.translate(0,-a*scale);drawAnns(x,p.anns,scale*PT2PX,false);x.restore()}
      if(W)c._words=W.filter(w=>w.y+w.h/2>=a&&w.y+w.h/2<z).map(w=>Object.assign({},w,{x:w.x+M,y:w.y-a+M}));return c});
  }finally{host.remove()}
}
async function pageCanvases(p){return p.kind==='text'?textCanvases(p,2):[await composite(p,pageScale(p))]}
function buildDocx(html,title){
  const parts=[];
  html=html.replace(/src="data:(image\/([a-z+]+));base64,([^"]+)"/gi,(m,type,sub,b64)=>{const ext=sub==='jpeg'?'jpg':sub.replace('+xml','');const loc=`file:///C:/fake/image${parts.length}.${ext}`;parts.push({type,b64,loc});return `src="${loc}"`});
  const css="body{font-family:'Times New Roman',serif;font-size:12pt} p{margin:0 0 8pt} table{border-collapse:collapse} td,th{border:1px solid #000;padding:4px 6px;vertical-align:top} table.nb td,table.nb th{border:none} h1{font-size:18pt} h2{font-size:15pt} h3{font-size:13pt}";
  const doc=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${html}</body></html>`;
  let mht='MIME-Version: 1.0\nContent-Type: multipart/related;\n    type="text/html";\n    boundary="----=mhtDocumentPart"\n\n\n------=mhtDocumentPart\nContent-Type: text/html;\n    charset="utf-8"\nContent-Transfer-Encoding: quoted-printable\nContent-Location: file:///C:/fake/document.html\n\n'+doc.replace(/=/g,'=3D')+'\n\n';
  for(const q of parts)mht+=`------=mhtDocumentPart\nContent-Type: ${q.type}\nContent-Transfer-Encoding: base64\nContent-Location: ${q.loc}\n\n${q.b64.replace(/(.{76})/g,'$1\n')}\n\n`;
  mht+='------=mhtDocumentPart--\n';
  const X='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';const Z=[];
  Z.push(['[Content_Types].xml',X+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="mht" ContentType="message/rfc822"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>']);
  Z.push(['_rels/.rels',X+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="/word/document.xml"/></Relationships>']);
  Z.push(['word/document.xml',X+'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body><w:altChunk r:id="htmlChunk"/><w:sectPr><w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>']);
  Z.push(['word/_rels/document.xml.rels',X+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="htmlChunk" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="/word/afchunk.mht"/></Relationships>']);
  Z.push(['word/afchunk.mht',mht]);
  return zipStore(Z,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}
const PGBR='<br clear="all" style="page-break-before:always">';
async function exportDocx(pages,filename){
  busy('Word dosyası hazırlanıyor…');let html='',asImg=0;
  try{
    for(let i=0;i<pages.length;i++){const p=pages[i];if(i)html+=PGBR;busy(`Word dosyası hazırlanıyor… ${i+1}/${pages.length}`);await tick();
      if(p.kind==='text'&&!p.anns.length){syncText(p);const d=document.createElement('div');d.innerHTML=p.html;
        d.querySelectorAll('hr.pbreak').forEach(h=>{const t=document.createElement('div');t.innerHTML=PGBR;h.replaceWith(t.firstChild)});
        for(const im of d.querySelectorAll('img')){const w=parseFloat(im.style.width)||parseFloat(im.getAttribute('width'))||0;const t=new Image();t.src=im.src;try{await t.decode()}catch(e){}
          if(t.naturalWidth){const W=Math.round(Math.min(TXT_W,w||t.naturalWidth*0.75));im.setAttribute('width',W);im.setAttribute('height',Math.round(W*t.naturalHeight/t.naturalWidth))}}
        html+=d.innerHTML}
      else{if(p.kind==='text')asImg++;const cs=await pageCanvases(p);cs.forEach((c,j)=>{if(j)html+=PGBR;let W=605,H=Math.round(W*c.height/c.width);if(H>900){H=900;W=Math.round(H*c.width/c.height)}
          html+=`<p style="margin:0;text-align:center"><img src="${c.toDataURL('image/jpeg',0.9)}" width="${W}" height="${H}" alt=""></p>`})}}
    const blob=buildDocx(html,filename.replace(/\.docx$/i,''));busy(false);const ok=await saveFile(filename,blob);
    if(ok&&(S.wm||S.pnum))toast('Not: Word dosyasına filigran ve sayfa numarası eklenmez; bunları Word’de ekleyebilirsiniz.',7000);
    if(ok&&asImg)toast('Üzerinde imza veya işaret olan yazı sayfaları, görünüşü bozulmasın diye Word’e resim olarak eklendi.',7000);return ok;
  }catch(e){console.error(e);toast('Word dosyası oluşturulamadı: '+(e.message||e),6000)}finally{busy(false)}
}
async function exportImages(pages,type,name){
  busy('Resimler hazırlanıyor…');
  try{const out=[];let n=0,num=0;for(const p of pages){busy(`Resimler hazırlanıyor… ${++n}/${pages.length}`);await tick();for(const c of await pageCanvases(p)){decorate(c,p.kind==='text'?595.28:dw(p),++num);out.push(await canvasBlob(c,type==='png'?'image/png':'image/jpeg',0.92))}}
    if(out.length===1){busy(false);return await saveFile(`${name}.${type}`,out[0])}
    const files=[];for(let i=0;i<out.length;i++)files.push([`${name}-${String(i+1).padStart(2,'0')}.${type}`,new Uint8Array(await out[i].arrayBuffer())]);
    busy(false);return await saveFile(`${name}.zip`,zipStore(files,'application/zip'))}
  catch(e){console.error(e);toast('Resim oluşturulamadı: '+(e.message||e),6000)}finally{busy(false)}
}
async function exportSplitPdf(pages,name){const files=[];for(let i=0;i<pages.length;i++){const b=await exportPdf([pages[i]],'',false,true);if(!b)return false;files.push([`${name}-sayfa-${String(i+1).padStart(2,'0')}.pdf`,new Uint8Array(b)])}
  busy(false);return await saveFile(`${name}.zip`,zipStore(files,'application/zip'))}

