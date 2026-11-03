/* ---------- signature ---------- */
const pad=$('#sigPad'),pctx=pad.getContext('2d');let ink='#1f3fbf',padDirty=false;
function clearPad(){pctx.clearRect(0,0,pad.width,pad.height);padDirty=false}
function openSign(){if(!S.pages.length){toast('Önce bir sayfa açın.');return}clearPad();renderSaved();$('#sigModal').hidden=false}
function closeSign(){$('#sigModal').hidden=true}
pad.addEventListener('pointerdown',e=>{e.preventDefault();pad.setPointerCapture(e.pointerId);const r=pad.getBoundingClientRect(),sx=pad.width/r.width,sy=pad.height/r.height;
  pctx.strokeStyle=ink;pctx.lineWidth=3.4;pctx.lineCap='round';pctx.lineJoin='round';pctx.beginPath();pctx.moveTo((e.clientX-r.left)*sx,(e.clientY-r.top)*sy);pctx.lineTo((e.clientX-r.left)*sx+0.1,(e.clientY-r.top)*sy);pctx.stroke();padDirty=true;
  const mv=m=>{pctx.lineTo((m.clientX-r.left)*sx,(m.clientY-r.top)*sy);pctx.stroke()};const up=()=>{pad.removeEventListener('pointermove',mv);pad.removeEventListener('pointerup',up)};
  pad.addEventListener('pointermove',mv);pad.addEventListener('pointerup',up)});
$$('[data-ink]').forEach(b=>b.onclick=()=>{ink=b.dataset.ink;$$('[data-ink]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
$('#sigClear').onclick=clearPad;$('#sigCancel').onclick=closeSign;
$('#sigModal').addEventListener('pointerdown',e=>{if(e.target.id==='sigModal')closeSign()});
$('#sigFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const im=await fileToImage(f);clearPad();const [iw,ih]=srcSize(im);const s=Math.min(pad.width/iw,pad.height/ih);const w=iw*s,h=ih*s;
    const tmp=document.createElement('canvas');tmp.width=pad.width;tmp.height=pad.height;const t=tmp.getContext('2d');t.drawImage(im,(pad.width-w)/2,(pad.height-h)/2,w,h);
    if($('#sigWhite').checked){const d=t.getImageData(0,0,tmp.width,tmp.height),a=d.data;for(let i=0;i<a.length;i+=4){const m=Math.min(a[i],a[i+1],a[i+2]);if(m>215)a[i+3]=0;else if(m>170)a[i+3]=Math.round(a[i+3]*(215-m)/45)}t.putImageData(d,0,0)}
    pctx.drawImage(tmp,0,0);padDirty=true}catch(err){toast(err.message)}};
function trim(c){const ctx=c.getContext('2d'),{width:w,height:h}=c,d=ctx.getImageData(0,0,w,h).data;let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>10){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  if(x1<0)return null;const m=6;x0=Math.max(0,x0-m);y0=Math.max(0,y0-m);x1=Math.min(w-1,x1+m);y1=Math.min(h-1,y1+m);
  const o=document.createElement('canvas');o.width=x1-x0+1;o.height=y1-y0+1;o.getContext('2d').drawImage(c,x0,y0,o.width,o.height,0,0,o.width,o.height);return o}
function preparePlace(src,ar,w){S.pendingImg={src,ar,w};loadImg(src);setTool('place')}
$('#sigOk').onclick=()=>{if(!padDirty){toast('Önce imzanızı çizin ya da bir resim yükleyin.');return}const t=trim(pad);if(!t){toast('Alan boş görünüyor.');return}
  const src=t.toDataURL('image/png');const list=lsGet('belgemasasi.imzalar',[]);list.unshift(src);lsSet('belgemasasi.imzalar',list.slice(0,6));
  closeSign();preparePlace(src,t.width/t.height,140)};
function renderSaved(){const list=lsGet('belgemasasi.imzalar',[]);$('#sigSavedWrap').hidden=!list.length;const box=$('#sigSaved');box.innerHTML='';
  list.forEach((src,i)=>{const c=el('div','chip');c.innerHTML=`<img src="${src}" alt="Kayıtlı imza ${i+1}"><button class="x" title="Sil" aria-label="Sil">×</button>`;
    c.onclick=e=>{if(e.target.closest('.x')){const l=lsGet('belgemasasi.imzalar',[]);l.splice(i,1);lsSet('belgemasasi.imzalar',l);renderSaved();return}
      const im=c.querySelector('img');closeSign();preparePlace(src,(im.naturalWidth||3)/(im.naturalHeight||1),140)};box.append(c)})}
$('#signBtn').onclick=openSign;

