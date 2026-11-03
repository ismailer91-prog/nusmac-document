/* ---------- compositing & export ---------- */
function wrapLines(ctx,text,maxW){const out=[];for(const para of text.split('\n')){if(!para){out.push('');continue}let line='';for(const w of para.split(/ +/)){const t=line?line+' '+w:w;if(ctx.measureText(t).width<=maxW||!line){if(ctx.measureText(t).width>maxW&&!line){let cur='';for(const ch of w){if(ctx.measureText(cur+ch).width>maxW&&cur){out.push(cur);cur=ch}else cur+=ch}line=cur}else line=t}else{out.push(line);line=w}}out.push(line)}return out}
function drawAnns(ctx,anns,s,skipHl,vec){
  for(const a of anns){
    if(skipHl&&a.type==='hl')continue;ctx.save();
    if(a.type==='hl'){ctx.globalCompositeOperation='multiply';ctx.fillStyle=a.color;ctx.fillRect(a.x*s,a.y*s,a.w*s,a.h*s)}
    else if(a.type==='white'){ctx.fillStyle='#fff';ctx.fillRect(a.x*s,a.y*s,a.w*s,a.h*s)}
    else if(a.type==='rect'){const l=a.lw*s;ctx.strokeStyle=a.color;ctx.lineWidth=l;ctx.strokeRect(a.x*s+l/2,a.y*s+l/2,a.w*s-l,a.h*s-l)}
    else if(a.type==='path'||a.type==='arrow'){ctx.strokeStyle=a.color;ctx.lineWidth=a.lw*s;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
      const pts=a.type==='path'?a.pts:[[a.x1,a.y1],[a.x2,a.y2]];pts.forEach(([x,y],i)=>i?ctx.lineTo(x*s,y*s):ctx.moveTo(x*s,y*s));ctx.stroke();
      if(a.type==='arrow'){ctx.fillStyle=a.color;ctx.beginPath();arrowHead(a).forEach(([x,y],i)=>i?ctx.lineTo(x*s,y*s):ctx.moveTo(x*s,y*s));ctx.closePath();ctx.fill()}}
    else if(a.type==='poly'){ctx.fillStyle=a.fill||'#ffffff';ctx.beginPath();a.pts.forEach(([x,y],i)=>i?ctx.lineTo(x*s,y*s):ctx.moveTo(x*s,y*s));ctx.closePath();ctx.fill()}
    else if(a.type==='img'){const im=cachedImg(a.src);if(im)ctx.drawImage(im,a.x*s,a.y*s,a.w*s,a.h*s)}
    else if(a.type==='text'){
      if(a.bg){ctx.fillStyle=a.bg;ctx.fillRect(a.x*s,a.y*s,a.w*s,a.h*s)}
      if(vec&&vec.has(a.id)){ctx.restore();continue}
      const fs=a.size*s,lh=fs*1.25,W=a.w*s;ctx.font=`${a.italic?'italic ':''}${a.bold?'bold ':''}${fs}px ${fontCss(a.font)}`;ctx.fillStyle=a.color;ctx.textBaseline='top';
      (a.lineKey?a.text.split('\n'):wrapLines(ctx,a.text,W+1)).forEach((ln,i)=>{const lw=ctx.measureText(ln).width;const x=a.x*s+(a.align==='center'?(W-lw)/2:a.align==='right'?W-lw:0);const y=a.y*s+i*lh+fs*0.14;ctx.fillText(ln,x,y);if(a.underline&&ln.trim())ctx.fillRect(x,y+fs*0.98,lw,Math.max(1,fs/15))});
    }
    ctx.restore();
  }
}
async function ensureImgs(p){await Promise.all(p.anns.filter(a=>a.type==='img').map(a=>loadImg(a.src).catch(()=>null)))}
function pageScale(p){return p.kind==='pdf'?2.5:Math.max(1.5,Math.min(3.5,p.nat||2))}
async function composite(p,s,vec){
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(dw(p)*s));c.height=Math.max(1,Math.round(dh(p)*s));const ctx=c.getContext('2d');
  await paintPage(ctx,p,s);await ensureImgs(p);drawAnns(ctx,p.anns,s,false,vec);return c;
}
function bleedWhite(c){const x=c.getContext('2d');const d=x.getImageData(0,0,c.width,c.height),a=d.data;for(let i=0;i<a.length;i+=4)if(a[i+3]===0){a[i]=a[i+1]=a[i+2]=255;a[i+3]=1}x.putImageData(d,0,0)}
async function getLib(src){if(src.lib===undefined){try{src.lib=await PDFLib.PDFDocument.load(src.bytes,{ignoreEncryption:true})}catch(e){console.warn(e);src.lib=null}}return src.lib}
function mapFn(R,x0,y0,w0,h0){switch(R){case 90:return(X,Y)=>[x0+Y,y0+X];case 180:return(X,Y)=>[x0+w0-X,y0+Y];case 270:return(X,Y)=>[x0+w0-Y,y0+h0-X];default:return(X,Y)=>[x0+X,y0+h0-Y]}}
function hexRgb(h){const n=parseInt(h.slice(1),16);return PDFLib.rgb((n>>16&255)/255,(n>>8&255)/255,(n&255)/255)}
/* ---------- PDF'e gerçek (seçilebilir) metin yazma ----------
   Metin kutuları ve nesne modundaki PDF satırları, kaydederken resim yerine gerçek metin olarak yazılır.
   Yazı tipi: önce Windows'taki asıl yazı tipi (masaüstünde), olmazsa programla gelen eşdeğeri (app/fonts).
   Yazı tipi bulunamazsa (ör. tarayıcı sürümü) eskisi gibi resim olarak kaydedilir. */
const PDFFONT={'Arial':['LiberationSans',['arial','arialbd','ariali','arialbi']],'Times New Roman':['LiberationSerif',['times','timesbd','timesi','timesbi']],
  'Courier New':['LiberationMono',['cour','courbd','couri','courbi']],'Calibri':['Carlito',['calibri','calibrib','calibrii','calibriz']],'Cambria':['Caladea',[]],
  'Verdana':['LiberationSans',['verdana','verdanab','verdanai','verdanaz']],'Georgia':['LiberationSerif',['georgia','georgiab','georgiai','georgiaz']],
  'Tahoma':['LiberationSans',['tahoma','tahomabd']],'Impact':['LiberationSans',['impact']]};
const FSTY=['Regular','Bold','Italic','BoldItalic'];
const fontBytes=new Map();
function readUrl(url){return new Promise(res=>{try{const x=new XMLHttpRequest();x.open('GET',url);x.responseType='arraybuffer';x.onload=()=>res((x.status===200||x.status===0)&&x.response&&x.response.byteLength?x.response:null);x.onerror=()=>res(null);x.send()}catch(e){res(null)}})}
async function getFontBytes(file,sys){const k=(sys?'sys:':'')+file;if(fontBytes.has(k))return fontBytes.get(k);
  let b=null;const D=window.desktop;
  if(D&&D.readFont){try{b=await D.readFont(file,sys)}catch(e){b=null}}
  else if(!sys)b=await readUrl('fonts/'+file);
  fontBytes.set(k,b);return b}
function fontKey(fam){if(PDFFONT[fam])return fam;const f=String(fam||'').toLowerCase();
  for(const k of Object.keys(PDFFONT))if(f.includes(k.toLowerCase()))return k;
  if(/carlito/.test(f))return'Calibri';if(/caladea/.test(f))return'Cambria';if(/mono|courier/.test(f))return'Courier New';if(/serif/.test(f)&&!/sans/.test(f))return'Times New Roman';return'Arial'}
class PdfFonts{
  constructor(doc){this.doc=doc;this.m=new Map();this.ok=!!window.fontkit;if(this.ok)doc.registerFontkit(window.fontkit)}
  async get(fam,bold,italic){if(!this.ok)return null;const key=fontKey(fam),i=(bold?1:0)+(italic?2:0),id=key+i;
    if(this.m.has(id))return this.m.get(id);
    const [bund,sys]=PDFFONT[key];let f=null;
    for(const [file,isSys] of [[sys[i]&&sys[i]+'.ttf',true],[bund+'-'+FSTY[i]+'.ttf',false]]){if(!file)continue;
      const b=await getFontBytes(file,isSys);if(!b)continue;
      try{const font=await this.doc.embedFont(b,{subset:true});const fk=font.embedder&&font.embedder.font;
        const asc=fk?fk.ascent:800,desc=fk?Math.abs(fk.descent):200,upm=fk?fk.unitsPerEm:1000;
        f={font,asc:asc/upm,ascR:asc/(asc+desc)};break}catch(e){console.warn('yazı tipi gömülemedi',file,e)}}
    this.m.set(id,f);return f}
}
const COVERS=new Set(['img','white','poly']);
function annBox(a){if(a.type==='poly'||a.type==='path'){const xs=a.pts.map(q=>q[0]),ys=a.pts.map(q=>q[1]);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}}return{x:a.x,y:a.y,w:a.w,h:a.h}}
const boxHit=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
/* Gerçek metin olarak yazılacak metin kutuları: üstüne sonradan resim/beyaz örtü/kesim konmamış olanlar.
   Örtülenler resmin içinde kalır; böylece örtünün altındaki yazı PDF'te bulunmaz. */
async function vecTexts(anns,F){const out=new Set();if(!F||!F.ok)return out;
  for(let i=0;i<anns.length;i++){const a=anns[i];if(a.type!=='text'||!a.text||!a.text.trim())continue;
    const bx=annBox(a);if(anns.slice(i+1).some(b=>COVERS.has(b.type)&&boxHit(bx,annBox(b))))continue;
    if(await F.get(a.font,a.bold,a.italic))out.add(a.id)}
  return out}
let measCtx=null;
const cleanTxt=t=>t.replace(/[\u0000-\u0008\u000b-\u001f\u007f­]/g,'').replace(/\t/g,'    ');
function pdfColor(c){return /^#[0-9a-f]{6}$/i.test(c||'')?hexRgb(c):PDFLib.rgb(0,0,0)}
/* map: görünen sayfa koordinatı (pt, üstten) → PDF koordinatı; R: sayfanın dönüşü */
async function drawVecText(pg,a,F,map,R){
  const f=await F.get(a.font,a.bold,a.italic);if(!f)return;
  if(!measCtx)measCtx=document.createElement('canvas').getContext('2d');const M=4;
  measCtx.font=`${a.italic?'italic ':''}${a.bold?'bold ':''}${a.size*M}px ${fontCss(a.font)}`;
  const lines=a.lineKey?a.text.split('\n'):wrapLines(measCtx,a.text,a.w*M+1);
  const fs=a.size,lh=fs*1.25,col=pdfColor(a.color),rot=PDFLib.degrees(R);
  lines.forEach((ln,i)=>{ln=cleanTxt(ln);if(!ln.trim())return;
    let lw;try{lw=f.font.widthOfTextAtSize(ln,fs)}catch(e){return}
    const x=a.x+(a.align==='center'?(a.w-lw)/2:a.align==='right'?a.w-lw:0);const top=a.y+i*lh+fs*0.14,base=top+fs*f.ascR*1.0;
    const [px,py]=map(x,base);
    try{pg.drawText(ln,{x:px,y:py,size:fs,font:f.font,color:col,rotate:rot})}catch(e){console.warn('metin yazılamadı',e);return}
    if(a.underline){const uy=top+fs*0.98+Math.max(1,fs/15)/2;const [sx,sy]=map(x,uy),[ex,ey]=map(x+lw,uy);pg.drawLine({start:{x:sx,y:sy},end:{x:ex,y:ey},thickness:Math.max(1,fs/15)*0.75,color:col})}
  })}
/* Yazı sayfasındaki (Word) kelimelerin konumları: görünmez metin katmanı için */
function wordBoxes(b,wr){const out=[];const tw=document.createTreeWalker(b,NodeFilter.SHOW_TEXT);const r=document.createRange();let n;
  while((n=tw.nextNode())){const t=n.nodeValue;if(!t||!t.trim())continue;const cs=getComputedStyle(n.parentElement);
    if(cs.visibility==='hidden'||cs.display==='none')continue;
    const fam=cs.fontFamily,bold=(parseInt(cs.fontWeight)||400)>=600,italic=cs.fontStyle!=='normal';
    for(const m of t.matchAll(/\S+/g)){r.setStart(n,m.index);r.setEnd(n,m.index+m[0].length);const rs=r.getClientRects();if(!rs.length)continue;const q=rs[0];if(q.width<=0)continue;
      out.push({s:m[0],x:q.left-wr.left,y:q.top-wr.top,w:q.width,h:q.height,fam,bold,italic})}}
  return out}
async function drawHiddenWords(pg,words,F,s){/* s: px→pt */
  for(const w of words){const f=await F.get(w.fam,w.bold,w.italic);if(!f)continue;const t=cleanTxt(w.s);if(!t)continue;
    let size=w.h*s*0.8;try{const u=f.font.widthOfTextAtSize(t,1);if(u>0)size=Math.min(size*1.6,Math.max(size*0.5,w.w*s/u))}catch(e){continue}
    const base=pg.getHeight()-(w.y+w.h*f.ascR)*s;
    try{pg.drawText(t,{x:w.x*s,y:base,size,font:f.font,opacity:0})}catch(e){}}}
async function exportPdf(pages,filename,flat,ret){
  if(!pages.length){toast('Kaydedilecek sayfa yok.');return}
  if(!window.PDFLib){toast('PDF aracı yüklenemedi. Programı yeniden açıp tekrar deneyin.');return}
  try{
    const out=await PDFLib.PDFDocument.create();let n=0,num=0;const F=flat?null:new PdfFonts(out);
    for(const p of pages){
      busy(`PDF hazırlanıyor… ${++n}/${pages.length}`);await tick();
      if(p.kind==='text'){for(const c of await textCanvases(p,2,!!F)){decorate(c,595.28,++num);const png=await out.embedPng(await canvasBytes(c,'image/png'));const pg=out.addPage([595.28,841.89]);pg.drawImage(png,{x:0,y:0,width:595.28,height:841.89});
          if(F&&c._words)await drawHiddenWords(pg,c._words,F,595.28/794);c.width=c.height=0}continue}
      /* beyaz örtü / serbest kesim varsa sayfa yeniden çizilir; örtünün altındaki yazı dosyada kalmaz */
      const covered=p.anns.some(a=>!a.auto&&(a.type==='white'||a.type==='poly'));
      if(p.kind==='pdf'&&!flat&&!objChanged(p)&&!covered){
        const lib=await getLib(p.src);
        if(lib){
          const [cp]=await out.copyPages(lib,[p.index]);num++;
          const R=(((cp.getRotation().angle||0)+p.rot)%360+360)%360;cp.setRotation(PDFLib.degrees(R));out.addPage(cp);
          const cb=cp.getCropBox();const W=dw(p),H=dh(p);const mapF=mapFn(R,cb.x,cb.y,cb.width,cb.height);const map=(X,Y)=>mapF(X+cx0(p),Y+cy0(p));
          if(p.clip){const [ax,ay]=map(0,0),[bx,by]=map(W,H);cp.setCropBox(Math.min(ax,bx),Math.min(ay,by),Math.abs(bx-ax),Math.abs(by-ay))}
          for(const a of p.anns.filter(a=>a.type==='hl'&&!a.auto)){
            const [ax,ay]=map(a.x,a.y),[bx,by]=map(a.x+a.w,a.y+a.h);
            const o={x:Math.min(ax,bx),y:Math.min(ay,by),width:Math.abs(bx-ax),height:Math.abs(by-ay),color:hexRgb(a.color),opacity:0.5};
            if(PDFLib.BlendMode)o.blendMode=PDFLib.BlendMode.Multiply;cp.drawRectangle(o);
          }
          const rest=p.anns.filter(a=>a.type!=='hl'&&!a.auto);const vec=await vecTexts(rest,F);
          if(rest.some(a=>!vec.has(a.id)||a.bg)||(S.wm&&S.wm.text)||S.pnum){
            await ensureImgs(p);const s=3,c=document.createElement('canvas');c.width=Math.round(W*s);c.height=Math.round(H*s);
            drawAnns(c.getContext('2d'),rest,s,true,vec);decorate(c,W,num);bleedWhite(c);const png=await out.embedPng(await canvasBytes(c,'image/png'));
            const [ox,oy]=map(0,H);cp.drawImage(png,{x:ox,y:oy,width:W,height:H,rotate:PDFLib.degrees(R)});
          }
          for(const a of rest)if(vec.has(a.id))await drawVecText(cp,a,F,map,R);
          continue;
        }
      }
      const vec=await vecTexts(p.anns,F);
      const c=await composite(p,pageScale(p),vec);decorate(c,dw(p),++num);
      const img=p.fromWord?await out.embedPng(await canvasBytes(c,'image/png')):await out.embedJpg(await canvasBytes(c,'image/jpeg',0.9));
      const pg=out.addPage([dw(p),dh(p)]);pg.drawImage(img,{x:0,y:0,width:dw(p),height:dh(p)});c.width=c.height=0;
      const H0=dh(p);for(const a of p.anns)if(vec.has(a.id))await drawVecText(pg,a,F,(X,Y)=>[X,H0-Y],0);
    }
    busy('Dosya yazılıyor…');const bytes=await out.save();if(ret)return bytes;busy(false);
    return await saveFile(filename,new Blob([bytes],{type:'application/pdf'}));
  }catch(e){console.error(e);toast('PDF oluşturulamadı: '+(e.message||e),6000)}finally{busy(false)}
}
async function exportSplit(){
  flushEdit();const pp=S.pages;if(pp.length<2){toast('Bölmek için en az 2 sayfa gerekir.');return}
  const files=[];for(let i=0;i<pp.length;i++){const b=await exportPdf([pp[i]],'',false,true);if(!b)return;files.push([`${base()}-sayfa-${String(i+1).padStart(2,'0')}.pdf`,new Uint8Array(b)])}
  busy(false);await saveFile(`${base()}-sayfalar.zip`,zipStore(files,'application/zip'));
}
async function exportImage(type){
  const p=S.pages[S.cur];if(!p){toast('Kaydedilecek sayfa yok.');return}
  busy('Resim hazırlanıyor…');
  try{const c=await composite(p,pageScale(p));const b=await canvasBlob(c,type==='png'?'image/png':'image/jpeg',0.92);busy(false);await saveFile(`${base()}-sayfa${S.cur+1}.${type}`,b)}
  catch(e){toast('Resim oluşturulamadı: '+(e.message||e))}finally{busy(false)}
}
const base=()=>(S.baseName||'belge').replace(/[\\/:*?"<>|]+/g,'-');

