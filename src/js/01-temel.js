const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const PT2PX=96/72;
const dlP=(window.claude&&window.claude.use)?window.claude.use('downloads').catch(()=>null):Promise.resolve(null);
if(window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/* ---------- icons ---------- */
const I={
 open:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3z"/><path d="M3 10h18l-2 9H5z"/>',
 save:'<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/>',
 select:'<path d="M6 3l12 9-5.5 1.2L9.5 19z"/>',
 text:'<path d="M5 7V5h14v2"/><path d="M12 5v14"/><path d="M9 19h6"/>',
 hl:'<path d="m14 4 6 6-8 8H6v-6z"/><path d="M4 21h9"/>',
 pen:'<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
 rect:'<rect x="4" y="6" width="16" height="12" rx="1"/>',
 arrow:'<path d="M5 19 19 5"/><path d="M10 5h9v9"/>',
 white:'<path d="M3 17h10"/><path d="m8 13 7-8 5 5-7 8H9z"/>',
 sign:'<path d="M3 16c2.5-.5 3.5-8 6-8 2 0 0 8 2.5 8 2 0 2-4 4-4s1 3 3 3 2.5-1 2.5-1"/><path d="M3 20h18"/>',
 image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
 undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
 redo:'<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
 zin:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8 11h6M11 8v6"/>',
 zout:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8 11h6"/>',
 fit:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 rotl:'<path d="M4 3v5h5"/><path d="M4.6 8A8 8 0 1 1 4 12"/>',
 rotr:'<path d="M20 3v5h-5"/><path d="M19.4 8A8 8 0 1 0 20 12"/>',
 trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
 up:'<path d="m6 15 6-6 6 6"/>', down:'<path d="m6 9 6 6 6-6"/>',
 plus:'<path d="M6 3h9l4 4v14H6z"/><path d="M12 10v7M8.5 13.5h7"/>',
 side:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
 al:'<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>', ac:'<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
 ar:'<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>', aj:'<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
 ul:'<circle cx="5" cy="7" r="1.2"/><circle cx="5" cy="12" r="1.2"/><circle cx="5" cy="17" r="1.2"/><path d="M10 7h10M10 12h10M10 17h10"/>',
 ol:'<path d="M4 5h1.5v4M4 9h3M4 14h3l-3 4h3"/><path d="M10 7h10M10 12h10M10 17h10"/>',
 ind:'<path d="M4 6h16M10 10h10M10 14h10M4 18h16"/><path d="m4 9.5 3 2.5-3 2.5"/>',
 outd:'<path d="M4 6h16M10 10h10M10 14h10M4 18h16"/><path d="M7 9.5 4 12l3 2.5"/>',
 table:'<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 10h18M3 15h18M9 5v14M15 5v14"/>',
 pbreak:'<path d="M6 3v5h12V3M6 21v-5h12v5"/><path d="M3 12h3M9 12h2M13 12h2M18 12h3"/>',
 clear:'<path d="M6 5h12M12 5l-3 14"/><path d="m15 15 5 5M20 15l-5 5"/>',
 move:'<path d="M12 3v18M3 12h18"/><path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
 marquee:'<rect x="4" y="4" width="16" height="16" rx="1" stroke-dasharray="3 3"/>',
 crop:'<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>',
 uncrop:'<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/><path d="M3 21 21 3"/>',
 ellipse:'<ellipse cx="12" cy="12" rx="9" ry="6.5"/>',
 eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 eyeoff:'<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.8M6.3 6.3C3.6 8 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.2-1.5"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/><path d="M14 20h6"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
 flipH:'<path d="M12 3v18"/><path d="M9 7 4 17h5zM15 7l5 10h-5z"/>',
 flipV:'<path d="M3 12h18"/><path d="M7 9 17 4v5zM7 15l10 5v-5z"/>',
 scissors:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
 lasso:'<path d="M7 17.5C4.6 16.4 3 14.4 3 12c0-4.4 4-8 9-8s9 3.1 9 7-4 6.5-9 6.5c-1.7 0-3.3-.3-4.6-.8"/><path d="M7.5 16c-1.2 1.7-.6 4.2 1.6 5"/>',
 grid:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18M12 3v18"/>',
 grab:'<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
 more:'<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
 cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 hash:'<path d="M5 9h15M4 15h15M10 3 8 21M16 3l-2 18"/>',
 drop:'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'
};
const ic=n=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]||''}</svg>`;
$$('[data-ico]').forEach(e=>e.insertAdjacentHTML('afterbegin',ic(e.dataset.ico)));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- ui helpers ---------- */
let toastT;
function toast(m,ms=3800){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,ms)}
function busy(m){const b=$('#busy');if(m===false){b.hidden=true;return}$('#busyMsg').textContent=m;b.hidden=false}
const tick=()=>new Promise(r=>setTimeout(r,0));
function lsGet(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}

const TRMAP={'ı':'i','İ':'I','ş':'s','Ş':'S','ğ':'g','Ğ':'G','ü':'u','Ü':'U','ö':'o','Ö':'O','ç':'c','Ç':'C'};
function safeName(n){return n.replace(/[ıİşŞğĞüÜöÖçÇ]/g,c=>TRMAP[c]).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,'-').replace(/[^\x20-\x7e]/g,'').replace(/-{2,}/g,'-')||'belge'}
async function saveFile(filename,data){filename=safeName(filename);
  let dl=null; try{dl=await dlP}catch(e){}
  if(dl){
    try{await dl.save({filename,data});toast('Kaydedildi: '+filename);return true}
    catch(e){
      const c=e&&e.code;
      if(c==='declined'){toast('Kaydetme iptal edildi.');return false}
      if(c==='rate_limited'){toast('Açık bir kaydetme penceresi var. Biraz bekleyip tekrar deneyin.');return false}
      if(c==='too_large'){toast('Dosya bu ortamda kaydedilemeyecek kadar büyük.');return false}
      if(!['unavailable','not_granted','capability_disabled','capability_removed'].includes(c)){toast('Kaydedilemedi: '+((e&&e.message)||e));return false}
    }
  }
  const blob=data instanceof Blob?data:new Blob([data]);
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
  toast('Kaydediliyor: '+filename);return true;
}
const canvasBlob=(c,type,q)=>new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('Görüntü oluşturulamadı')),type,q));
async function canvasBytes(c,type,q){return new Uint8Array(await (await canvasBlob(c,type,q)).arrayBuffer())}

/* ---------- state ---------- */
const S={pages:[],k:PT2PX,tool:'select',sel:null,editing:null,color:'#1f3fbf',hlColor:'#ffe45c',lw:2,fs:14,bold:false,font:'Arial',italic:false,underline:false,align:'left',ctx:null,txt:null,tRange:null,dirty:false,wm:null,pnum:false,words:0,objAuto:true,objMsg:'',
  checked:new Set(),undo:[],redo:[],mode:'pages',pendingImg:null,cur:0,hits:[],hitI:-1,baseName:''};
const pool=new Map(), E={}, visible=new Set(), imgCache=new Map();
try{const v=localStorage.getItem('nusmac.objAuto');if(v!=null)S.objAuto=JSON.parse(v)}catch(e){}
let uid=1; const nid=p=>p+(uid++);
const fw=p=>p.rot%180?p.h:p.w, fh=p=>p.rot%180?p.w:p.h;
const dw=p=>p.clip?p.clip.w:fw(p), dh=p=>p.clip?p.clip.h:fh(p);
const cx0=p=>p.clip?p.clip.x:0, cy0=p=>p.clip?p.clip.y:0;
const FONTS={'Arial':"Arial, Helvetica, sans-serif",'Times New Roman':"'Times New Roman', Times, serif",'Calibri':"Calibri, Carlito, 'Segoe UI', sans-serif",'Cambria':"Cambria, Caladea, Georgia, serif",'Verdana':"Verdana, Geneva, sans-serif",'Georgia':"Georgia, serif",'Tahoma':"Tahoma, Verdana, sans-serif",'Courier New':"'Courier New', Courier, monospace",'Impact':"Impact, 'Arial Black', sans-serif"};
const fontCss=f=>FONTS[f]||FONTS.Arial;
function addPage(p,at){pool.set(p.id,p); if(at==null) S.pages.push(p); else S.pages.splice(at,0,p)}

const SW=[['#111111','Siyah'],['#1f3fbf','Mavi'],['#c62828','Kırmızı'],['#2e7d32','Yeşil'],['#6a1b9a','Mor']];
$('#swatches').innerHTML=SW.map(([c,n])=>`<button class="sw" data-color="${c}" title="${n}" style="background:${c}" aria-pressed="${c===S.color}"></button>`).join('');
$('#fsSel').innerHTML=[8,9,10,11,12,14,16,18,20,24,28,36,48].map(n=>`<option value="${n}"${n===14?' selected':''}>${n} pt</option>`).join('');

/* ---------- image helpers ---------- */
function loadImg(src){let c=imgCache.get(src);if(c)return c.p;const im=new Image();const p=new Promise((res,rej)=>{im.onload=()=>res(im);im.onerror=()=>rej(new Error('Resim yüklenemedi'))});im.src=src;imgCache.set(src,{im,p});return p}
function cachedImg(src){const c=imgCache.get(src);return c&&c.im.complete?c.im:null}
function drawRot(ctx,src,rot,W,H){ctx.save();ctx.translate(W/2,H/2);ctx.rotate(rot*Math.PI/180);const w=rot%180?H:W,h=rot%180?W:H;ctx.drawImage(src,-w/2,-h/2,w,h);ctx.restore()}
function tiffCanvases(buf){
  if(!window.UTIF) throw new Error('TIF okuyucu yüklenemedi');
  const ifds=UTIF.decode(buf), out=[];
  for(const ifd of ifds){
    try{UTIF.decodeImage(buf,ifd)}catch(e){continue}
    const w=ifd.width,h=ifd.height; if(!w||!h||w<2||h<2) continue;
    const rgba=UTIF.toRGBA8(ifd); const c=document.createElement('canvas');c.width=w;c.height=h;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer,rgba.byteOffset,w*h*4),w,h),0,0);
    out.push(c);
  }
  if(!out.length) throw new Error('TIF içinde okunabilir sayfa bulunamadı');
  return out;
}
async function fileToImage(f){
  const ext=(f.name.split('.').pop()||'').toLowerCase();
  if(ext==='tif'||ext==='tiff') return tiffCanvases(await f.arrayBuffer())[0];
  const url=URL.createObjectURL(f);const im=new Image();im.src=url;
  try{await im.decode()}catch(e){URL.revokeObjectURL(url);throw new Error('Resim açılamadı')}
  return im;
}
function srcSize(s){return [s.naturalWidth||s.width,s.naturalHeight||s.height]}

