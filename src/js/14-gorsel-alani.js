/* ================= Görsel alanı (katmanlı resim düzenleyici) ================= */
const G={W:1600,H:1000,bg:'#ffffff',layers:[],sel:null,tool:'move',z:1,ox:0,oy:0,fitted:false,autoFit:true,undo:[],redo:[],mq:null,drag:null,space:false,cropTarget:null};
const gcv=$('#gcv'),gctx=gcv.getContext('2d');
let gRaf=0,gN=1,gPending=null;
function gDraw(){if(!gRaf)gRaf=requestAnimationFrame(()=>{gRaf=0;gRender()})}
const gL=id=>G.layers.find(l=>l.id===id), gSelL=()=>G.sel?gL(G.sel)||null:null;
const PRESETS=[['Serbest',0,0],['A4 dikey (1240×1754)',1240,1754],['A4 yatay (1754×1240)',1754,1240],['Kare (1080×1080)',1080,1080],['Dikey gönderi (1080×1350)',1080,1350],['Geniş ekran (1920×1080)',1920,1080],['Hikâye (1080×1920)',1080,1920]];
function gSnap(){return{W:G.W,H:G.H,bg:G.bg,layers:G.layers.map(l=>Object.assign({},l)),sel:G.sel}}
function gCommit(s){G.undo.push(s);if(G.undo.length>60)G.undo.shift();G.redo=[];gUpdUndo()}
function gRestore(s){const resized=s.W!==G.W||s.H!==G.H;G.W=s.W;G.H=s.H;G.bg=s.bg;G.layers=s.layers.map(l=>Object.assign({},l));G.sel=s.sel&&G.layers.some(l=>l.id===s.sel)?s.sel:null;G.mq=null;if(resized)G.fitted=false;gChanged(true)}
function gUndo(){if(!G.undo.length)return;G.redo.push(gSnap());gRestore(G.undo.pop());gUpdUndo()}
function gRedo(){if(!G.redo.length)return;G.undo.push(gSnap());gRestore(G.redo.pop());gUpdUndo()}
function gUpdUndo(){$('#gUndo').disabled=!G.undo.length;$('#gRedo').disabled=!G.redo.length}
function gOp(fn){const before=gSnap();if(fn()!==false){gCommit(before);gChanged(true)}}

/* geometry */
const tp=(m,x,y)=>{const q=m.transformPoint(new DOMPoint(x,y));return[q.x,q.y]};
function nfMat(l){return new DOMMatrix().translate(l.x+l.w/2,l.y+l.h/2).rotate(l.rot||0)}
function lMat(l){return nfMat(l).scale(l.flipX?-1:1,l.flipY?-1:1)}
function corners(l){const m=nfMat(l),w=l.w/2,h=l.h/2;return[[-w,-h],[w,-h],[w,h],[-w,h]].map(([x,y])=>tp(m,x,y))}
function aabb(l){const c=corners(l);const xs=c.map(q=>q[0]),ys=c.map(q=>q[1]);const x=Math.min(...xs),y=Math.min(...ys);return{x,y,w:Math.max(1,Math.max(...xs)-x),h:Math.max(1,Math.max(...ys)-y)}}
function unionBox(ls){const bs=ls.map(aabb);const x=Math.min(...bs.map(b=>b.x)),y=Math.min(...bs.map(b=>b.y));return{x,y,w:Math.max(...bs.map(b=>b.x+b.w))-x,h:Math.max(...bs.map(b=>b.y+b.h))-y}}

/* drawing */
const mctx=document.createElement('canvas').getContext('2d');
function gFont(l){return `${l.italic?'italic ':''}${l.bold?'bold ':''}${l.size}px ${fontCss(l.font)}`}
function gMeasure(l){mctx.font=gFont(l);const lines=(l.text||' ').split('\n');l.w=Math.max(8,...lines.map(s=>mctx.measureText(s).width))+l.size*0.2;l.h=lines.length*l.size*1.25}
function drawLayer(ctx,l){
  if(!l.visible)return;ctx.save();ctx.globalAlpha*=(l.opacity==null?1:l.opacity);const m=lMat(l);ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);const w=l.w,h=l.h;
  if(l.type==='image'){const f=[];if(l.bright)f.push(`brightness(${(1+l.bright/100).toFixed(2)})`);if(l.contrast)f.push(`contrast(${(1+l.contrast/100).toFixed(2)})`);if(l.gray)f.push('grayscale(1)');
    if(f.length)ctx.filter=f.join(' ');ctx.imageSmoothingQuality='high';ctx.drawImage(l.src,l.sx,l.sy,l.sw,l.sh,-w/2,-h/2,w,h)}
  else if(l.type==='shape'){ctx.beginPath();if(l.shape==='ellipse')ctx.ellipse(0,0,Math.max(.5,w/2),Math.max(.5,h/2),0,0,Math.PI*2);else ctx.rect(-w/2,-h/2,w,h);
    if(l.fill){ctx.fillStyle=l.fill;ctx.fill()}if(l.stroke&&l.sw>0){ctx.lineWidth=l.sw;ctx.strokeStyle=l.stroke;ctx.stroke()}}
  else if(l.type==='text'){ctx.font=gFont(l);ctx.fillStyle=l.color;ctx.textBaseline='top';const lh=l.size*1.25,pad=l.size*0.1,iw=w-pad*2;
    (l.text||'').split('\n').forEach((s,i)=>{const lw=ctx.measureText(s).width;const x=-w/2+pad+(l.align==='center'?(iw-lw)/2:l.align==='right'?iw-lw:0);const y=-h/2+i*lh+l.size*0.12;ctx.fillText(s,x,y);if(l.underline&&s.trim())ctx.fillRect(x,y+l.size*0.98,lw,Math.max(1,l.size/15))})}
  ctx.restore();
}
let gChk=null;
function gChecker(c){if(!gChk){const t=document.createElement('canvas');t.width=t.height=16;const x=t.getContext('2d');x.fillStyle='#ffffff';x.fillRect(0,0,16,16);x.fillStyle='#d9dbe2';x.fillRect(0,0,8,8);x.fillRect(8,8,8,8);gChk=c.createPattern(t,'repeat')}return gChk}
function gFit(){const st=$('#gstage');const cw=st.clientWidth,ch=st.clientHeight;if(!cw||!ch)return;G.z=Math.max(0.02,Math.min((cw-48)/G.W,(ch-48)/G.H,4));G.ox=(cw-G.W*G.z)/2;G.oy=(ch-G.H*G.z)/2;G.fitted=true;G.autoFit=true;$('#gZl').textContent=Math.round(G.z*100)+'%'}
function gZoomAt(z,sx,sy){z=Math.max(0.02,Math.min(16,z));const ax=(sx-G.ox)/G.z,ay=(sy-G.oy)/G.z;G.z=z;G.ox=sx-ax*z;G.oy=sy-ay*z;G.autoFit=false;$('#gZl').textContent=Math.round(z*100)+'%';gDraw()}
function gHandles(s){const m=nfMat(s),w=s.w/2,h=s.h/2;const cs=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx,sy])=>{const [x,y]=tp(m,sx*w,sy*h);return{x:G.ox+x*G.z,y:G.oy+y*G.z,sx,sy}});
  const [tx,ty]=tp(m,0,-h);const a=(s.rot||0)*Math.PI/180;const top={x:G.ox+tx*G.z,y:G.oy+ty*G.z};return{cs,top,rot:{x:top.x+Math.sin(a)*26,y:top.y-Math.cos(a)*26}}}
function gRender(){
  const st=$('#gstage');const cw=st.clientWidth,ch=st.clientHeight;if(!cw||!ch)return;const dpr=Math.min(window.devicePixelRatio||1,2);
  if(gcv.width!==Math.round(cw*dpr)||gcv.height!==Math.round(ch*dpr)){gcv.width=Math.round(cw*dpr);gcv.height=Math.round(ch*dpr)}
  if(!G.fitted)gFit();
  const c=gctx,cs=getComputedStyle(document.documentElement),acc=cs.getPropertyValue('--accent').trim()||'#3a3db0';
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,gcv.width,gcv.height);c.setTransform(dpr,0,0,dpr,0,0);
  c.save();c.translate(G.ox,G.oy);c.scale(G.z,G.z);
  c.save();c.shadowColor='rgba(20,22,40,.28)';c.shadowBlur=16;c.fillStyle=G.bg||'#ffffff';c.fillRect(0,0,G.W,G.H);c.restore();
  if(!G.bg){c.save();c.scale(1/G.z,1/G.z);c.fillStyle=gChecker(c);c.fillRect(0,0,G.W*G.z,G.H*G.z);c.restore()}
  c.save();c.beginPath();c.rect(0,0,G.W,G.H);c.clip();for(const l of G.layers)drawLayer(c,l);c.restore();
  c.restore();
  const s=gSelL();
  if(s){const pts=corners(s).map(([x,y])=>[G.ox+x*G.z,G.oy+y*G.z]);c.lineWidth=1.5;c.strokeStyle=acc;c.setLineDash(s.visible?[]:[4,3]);c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.stroke();c.setLineDash([]);
    if(G.tool==='move'){const H=gHandles(s);c.beginPath();c.moveTo(H.top.x,H.top.y);c.lineTo(H.rot.x,H.rot.y);c.stroke();
      c.fillStyle='#ffffff';c.beginPath();c.arc(H.rot.x,H.rot.y,6,0,Math.PI*2);c.fill();c.stroke();
      for(const h of H.cs){c.fillStyle='#ffffff';c.fillRect(h.x-5,h.y-5,10,10);c.strokeRect(h.x-5,h.y-5,10,10)}}}
  const box=(b,col)=>{const x=G.ox+b.x*G.z,y=G.oy+b.y*G.z,w=b.w*G.z,h=b.h*G.z;c.lineWidth=1;c.strokeStyle='#ffffff';c.setLineDash([]);c.strokeRect(x,y,w,h);c.strokeStyle=col;c.setLineDash([5,4]);c.strokeRect(x,y,w,h);c.setLineDash([])};
  if(G.drag&&G.drag.k==='box'){const b=G.drag.box;if(G.tool==='crop'){c.fillStyle='rgba(10,12,30,.35)';const x=G.ox+b.x*G.z,y=G.oy+b.y*G.z;c.beginPath();c.rect(0,0,cw,ch);c.rect(x,y+b.h*G.z,b.w*G.z,-b.h*G.z);c.fill('evenodd')}box(b,acc)}
  if(G.mq)box(G.mq,'#111111');
}

/* layers */
function gBase(type,name){return{id:'g'+(gN++),type,name,x:0,y:0,w:10,h:10,rot:0,opacity:1,visible:true,flipX:false,flipY:false}}
function gInsert(l){const s=gSelL();const i=s?G.layers.indexOf(s)+1:G.layers.length;G.layers.splice(i,0,l);return l}
function gNewText(ax,ay){const l=Object.assign(gBase('text','Yazınız'),{text:'Yazınız',font:'Arial',size:Math.max(24,Math.round(Math.min(G.W,G.H)/16)),color:'#111111',bold:true,italic:false,underline:false,align:'left'});gMeasure(l);l.x=ax;l.y=ay-l.h/2;return gInsert(l)}
function gNewShape(kind,b){return gInsert(Object.assign(gBase('shape',kind==='ellipse'?'Elips':'Dikdörtgen'),{shape:kind,x:b.x,y:b.y,w:b.w,h:b.h,fill:'#3a3db0',stroke:'#111111',sw:0}))}
function gNewImage(src,name,box){return Object.assign(gBase('image',name||'Resim'),{src,sx:0,sy:0,sw:src.width,sh:src.height,bright:0,contrast:0,gray:false},box)}
function toCanvas(src,max=6000){const [w,h]=srcSize(src);const s=Math.min(1,max/Math.max(w,h));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*s));c.height=Math.max(1,Math.round(h*s));c.getContext('2d').drawImage(src,0,0,c.width,c.height);return c}
function gAddCanvas(src,name){const c=toCanvas(src);const first=!G.layers.length;
  if(first){G.W=Math.min(8000,c.width);G.H=Math.min(8000,c.height);G.fitted=false}
  const s=first?Math.min(1,G.W/c.width,G.H/c.height):Math.min(1,0.9*G.W/c.width,0.9*G.H/c.height);
  const w=c.width*s,h=c.height*s;const l=gNewImage(c,name,{x:(G.W-w)/2,y:(G.H-h)/2,w,h});G.layers.push(l);G.sel=l.id;return l}
async function gAddFiles(files){
  const before=gSnap();let n=0;
  for(const f of files){const ext=(f.name.split('.').pop()||'').toLowerCase();const nm=f.name.replace(/\.[^.]+$/,'');
    try{busy(`${f.name} ekleniyor…`);
      if(ext==='pdf'){if(!window.pdfjsLib)throw new Error('PDF okuyucu yüklenemedi');const doc=await pdfjsLib.getDocument({data:new Uint8Array(await f.arrayBuffer()),isEvalSupported:false}).promise;const N=Math.min(doc.numPages,20);
        for(let i=1;i<=N;i++){const pg=await doc.getPage(i);const vp=pg.getViewport({scale:2});const c=document.createElement('canvas');c.width=Math.round(vp.width);c.height=Math.round(vp.height);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);await pg.render({canvasContext:x,viewport:vp}).promise;gAddCanvas(c,`${nm} s.${i}`);n++}
        if(doc.numPages>20)toast('PDF’in ilk 20 sayfası eklendi.')}
      else if(ext==='tif'||ext==='tiff'){tiffCanvases(await f.arrayBuffer()).forEach((c,i)=>{gAddCanvas(c,nm+(i?` (${i+1})`:''));n++})}
      else if((f.type||'').startsWith('image/')||['jpg','jpeg','png','webp','gif','bmp'].includes(ext)){gAddCanvas(await fileToImage(f),nm||'Resim');n++}
      else toast(`${f.name}: Görsel alanına yalnızca resim ve PDF eklenebilir.`);
    }catch(e){console.error(e);toast(`${f.name} eklenemedi: ${e.message||e}`,6000)}}
  busy(false);if(n){gCommit(before);gTool('move');gChanged(true)}
}
function gResScale(ls,box){let s=1;for(const l of ls)if(l.type==='image'&&l.visible)s=Math.max(s,l.sw/l.w,l.sh/l.h);s=Math.min(s,4);return Math.max(0.05,Math.min(s,6000/Math.max(box.w,box.h)))}
function gRaster(ls,box,scale){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(box.w*scale));c.height=Math.max(1,Math.round(box.h*scale));const x=c.getContext('2d');x.scale(scale,scale);x.translate(-box.x,-box.y);ls.forEach(l=>drawLayer(x,l));return c}
function gMerge(ls,name,box){box=box||unionBox(ls.filter(l=>l.visible).length?ls.filter(l=>l.visible):ls);const c=gRaster(ls,box,gResScale(ls,box));return gNewImage(c,name,{x:box.x,y:box.y,w:box.w,h:box.h})}
function gRasterizeInPlace(l){const i=G.layers.indexOf(l);const m=gMerge([Object.assign({},l,{visible:true})],l.name,aabb(l));G.layers[i]=m;if(G.sel===l.id)G.sel=m.id;return m}
function gEraseRect(l,b){const c=document.createElement('canvas');c.width=l.src.width;c.height=l.src.height;const x=c.getContext('2d');x.drawImage(l.src,0,0);
  const M=lMat(l).translate(-l.w/2,-l.h/2).scale(l.w/l.sw,l.h/l.sh).translate(-l.sx,-l.sy);x.setTransform(M.inverse());x.clearRect(b.x,b.y,b.w,b.h);l.src=c}
function gCropLayer(l,b){const inv=nfMat(l).inverse();const pts=[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]].map(([x,y])=>tp(inv,x,y));
  const x0=Math.max(-l.w/2,Math.min(...pts.map(q=>q[0]))),x1=Math.min(l.w/2,Math.max(...pts.map(q=>q[0]))),y0=Math.max(-l.h/2,Math.min(...pts.map(q=>q[1]))),y1=Math.min(l.h/2,Math.max(...pts.map(q=>q[1])));
  if(x1-x0<2||y1-y0<2)return false;
  const u0=l.flipX?-x1:x0,u1=l.flipX?-x0:x1,v0=l.flipY?-y1:y0,v1=l.flipY?-y0:y1;
  const nsx=l.sx+(u0+l.w/2)/l.w*l.sw,nsw=(u1-u0)/l.w*l.sw,nsy=l.sy+(v0+l.h/2)/l.h*l.sh,nsh=(v1-v0)/l.h*l.sh;
  const [cx,cy]=tp(nfMat(l),(x0+x1)/2,(y0+y1)/2);l.sx=nsx;l.sy=nsy;l.sw=nsw;l.sh=nsh;l.w=x1-x0;l.h=y1-y0;l.x=cx-l.w/2;l.y=cy-l.h/2;return true}
function gClampBox(b){if(!b)return null;const x=Math.max(0,b.x),y=Math.max(0,b.y),x2=Math.min(G.W,b.x+b.w),y2=Math.min(G.H,b.y+b.h);if(x2-x<2||y2-y<2){toast('Seçilen alan tuvalin dışında.');return null}return{x,y,w:x2-x,h:y2-y}}
function gCanvasSize(w,h){w=Math.round(Math.max(8,Math.min(8000,w)));h=Math.round(Math.max(8,Math.min(8000,h)));const dx=(w-G.W)/2,dy=(h-G.H)/2;G.layers.forEach(l=>{l.x+=dx;l.y+=dy});G.W=w;G.H=h;G.fitted=false}
function gCrop(b){
  const before=gSnap();
  if(G.cropTarget){let l=gL(G.cropTarget);G.cropTarget=null;if(!l){gTool('move');return}if(l.type!=='image')l=gRasterizeInPlace(l);
    if(!gCropLayer(l,b)){gRestore(before);toast('Çizdiğiniz alan resmin dışında kaldı.');gTool('move');return}
    G.sel=l.id;gCommit(before);gTool('move');gChanged(true);toast('Resim kırpıldı.');return}
  const c=gClampBox(b);if(!c)return;const x=Math.round(c.x),y=Math.round(c.y);G.layers.forEach(l=>{l.x-=x;l.y-=y});G.W=Math.round(c.w);G.H=Math.round(c.h);G.mq=null;G.fitted=false;
  gCommit(before);gTool('move');gChanged(true);toast('Tuval kırpıldı. Geri almak için Ctrl+Z.');
}
function gSelCopy(cut){const b=gClampBox(G.mq);if(!b)return;const s=gSelL();
  if(cut&&!s){toast('Kesmek için önce sağdaki listeden bir katman seçin.');return}
  const src=s?[s]:G.layers.filter(l=>l.visible);if(!src.length){toast('Seçili alanda bir şey yok.');return}
  const before=gSnap();const c=gRaster(src.map(l=>Object.assign({},l,{visible:true})),b,gResScale(src,b));
  if(gEmpty(c)){toast('Seçili alan boş.');return}
  const nl=gNewImage(c,cut?'Kesilen parça':'Kopyalanan parça',{x:b.x,y:b.y,w:b.w,h:b.h});
  let ref=s;if(cut){ref=s.type==='image'?s:gRasterizeInPlace(s);gEraseRect(ref,b)}
  const i=ref?G.layers.indexOf(ref)+1:G.layers.length;G.layers.splice(i,0,nl);G.sel=nl.id;G.mq=null;
  gCommit(before);gTool('move');gChanged(true);toast(cut?'Seçili alan kesildi ve ayrı katman oldu. Artık taşıyabilirsiniz.':'Seçili alan yeni katmana kopyalandı.',5000)}
function gEmpty(c){try{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<d.length;i+=16)if(d[i])return false;return true}catch(e){return false}}
function whiteToAlpha(src){const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const x=c.getContext('2d');x.drawImage(src,0,0);const d=x.getImageData(0,0,c.width,c.height),a=d.data;
  for(let i=0;i<a.length;i+=4){const m=Math.min(a[i],a[i+1],a[i+2]);if(m>235)a[i+3]=0;else if(m>200)a[i+3]=Math.round(a[i+3]*(235-m)/35)}x.putImageData(d,0,0);return c}

/* UI */
function gSelect(id){G.sel=id;gChanged(true)}
const GHINTS={move:'Taşı: katmana tıklayıp sürükleyin. Köşelerden boyutlandırın (Shift: oran serbest), üstteki yuvarlaktan döndürün. Boşluk tuşu basılıyken sürükleyerek tuvali kaydırın.',
  marquee:'Alan seç: bir alan çizin, sonra üstteki düğmelerle kesip ayırın, kopyalayın, silin ya da tuvali o alana kırpın.',
  crop:'Kırp: tuvalde bırakmak istediğiniz alanı çizin; dışı atılır.',cropL:'Resmi kırp: seçili resimde bırakmak istediğiniz alanı çizin.',
  text:'Yazı: eklemek istediğiniz yere tıklayın; yazıyı sağdaki kutudan değiştirin.',rect:'Dikdörtgen: sürükleyerek çizin (Shift: kare).',ellipse:'Elips: sürükleyerek çizin (Shift: daire).'};
function gTool(t,keep){G.tool=t;if(!keep)G.cropTarget=null;$$('[data-gtool]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.gtool===t));
  $('#gHint').textContent=GHINTS[t==='crop'&&G.cropTarget?'cropL':t]||'';if(t!=='marquee'){G.mq=null;gSelOpsUI()}gcv.style.cursor=t==='move'?'default':t==='text'?'text':'crosshair';gDraw()}
function gSelOpsUI(){const on=!!G.mq;$('#gSelOps').hidden=!on;$('#gSelSep').hidden=!on}
function gChanged(full){gLayersUI();if(full)gProps();else gSyncProps();$('#gEmpty').hidden=G.layers.length>0;$('#gStat').textContent=`${G.W} × ${G.H} px · ${G.layers.length} katman`;gSelOpsUI();gDraw()}
function gLayersUI(){
  const box=$('#gLayers');box.innerHTML='';
  if(!G.layers.length)box.innerHTML='<div class="muted">Henüz katman yok.</div>';
  [...G.layers].reverse().forEach(l=>{const r=el('div','glr'+(l.id===G.sel?' on':''));
    r.innerHTML=`<button class="ib eye" title="${l.visible?'Gizle':'Göster'}" aria-label="${l.visible?'Gizle':'Göster'}">${ic(l.visible?'eye':'eyeoff')}</button><canvas width="88" height="64"></canvas><span class="nm">${esc(l.name)}</span>`;
    const x=r.querySelector('canvas').getContext('2d');const b=aabb(l);const s=Math.min(88/b.w,64/b.h);x.translate((88-b.w*s)/2,(64-b.h*s)/2);x.scale(s,s);x.translate(-b.x,-b.y);drawLayer(x,Object.assign({},l,{visible:true}));
    r.onclick=e=>{if(e.target.closest('.eye')){gOp(()=>{l.visible=!l.visible});return}if(G.sel!==l.id)gSelect(l.id)};box.append(r)});
  const s=gSelL(),i=s?G.layers.indexOf(s):-1;
  $('#gUp').disabled=!s||i===G.layers.length-1;$('#gDown').disabled=!s||i<=0;$('#gDup').disabled=!s;$('#gDel').disabled=!s;$('#gMergeDown').disabled=!s||i<=0;$('#gFlatten').disabled=G.layers.length<2;
}
function bindIn(id,fn){const e=$('#'+id);if(!e)return;const start=()=>{if(!gPending)gPending=gSnap()};
  e.addEventListener('focus',start);e.addEventListener('pointerdown',start);
  e.addEventListener('input',()=>{start();fn(e);gDraw();gSyncProps()});
  e.addEventListener('change',()=>{if(gPending){gCommit(gPending);gPending=null}gLayersUI();$('#gStat').textContent=`${G.W} × ${G.H} px · ${G.layers.length} katman`})}
function gSyncProps(){const l=gSelL();if(!l)return;const set=(id,v)=>{const e=$('#'+id);if(e&&document.activeElement!==e)e.value=v};
  set('gpX',Math.round(l.x));set('gpY',Math.round(l.y));set('gpWw',Math.round(l.w));set('gpHh',Math.round(l.h));set('gpR',Math.round((l.rot||0)*10)/10);set('gpO',Math.round((l.opacity==null?1:l.opacity)*100));if(l.type==='text')set('gpS',Math.round(l.size))}
function gProps(){
  const P=$('#gProps');const l=gSelL();let h='';
  if(!l){h=`<div class="gh">Tuval</div>
    <label class="fld">Hazır boyut<select id="gpPre">${PRESETS.map((p,i)=>`<option value="${i}">${p[0]}</option>`).join('')}</select></label>
    <div class="pgrid"><label class="fld">Genişlik (px)<input type="number" id="gpW" min="8" max="8000" value="${G.W}"></label><label class="fld">Yükseklik (px)<input type="number" id="gpH" min="8" max="8000" value="${G.H}"></label>
    <label class="fld">Arka plan<input type="color" id="gpBg" value="${G.bg||'#ffffff'}"></label><label class="chk"><input type="checkbox" id="gpTr" ${G.bg?'':'checked'}> Saydam</label></div>
    <div class="muted">Bir katmanı düzenlemek için tuvalde üzerine ya da listede adına tıklayın.</div>`}
  else{h=`<div class="gh">${esc(l.name)}</div>
    <div class="pgrid"><label class="fld">X<input type="number" id="gpX"></label><label class="fld">Y<input type="number" id="gpY"></label>
    <label class="fld">Genişlik<input type="number" id="gpWw" min="1"></label><label class="fld">Yükseklik<input type="number" id="gpHh" min="1"></label>
    <label class="fld">Açı (°)<input type="number" id="gpR" min="-180" max="180" step="1"></label><label class="fld">Opaklık %<input type="number" id="gpO" min="0" max="100"></label></div>
    <div class="row2"><button class="btn sm" id="gpFx">${ic('flipH')}Yatay çevir</button><button class="btn sm" id="gpFy">${ic('flipV')}Dikey çevir</button></div>`;
    if(l.type==='image')h+=`<div class="gh">Resim</div>
      <label class="fld">Parlaklık<input type="range" id="gpBr" min="-100" max="100" value="${l.bright||0}"></label>
      <label class="fld">Kontrast<input type="range" id="gpCt" min="-100" max="100" value="${l.contrast||0}"></label>
      <label class="chk"><input type="checkbox" id="gpGr" ${l.gray?'checked':''}> Siyah-beyaz</label>
      <div class="row2"><button class="btn sm" id="gpCropL">${ic('crop')}Bu resmi kırp</button><button class="btn sm" id="gpWh">Beyazı saydam yap</button><button class="btn sm" id="gpNat">Gerçek boyut</button><button class="btn sm" id="gpRst">Ayarları sıfırla</button></div>`;
    if(l.type==='text')h+=`<div class="gh">Yazı</div><textarea id="gpText" rows="3" aria-label="Yazı">${esc(l.text)}</textarea>
      <div class="pgrid"><label class="fld">Yazı tipi<select id="gpF">${Object.keys(FONTS).map(f=>`<option${f===l.font?' selected':''}>${f}</option>`).join('')}</select></label><label class="fld">Boyut (px)<input type="number" id="gpS" min="4" max="1000"></label>
      <label class="fld">Renk<input type="color" id="gpC" value="${l.color}"></label><label class="fld">Hizalama<select id="gpA"><option value="left">Sola</option><option value="center">Ortaya</option><option value="right">Sağa</option></select></label></div>
      <div class="row2"><button class="ib" id="gpB" aria-pressed="${!!l.bold}" title="Kalın"><b>K</b></button><button class="ib" id="gpI" aria-pressed="${!!l.italic}" title="Eğik"><i>T</i></button><button class="ib" id="gpU" aria-pressed="${!!l.underline}" title="Altı çizili"><u>A</u></button></div>`;
    if(l.type==='shape')h+=`<div class="gh">Şekil</div><div class="pgrid"><label class="fld">Dolgu<input type="color" id="gpFill" value="${l.fill||'#3a3db0'}"></label><label class="chk"><input type="checkbox" id="gpNoFill" ${l.fill?'':'checked'}> Dolgu yok</label>
      <label class="fld">Kenar rengi<input type="color" id="gpSt" value="${l.stroke||'#111111'}"></label><label class="fld">Kenar kalınlığı<input type="number" id="gpSw" min="0" max="200" value="${l.sw||0}"></label></div>`;
    h+=`<div class="row2"><button class="btn sm" id="gpExp">Bu katmanı PNG kaydet</button></div>`}
  P.innerHTML=h;gWire();gSyncProps();
}
function gWire(){
  const l=gSelL();const num=e=>{const v=parseFloat(e.value);return isFinite(v)?v:null};
  if(!l){const pi=PRESETS.findIndex(p=>p[1]===G.W&&p[2]===G.H);$('#gpPre').value=String(Math.max(0,pi));
    $('#gpPre').onchange=e=>{const p=PRESETS[+e.target.value];if(p[1])gOp(()=>gCanvasSize(p[1],p[2]))};
    $('#gpW').onchange=e=>{const v=num(e.target);if(v)gOp(()=>gCanvasSize(v,G.H))};$('#gpH').onchange=e=>{const v=num(e.target);if(v)gOp(()=>gCanvasSize(G.W,v))};
    bindIn('gpBg',e=>{G.bg=e.value;$('#gpTr').checked=false});$('#gpTr').onchange=e=>gOp(()=>{G.bg=e.target.checked?null:$('#gpBg').value});return}
  bindIn('gpX',e=>{const v=num(e);if(v!=null)l.x=v});bindIn('gpY',e=>{const v=num(e);if(v!=null)l.y=v});
  const keepC=f=>{const cx=l.x+l.w/2,cy=l.y+l.h/2;f();l.x=cx-l.w/2;l.y=cy-l.h/2};
  bindIn('gpWw',e=>{const v=num(e);if(!v||v<1)return;keepC(()=>{if(l.type==='text'){l.size*=v/l.w;gMeasure(l)}else{if(l.type==='image')l.h*=v/l.w;l.w=v}})});
  bindIn('gpHh',e=>{const v=num(e);if(!v||v<1)return;keepC(()=>{if(l.type==='text'){l.size*=v/l.h;gMeasure(l)}else{if(l.type==='image')l.w*=v/l.h;l.h=v}})});
  bindIn('gpR',e=>{const v=num(e);if(v!=null)l.rot=v});bindIn('gpO',e=>{const v=num(e);if(v!=null)l.opacity=Math.max(0,Math.min(100,v))/100});
  $('#gpFx').onclick=()=>gOp(()=>{l.flipX=!l.flipX});$('#gpFy').onclick=()=>gOp(()=>{l.flipY=!l.flipY});
  $('#gpExp').onclick=gExportLayer;
  if(l.type==='image'){bindIn('gpBr',e=>{l.bright=+e.value});bindIn('gpCt',e=>{l.contrast=+e.value});$('#gpGr').onchange=e=>gOp(()=>{l.gray=e.target.checked});
    $('#gpCropL').onclick=()=>{G.cropTarget=l.id;gTool('crop',true)};
    $('#gpWh').onclick=()=>{busy('İşleniyor…');setTimeout(()=>{gOp(()=>{l.src=whiteToAlpha(l.src)});busy(false);toast('Beyaz alanlar saydam yapıldı.')},30)};
    $('#gpNat').onclick=()=>gOp(()=>keepC(()=>{l.w=l.sw;l.h=l.sh}));$('#gpRst').onclick=()=>gOp(()=>{l.bright=0;l.contrast=0;l.gray=false})}
  if(l.type==='text'){bindIn('gpText',e=>{l.text=e.value;gMeasure(l);l.name=(l.text.split('\n')[0]||'Yazı').slice(0,28)||'Yazı'});
    $('#gpF').onchange=e=>gOp(()=>{keepC(()=>{l.font=e.target.value;gMeasure(l)})});bindIn('gpS',e=>{const v=num(e);if(v&&v>=2)keepC(()=>{l.size=v;gMeasure(l)})});bindIn('gpC',e=>{l.color=e.value});
    $('#gpA').value=l.align||'left';$('#gpA').onchange=e=>gOp(()=>{l.align=e.target.value});
    [['gpB','bold'],['gpI','italic'],['gpU','underline']].forEach(([id,k])=>{$('#'+id).onclick=()=>gOp(()=>keepC(()=>{l[k]=!l[k];gMeasure(l)}))})}
  if(l.type==='shape'){bindIn('gpFill',e=>{l.fill=e.value;$('#gpNoFill').checked=false});$('#gpNoFill').onchange=e=>gOp(()=>{l.fill=e.target.checked?null:$('#gpFill').value});
    bindIn('gpSt',e=>{l.stroke=e.value;if(!l.sw){l.sw=4;$('#gpSw').value=4}});bindIn('gpSw',e=>{const v=num(e);if(v!=null)l.sw=Math.max(0,v)})}
}

/* pointer */
function gPt(e){const r=gcv.getBoundingClientRect();const sx=e.clientX-r.left,sy=e.clientY-r.top;return{sx,sy,ax:(sx-G.ox)/G.z,ay:(sy-G.oy)/G.z}}
function gHitHandle(sx,sy){const s=gSelL();if(!s||G.tool!=='move')return null;const H=gHandles(s);if(Math.hypot(sx-H.rot.x,sy-H.rot.y)<10)return{k:'rot'};
  for(const h of H.cs)if(Math.abs(sx-h.x)<9&&Math.abs(sy-h.y)<9)return{k:'size',sx:h.sx,sy:h.sy};return null}
function gPick(ax,ay){const tol=3/G.z;for(let i=G.layers.length-1;i>=0;i--){const l=G.layers[i];if(!l.visible)continue;const [x,y]=tp(nfMat(l).inverse(),ax,ay);if(Math.abs(x)<=l.w/2+tol&&Math.abs(y)<=l.h/2+tol)return l}return null}
function gSnapEdges(l){if(l.rot)return;const t=7/G.z;for(const c of [0,(G.W-l.w)/2,G.W-l.w])if(Math.abs(l.x-c)<t){l.x=c;break}for(const c of [0,(G.H-l.h)/2,G.H-l.h])if(Math.abs(l.y-c)<t){l.y=c;break}}
function gResize(d,ax,ay,shift){const s=d.st,l=d.l;const [lx,ly]=tp(nfMat(s).inverse(),ax,ay);const ox=-d.sx*s.w/2,oy=-d.sy*s.h/2;
  let nw=Math.max(4,(lx-ox)*d.sx),nh=Math.max(4,(ly-oy)*d.sy);const keep=l.type==='text'||(l.type==='image'?!shift:shift);
  if(keep){const k=Math.max(nw/s.w,nh/s.h);nw=s.w*k;nh=s.h*k}
  const [cx,cy]=tp(nfMat(s),ox+d.sx*nw/2,oy+d.sy*nh/2);
  if(l.type==='text'){l.size=Math.max(4,s.size*nh/s.h);gMeasure(l)}else{l.w=nw;l.h=nh}l.x=cx-l.w/2;l.y=cy-l.h/2}
function gCursor(p){let c='default';const t=G.tool;if(G.space)c='grab';else if(t==='move'){const h=gHitHandle(p.sx,p.sy);if(h)c=h.k==='rot'?'grab':(h.sx*h.sy>0?'nwse-resize':'nesw-resize');else if(gPick(p.ax,p.ay))c='move'}else if(t==='text')c='text';else c='crosshair';gcv.style.cursor=c}
gcv.addEventListener('pointerdown',e=>{
  const p=gPt(e);if(document.activeElement&&document.activeElement!==document.body&&$('#gProps').contains(document.activeElement))document.activeElement.blur();
  if(e.button===1||(e.button===0&&G.space)){e.preventDefault();gcv.setPointerCapture(e.pointerId);G.drag={k:'pan',sx:p.sx,sy:p.sy,ox:G.ox,oy:G.oy};return}
  if(e.button!==0)return;e.preventDefault();gcv.setPointerCapture(e.pointerId);const t=G.tool;
  if(t==='move'){const h=gHitHandle(p.sx,p.sy),s=gSelL();
    if(h&&s){G.drag={k:h.k,sx:h.sx,sy:h.sy,st:Object.assign({},s),before:gSnap(),l:s,moved:false};return}
    const l=gPick(p.ax,p.ay);if((l?l.id:null)!==G.sel)gSelect(l?l.id:null);if(l)G.drag={k:'move',ax:p.ax,ay:p.ay,st:Object.assign({},l),before:gSnap(),l,moved:false};return}
  if(t==='text'){const before=gSnap();const l=gNewText(p.ax,p.ay);G.sel=l.id;gCommit(before);gTool('move');gChanged(true);setTimeout(()=>{const ta=$('#gpText');if(ta){ta.focus();ta.select()}},30);return}
  if(t==='marquee'){G.mq=null;gSelOpsUI()}
  G.drag={k:'box',x0:p.ax,y0:p.ay,box:{x:p.ax,y:p.ay,w:0,h:0}};gDraw();
});
gcv.addEventListener('pointermove',e=>{const p=gPt(e),d=G.drag;
  if(!d){gCursor(p);return}
  if(d.k==='pan'){G.ox=d.ox+p.sx-d.sx;G.oy=d.oy+p.sy-d.sy;G.autoFit=false;gDraw();return}
  if(d.k==='move'){let dx=p.ax-d.ax,dy=p.ay-d.ay;if(!d.moved&&Math.hypot(dx,dy)*G.z<3)return;d.moved=true;if(e.shiftKey){if(Math.abs(dx)>Math.abs(dy))dy=0;else dx=0}d.l.x=d.st.x+dx;d.l.y=d.st.y+dy;gSnapEdges(d.l);gDraw();gSyncProps();return}
  if(d.k==='size'){d.moved=true;gResize(d,p.ax,p.ay,e.shiftKey);gDraw();gSyncProps();return}
  if(d.k==='rot'){d.moved=true;const s=d.st,cx=s.x+s.w/2,cy=s.y+s.h/2;let a=Math.atan2(p.ay-cy,p.ax-cx)*180/Math.PI+90;
    if(e.shiftKey)a=Math.round(a/15)*15;else{const r=Math.round(a/90)*90;if(Math.abs(a-r)<3)a=r}a=((a%360)+360)%360;if(a>180)a-=360;d.l.rot=Math.round(a*10)/10;gDraw();gSyncProps();return}
  if(d.k==='box'){let x1=p.ax,y1=p.ay;if(e.shiftKey&&(G.tool==='rect'||G.tool==='ellipse')){const s=Math.max(Math.abs(x1-d.x0),Math.abs(y1-d.y0));x1=d.x0+(x1<d.x0?-s:s);y1=d.y0+(y1<d.y0?-s:s)}
    d.box={x:Math.min(d.x0,x1),y:Math.min(d.y0,y1),w:Math.abs(x1-d.x0),h:Math.abs(y1-d.y0)};gDraw()}
});
function gUp(){const d=G.drag;G.drag=null;if(!d)return;
  if(d.k==='move'||d.k==='size'||d.k==='rot'){if(d.moved){gCommit(d.before);gChanged(false)}gDraw();return}
  if(d.k==='box'){const b=d.box,big=b.w*G.z>4&&b.h*G.z>4,t=G.tool;
    if(t==='marquee'){G.mq=big?b:null;gSelOpsUI();gDraw();return}
    if(!big){gDraw();return}
    if(t==='crop'){gCrop(b);return}
    if(t==='rect'||t==='ellipse'){const before=gSnap();const l=gNewShape(t,b);G.sel=l.id;gCommit(before);gTool('move');gChanged(true);return}}
  gDraw()}
gcv.addEventListener('pointerup',gUp);gcv.addEventListener('pointercancel',gUp);
gcv.addEventListener('dblclick',e=>{if(G.tool!=='move')return;const s=gSelL();if(s&&s.type==='text'){const ta=$('#gpText');if(ta){ta.focus();ta.select()}}});
gcv.addEventListener('wheel',e=>{e.preventDefault();const p=gPt(e);if(e.ctrlKey||e.metaKey)gZoomAt(G.z*(e.deltaY<0?1.1:1/1.1),p.sx,p.sy);else{G.ox-=e.deltaX;G.oy-=e.deltaY;G.autoFit=false;gDraw()}},{passive:false});
if(window.ResizeObserver)new ResizeObserver(()=>{if(G.autoFit)G.fitted=false;gDraw()}).observe($('#gstage'));

/* export */
function gFinal(type){const c=document.createElement('canvas');c.width=G.W;c.height=G.H;const x=c.getContext('2d');if(G.bg||type!=='png'){x.fillStyle=G.bg||'#ffffff';x.fillRect(0,0,G.W,G.H)}G.layers.forEach(l=>drawLayer(x,l));return c}
const gName=()=>{const f=G.layers.find(l=>l.type==='image');return((f?f.name:'gorsel')+'-duzenlendi').replace(/[\\/:*?"<>|]+/g,'-')};
async function gExport(type){if(!G.layers.length){toast('Önce bir resim ekleyin.');return}busy('Görsel hazırlanıyor…');
  try{const c=gFinal(type);
    if(type==='pdf'){if(!window.PDFLib)throw new Error('PDF aracı yüklenemedi');const out=await PDFLib.PDFDocument.create();const img=G.bg?await out.embedJpg(await canvasBytes(c,'image/jpeg',0.92)):await out.embedPng(await canvasBytes(c,'image/png'));
      const w=G.W*0.75,h=G.H*0.75;out.addPage([w,h]).drawImage(img,{x:0,y:0,width:w,height:h});const b=await out.save();busy(false);await saveFile(gName()+'.pdf',new Blob([b],{type:'application/pdf'}));return}
    const b=await canvasBlob(c,type==='png'?'image/png':'image/jpeg',0.92);busy(false);await saveFile(gName()+'.'+type,b)}
  catch(e){toast('Kaydedilemedi: '+(e.message||e))}finally{busy(false)}}
async function gExportLayer(){const s=gSelL();if(!s)return;const b=aabb(s);const c=gRaster([Object.assign({},s,{visible:true})],b,gResScale([s],b));await saveFile(s.name.replace(/[\\/:*?"<>|]+/g,'-')+'.png',await canvasBlob(c,'image/png'))}

/* toolbar & keys */
$$('[data-gtool]').forEach(b=>b.onclick=()=>gTool(b.dataset.gtool));
$('#gUndo').onclick=gUndo;$('#gRedo').onclick=gRedo;
$('#gZin').onclick=()=>gZoomAt(G.z*1.2,gcv.clientWidth/2,gcv.clientHeight/2);$('#gZout').onclick=()=>gZoomAt(G.z/1.2,gcv.clientWidth/2,gcv.clientHeight/2);$('#gZfit').onclick=()=>{gFit();gDraw()};
['#gImg','#gImg2'].forEach(q=>$(q).onchange=e=>{const fs=[...e.target.files];e.target.value='';if(fs.length)gAddFiles(fs)});
$('#gCutSel').onclick=()=>gSelCopy(true);$('#gCopySel').onclick=()=>gSelCopy(false);
$('#gEraseSel').onclick=()=>{const s=gSelL();if(!s){toast('Silmek için önce sağdaki listeden bir katman seçin.');return}const b=gClampBox(G.mq);if(!b)return;gOp(()=>{const l=s.type==='image'?s:gRasterizeInPlace(s);gEraseRect(l,b)})};
$('#gCropSel').onclick=()=>{const b=G.mq;G.cropTarget=null;if(b)gCrop(b)};
$('#gUp').onclick=()=>gOp(()=>{const s=gSelL(),i=G.layers.indexOf(s);if(!s||i>=G.layers.length-1)return false;G.layers.splice(i,1);G.layers.splice(i+1,0,s)});
$('#gDown').onclick=()=>gOp(()=>{const s=gSelL(),i=G.layers.indexOf(s);if(!s||i<=0)return false;G.layers.splice(i,1);G.layers.splice(i-1,0,s)});
$('#gDup').onclick=()=>gOp(()=>{const s=gSelL();if(!s)return false;const c=Object.assign({},s,{id:'g'+(gN++),name:s.name+' kopya',x:s.x+20,y:s.y+20});G.layers.splice(G.layers.indexOf(s)+1,0,c);G.sel=c.id});
function gDelete(){gOp(()=>{const s=gSelL();if(!s)return false;G.layers=G.layers.filter(l=>l!==s);G.sel=null})}
$('#gDel').onclick=gDelete;
$('#gMergeDown').onclick=()=>gOp(()=>{const s=gSelL(),i=G.layers.indexOf(s);if(i<=0)return false;const m=gMerge([G.layers[i-1],s],'Birleşik katman');G.layers.splice(i-1,2,m);G.sel=m.id});
$('#gFlatten').onclick=()=>gOp(()=>{const vis=G.layers.filter(l=>l.visible);if(vis.length<1)return false;const m=gMerge(vis,'Birleşik görsel',{x:0,y:0,w:G.W,h:G.H});const i=G.layers.indexOf(vis[0]);G.layers=G.layers.filter(l=>!vis.includes(l));G.layers.splice(Math.min(i,G.layers.length),0,m);G.sel=m.id});
document.addEventListener('keydown',e=>{
  if($('#studio').hidden||!$('#sigModal').hidden)return;const t=e.target;if(t.isContentEditable||/INPUT|SELECT|TEXTAREA/.test(t.tagName))return;
  const k=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;
  if(e.key===' '){e.preventDefault();if(!G.space){G.space=true;gcv.style.cursor='grab'}return}
  if(mod&&k==='z'){e.preventDefault();e.shiftKey?gRedo():gUndo();return}
  if(mod&&k==='y'){e.preventDefault();gRedo();return}
  if(mod&&k==='j'){e.preventDefault();$('#gDup').click();return}
  if(mod&&k==='d'){e.preventDefault();G.mq=null;gSelect(null);return}
  if(mod&&k==='0'){e.preventDefault();gFit();gDraw();return}
  if(mod&&(k==='+'||k==='=')){e.preventDefault();$('#gZin').click();return}
  if(mod&&k==='-'){e.preventDefault();$('#gZout').click();return}
  if(e.key==='Delete'||e.key==='Backspace'){if(gSelL()){e.preventDefault();gDelete()}return}
  if(e.key==='Escape'){if(G.mq){G.mq=null;gSelOpsUI();gDraw()}else if(G.tool!=='move')gTool('move');else if(G.sel)gSelect(null);return}
  const s=gSelL();
  if(s&&e.key.startsWith('Arrow')){e.preventDefault();const st=e.shiftKey?10:1;if(!G.nudge)G.nudge=gSnap();
    if(e.key==='ArrowLeft')s.x-=st;if(e.key==='ArrowRight')s.x+=st;if(e.key==='ArrowUp')s.y-=st;if(e.key==='ArrowDown')s.y+=st;
    clearTimeout(G.nt);G.nt=setTimeout(()=>{gCommit(G.nudge);G.nudge=null;gChanged(false)},500);gDraw();gSyncProps();return}
  if(mod||e.altKey)return;const m={v:'move',m:'marquee',c:'crop',t:'text',r:'rect',e:'ellipse'};if(m[k])gTool(m[k]);
});
document.addEventListener('keyup',e=>{if(e.key===' '&&G.space){G.space=false;gcv.style.cursor=''}});
document.addEventListener('paste',e=>{if($('#studio').hidden)return;const t=e.target;if(t&&(t.isContentEditable||/INPUT|TEXTAREA/.test(t.tagName)))return;
  const fs=[...(e.clipboardData&&e.clipboardData.files||[])].filter(f=>(f.type||'').startsWith('image/'));if(fs.length){e.preventDefault();gAddFiles(fs.map((f,i)=>new File([f],f.name&&f.name!=='image.png'?f.name:`Yapıştırılan ${i+1}.png`,{type:f.type})))}});
gTool('move');gChanged(true);gUpdUndo();

/* ---------- resim düzenleyici (sayfa üstü pencere) ---------- */
let STU={pageId:null};
async function openStudio(p){
  flushEdit();wDesel();
  if(p&&p.kind==='text'){toast('Yazı sayfaları resim düzenleyicide açılmaz; yazıyı doğrudan sayfada düzenleyin.',5000);return}
  STU={pageId:p?p.id:null};
  G.layers=[];G.sel=null;G.mq=null;G.undo=[];G.redo=[];G.cropTarget=null;G.drag=null;
  if(p&&p.comp){G.W=p.comp.W;G.H=p.comp.H;G.bg=p.comp.bg;G.layers=p.comp.layers.map(l=>Object.assign({},l))}
  else if(p){busy('Resim hazırlanıyor…');try{const c=await composite(p,pageScale(p));G.bg='#ffffff';G.W=c.width;G.H=c.height;const l=gNewImage(c,(p.name||'Sayfa').replace(/\.[^.]+$/,''),{x:0,y:0,w:c.width,h:c.height});G.layers.push(l);G.sel=l.id}
    catch(e){busy(false);toast('Açılamadı: '+(e.message||e));return}busy(false)}
  else{G.W=1240;G.H=1754;G.bg='#ffffff'}
  G.fitted=false;G.autoFit=true;$('#studio').hidden=false;
  $('#stTitle').textContent=p?`Sayfa ${S.pages.indexOf(p)+1} – resim düzenleyici`:'Yeni görsel';$('#stApply').textContent=p?'Sayfaya uygula':'Belgeye ekle';
  gTool('move');gChanged(true);gUpdUndo();
  if(p&&p.kind==='pdf'&&!p.comp)toast('Not: uygulayınca bu sayfa resme dönüşür; yazıları artık seçilemez.',6000);
}
function closeStudio(apply){
  if(apply){const old=STU.pageId?pool.get(STU.pageId):null;
    if(!G.layers.length){toast('Görsel boş. Önce resim ekleyin ya da Vazgeç’e basın.');return}
    const c=gFinal('jpg');if(!old)clearSample();pushUndo();
    const np=imgPage(c,old?old.name:'Görsel');np.comp=gSnap();np.comp.sel=null;pool.set(np.id,np);
    let at;if(old&&S.pages.includes(old)){at=S.pages.indexOf(old);S.pages[at]=np}else{at=S.pages.length?Math.min(S.cur+1,S.pages.length):0;S.pages.splice(at,0,np)}
    $('#studio').hidden=true;buildViewer();if(S.pages.length===1)fitWidth();scrollToPage(at,false);toast(old?'Değişiklikler sayfaya uygulandı.':'Görsel belgeye yeni sayfa olarak eklendi.')}
  else $('#studio').hidden=true;
  G.layers=[];G.sel=null;
}
$('#stApply').onclick=()=>closeStudio(true);$('#stCancel').onclick=()=>closeStudio(false);

