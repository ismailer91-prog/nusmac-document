/* ---------- opening files ---------- */
function clearSample(){if(S.pages.length&&S.pages.every(p=>p.sample)){S.pages=[];S.undo=[];S.redo=[];S.sel=null;S.checked.clear()}}
function setBase(name){if(!S.baseName)S.baseName=name.replace(/\.[^.]+$/,'')}
async function openFiles(files){
  files=[...files]; if(!files.length) return;
  if(!$('#studio').hidden){const rest=files.filter(f=>!/\.docx?$/i.test(f.name));if(rest.length)await gAddFiles(rest);else toast('Resim düzenleyiciye yalnızca resim ve PDF eklenebilir.');return}
  let added=0,start=0; const hadReal=S.pages.some(p=>!p.sample);
  for(const f of files){
    const ext=(f.name.split('.').pop()||'').toLowerCase();
    try{
      if(ext==='doc'){toast('Eski .doc biçimi açılamıyor. Word’de açıp “.docx” olarak kaydedip tekrar deneyin.',6000);continue}
      if(!['pdf','docx','tif','tiff','jpg','jpeg','png','webp','gif','bmp'].includes(ext)&&!(f.type||'').startsWith('image/')&&f.type!=='application/pdf'){toast(`${f.name}: bu dosya türü açılamıyor.`);continue}
      busy(`${f.name} açılıyor…`);
      if(!added){wDesel();syncAll();clearSample();if(!hadReal) S.baseName=''; pushUndo();start=S.pages.length}
      if(ext==='docx'){const r=await withTimeout(f.arrayBuffer().then(docxToHtml),60000,'Dosya 60 saniyede açılamadı. Çok büyük olabilir.');addPage(textPage(r.html,f.name))}
      else if(ext==='pdf'||f.type==='application/pdf') await addPdf(f);
      else if(ext==='tif'||ext==='tiff') await addTiff(f);
      else await addImage(f);
      added++; setBase(f.name);
    }catch(e){console.error(e);toast(`${f.name} açılamadı: ${e&&e.name==='PasswordException'?'dosya parola korumalı.':(e.message||e)}`,6000)}
  }
  busy(false);
  if(added){buildViewer();queueObj(S.pages.slice(start));queueOcr(S.pages.slice(start));if(!hadReal) requestAnimationFrame(fitWidth);requestAnimationFrame(()=>scrollToPage(start,false));toast(added>1?'Dosyalar belgeye arka arkaya eklendi.':'Dosya belgeye eklendi.')}
}
async function addPdf(f){
  if(!window.pdfjsLib) throw new Error('PDF okuyucu yüklenemedi');
  const bytes=new Uint8Array(await f.arrayBuffer());
  const doc=await pdfjsLib.getDocument({data:bytes.slice(),isEvalSupported:false,useSystemFonts:true}).promise;
  const src={doc,bytes,name:f.name,lib:undefined,tc:{}};
  for(let i=0;i<doc.numPages;i++){
    const pg=await doc.getPage(i+1);const vp=pg.getViewport({scale:1});
    addPage({id:nid('p'),kind:'pdf',src,index:i,w:vp.width,h:vp.height,rot:0,anns:[],name:f.name});
  }
}
function imgPage(img,name,extra){
  const [iw,ih]=srcSize(img);const s=Math.min(0.75,842/Math.max(iw,ih));
  return Object.assign({id:nid('p'),kind:'img',img,w:iw*s,h:ih*s,rot:0,anns:[],name,nat:iw/(iw*s)},extra||{});
}
async function addImage(f){addPage(imgPage(await fileToImage(f),f.name))}
async function addTiff(f){const cs=tiffCanvases(await f.arrayBuffer());cs.forEach(c=>addPage(imgPage(c,f.name)))}

