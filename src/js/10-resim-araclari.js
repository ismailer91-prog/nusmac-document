/* ---------- resim araçları (sayfa üstünde) ---------- */
function clampRect(p,r){const x=Math.max(0,r.x),y=Math.max(0,r.y),x2=Math.min(dw(p),r.x+r.w),y2=Math.min(dh(p),r.y+r.h);return x2-x>=3&&y2-y>=3?{x,y,w:x2-x,h:y2-y}:null}
async function regionCanvas(p,r,pts){const s=Math.min(pageScale(p),3);const full=await composite(p,s);const c=document.createElement('canvas');c.width=Math.max(1,Math.round(r.w*s));c.height=Math.max(1,Math.round(r.h*s));const x=c.getContext('2d');
  if(pts){x.beginPath();pts.forEach(([X,Y],i)=>{const a=(X-r.x)*s,b=(Y-r.y)*s;i?x.lineTo(a,b):x.moveTo(a,b)});x.closePath();x.clip()}
  x.drawImage(full,-r.x*s,-r.y*s);full.width=full.height=0;return c}
async function imageOp(p,a){
  const lasso=a.temp==='lasso';let r;
  if(lasso){if(a.pts.length<4)return;const b=bbox(a);r=clampRect(p,b)}else r=clampRect(p,a);
  if(!r){toast('Seçilen alan sayfanın dışında kaldı.');return}
  busy('İşleniyor…');
  try{const c=await regionCanvas(p,r,lasso?a.pts:null);
    if(a.temp==='grab'){busy(false);showGrab(p,c,r);return}
    const url=URL.createObjectURL(await canvasBlob(c,'image/png'));await loadImg(url);
    pushUndo();
    let cover;if(lasso){const cx=a.pts.reduce((t,q)=>t+q[0],0)/a.pts.length,cy=a.pts.reduce((t,q)=>t+q[1],0)/a.pts.length;
      cover={id:nid('a'),type:'poly',pts:a.pts.map(([x,y])=>{const d=Math.hypot(x-cx,y-cy)||1,k=Math.max(0,(d-0.9)/d);return[cx+(x-cx)*k,cy+(y-cy)*k]}),fill:'#ffffff'}}
    else cover={id:nid('a'),type:'white',x:r.x+0.5,y:r.y+0.5,w:Math.max(0,r.w-1),h:Math.max(0,r.h-1)};
    const piece={id:nid('a'),type:'img',x:r.x,y:r.y,w:r.w,h:r.h,src:url};
    p.anns.push(cover,piece);setTool('select');S.sel={pageId:p.id,aid:piece.id};S.ctx='ann';renderOv(p);markThumb(p);updSelUI();
    toast('Parça kesildi. Sürükleyerek istediğiniz yere taşıyın; köşesinden boyutlandırabilirsiniz.',5000)}
  catch(e){console.error(e);toast('İşlenemedi: '+(e.message||e))}finally{busy(false)}
}
function showGrab(p,c,r){const m=$('#grabMenu');const e=E[p.id];const pr=e.pg.getBoundingClientRect();
  m.innerHTML=`<div class="ddh">Seçilen alan · ${c.width}×${c.height} px</div>
    <button data-g="png">${ic('save')}<span><b>PNG olarak kaydet</b><small>En iyi kalite</small></span></button>
    <button data-g="jpg">${ic('save')}<span><b>JPG olarak kaydet</b><small>Küçük dosya</small></span></button>
    <button data-g="page">${ic('plus')}<span><b>Yeni sayfa yap</b><small>Bu sayfanın arkasına eklenir</small></span></button>
    <button data-g="place">${ic('image')}<span><b>Bu sayfaya parça olarak koy</b><small>Kopyası taşınabilir olur</small></span></button>
    ${S.txt&&document.contains(S.txt)?`<button data-g="txt">${ic('text')}<span><b>Yazı sayfasına ekle</b><small>İmlecin son olduğu yere</small></span></button>`:''}
    <button data-g="copy">${ic('copy')}<span><b>Panoya kopyala</b><small>Başka programa yapıştırmak için</small></span></button>`;
  m.onclick=async ev=>{const b=ev.target.closest('[data-g]');if(!b)return;const g=b.dataset.g;closeDD();
    try{if(g==='png'||g==='jpg'){await saveFile(`${base()}-parca.${g}`,await canvasBlob(c,g==='png'?'image/png':'image/jpeg',0.92))}
      else if(g==='page'){pushUndo();const i=S.pages.indexOf(p)+1;addPage(imgPage(c,'Alınan görsel'),i);buildViewer();scrollToPage(i,false);toast('Seçilen alan yeni sayfa olarak eklendi.')}
      else if(g==='place'){const url=URL.createObjectURL(await canvasBlob(c,'image/png'));await loadImg(url);pushUndo();const a={id:nid('a'),type:'img',x:Math.min(r.x+16,dw(p)-r.w),y:Math.min(r.y+16,dh(p)-r.h),w:r.w,h:r.h,src:url};p.anns.push(a);setTool('select');S.sel={pageId:p.id,aid:a.id};S.ctx='ann';renderOv(p);markThumb(p);toast('Kopya parça eklendi; sürükleyerek taşıyın.')}
      else if(g==='txt'){const blob=await canvasBlob(c,'image/png');txtImages([new File([blob],'parca.png',{type:'image/png'})])}
      else if(g==='copy'){try{await navigator.clipboard.write([new ClipboardItem({'image/png':await canvasBlob(c,'image/png')})]);toast('Panoya kopyalandı.')}catch(e){toast('Bu ortamda panoya kopyalanamadı. Kaydet seçeneğini kullanın.')}}}
    catch(e){toast('İşlem yapılamadı: '+(e.message||e))}};
  openDDAt(m,pr.left+(r.x+r.w)*S.k+8,pr.top+r.y*S.k,null)}
$('#splitBtn').onclick=()=>curPage(p=>{if(p.kind==='text'){toast('Parçalama PDF ve resim sayfalarında çalışır.');return}$('#spInfo').textContent=`Sayfa ${S.pages.indexOf(p)+1} eşit parçalara bölünecek.`;$('#splitModal').hidden=false});
$('#spCancel').onclick=()=>$('#splitModal').hidden=true;
$('#spGo').onclick=async()=>{const p=S.pages[S.cur];if(!p)return;const R=Math.max(1,Math.min(12,+$('#spR').value||1)),C=Math.max(1,Math.min(12,+$('#spC').value||1));if(R*C<2){toast('En az 2 parça seçin.');return}
  const mode=document.querySelector('input[name="spm"]:checked').value;$('#splitModal').hidden=true;busy('Parçalanıyor…');
  try{const W=dw(p),H=dh(p),cw=W/C,ch=H/R;const s=Math.min(pageScale(p),3);const full=await composite(p,s);const parts=[];
    for(let i=0;i<R;i++)for(let j=0;j<C;j++){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(cw*s));c.height=Math.max(1,Math.round(ch*s));c.getContext('2d').drawImage(full,-j*cw*s,-i*ch*s);parts.push({c,x:j*cw,y:i*ch})}
    if(mode==='zip'){const files=[];for(let k=0;k<parts.length;k++)files.push([`${base()}-parca-${String(k+1).padStart(2,'0')}.png`,new Uint8Array(await (await canvasBlob(parts[k].c,'image/png')).arrayBuffer())]);busy(false);await saveFile(`${base()}-parcalar.zip`,zipStore(files,'application/zip'))}
    else if(mode==='pages'){pushUndo();const at=S.pages.indexOf(p)+1;parts.forEach((q,k)=>addPage(imgPage(q.c,`Parça ${k+1}`),at+k));busy(false);buildViewer();scrollToPage(at,false);toast(`${parts.length} parça yeni sayfa olarak eklendi.`)}
    else{pushUndo();p.anns.push({id:nid('a'),type:'white',x:0,y:0,w:W,h:H});for(const q of parts){const url=URL.createObjectURL(await canvasBlob(q.c,'image/png'));await loadImg(url);p.anns.push({id:nid('a'),type:'img',x:q.x,y:q.y,w:cw,h:ch,src:url})}
      busy(false);setTool('select');renderOv(p);markThumb(p);toast(`Sayfa ${parts.length} parçaya bölündü. Parçaları sürükleyerek yeniden dizebilirsiniz.`,5000)}}
  catch(e){console.error(e);toast('Parçalanamadı: '+(e.message||e))}finally{busy(false)}};
/* PDF'in içindeki resimleri çıkar */
function getImgObj(pg,id){const store=String(id).startsWith('g_')?pg.commonObjs:pg.objs;return new Promise(res=>{let done=false;try{if(store.has&&store.has(id)){done=true;res(store.get(id));return}store.get(id,o=>{done=true;res(o)})}catch(e){res(null)}setTimeout(()=>{if(!done)res(null)},5000)})}
function imgObjToCanvas(o){if(!o)return null;const c=document.createElement('canvas');const bm=o.bitmap||(typeof ImageBitmap!=='undefined'&&o instanceof ImageBitmap?o:null)||(o instanceof HTMLImageElement?o:null);
  if(bm){c.width=bm.width;c.height=bm.height;c.getContext('2d').drawImage(bm,0,0);return c}
  const w=o.width,h=o.height,d=o.data;if(!w||!h||!d)return null;c.width=w;c.height=h;const x=c.getContext('2d'),im=x.createImageData(w,h),t=im.data;
  if(o.kind===3)t.set(d.subarray(0,w*h*4));
  else if(o.kind===2){for(let i=0,j=0;i<w*h;i++,j+=3){t[i*4]=d[j];t[i*4+1]=d[j+1];t[i*4+2]=d[j+2];t[i*4+3]=255}}
  else if(o.kind===1){const rb=(w+7)>>3;for(let y=0;y<h;y++)for(let xx=0;xx<w;xx++){const v=(d[y*rb+(xx>>3)]>>(7-(xx&7)))&1?255:0;const k=(y*w+xx)*4;t[k]=t[k+1]=t[k+2]=v;t[k+3]=255}}
  else return null;x.putImageData(im,0,0);return c}
$('#pdfImgs').onclick=async()=>{const pp=S.pages.filter(p=>p.kind==='pdf');if(!pp.length){toast('Belgede PDF sayfası yok.');return}
  busy('Resimler aranıyor…');const out=[],seen=new Set();
  try{const O=pdfjsLib.OPS;const want=new Set([O.paintImageXObject,O.paintJpegXObject,O.paintImageXObjectRepeat].filter(v=>v!=null));
    for(let i=0;i<pp.length;i++){const p=pp[i];busy(`Resimler aranıyor… ${i+1}/${pp.length}`);const pg=await p.src.doc.getPage(p.index+1);const ops=await pg.getOperatorList();
      for(let j=0;j<ops.fnArray.length;j++){if(!want.has(ops.fnArray[j]))continue;const id=ops.argsArray[j][0];const key=p.src.name+'|'+id;if(seen.has(key))continue;seen.add(key);
        const c=imgObjToCanvas(await getImgObj(pg,id));if(c&&c.width>=24&&c.height>=24)out.push(c)}}
    if(!out.length){busy(false);toast('Bu PDF’te ayrı resim bulunamadı. Bir bölgeyi resim olarak almak için Görsel al aracını kullanın.',6000);return}
    if(out.length===1){busy(false);await saveFile(`${base()}-resim.png`,await canvasBlob(out[0],'image/png'));return}
    const files=[];for(let k=0;k<out.length;k++)files.push([`${base()}-resim-${String(k+1).padStart(2,'0')}.png`,new Uint8Array(await (await canvasBlob(out[k],'image/png')).arrayBuffer())]);
    busy(false);await saveFile(`${base()}-resimler.zip`,zipStore(files,'application/zip'));toast(`${out.length} resim çıkarıldı.`)}
  catch(e){console.error(e);toast('Resimler çıkarılamadı: '+(e.message||e))}finally{busy(false)}};

