/* ---------- viewer ---------- */
let io=null,tio=null,zt=0;
function el(tag,cls){const e=document.createElement(tag);if(cls)e.className=cls;return e}
function pageHeadHTML(p,i){const T=p.kind==='text';
  const tools=T?[['up','Yukarı taşı','up'],['down','Aşağı taşı','dn'],['trash','Sayfayı sil','del']]:
    [...(p.objMode?[['undo','Orijinal görünüme döndür (nesneleri birleştir)','orig']]:[]),...(p.clip?[['uncrop','Kırpmayı kaldır','uc']]:[]),['layers','Resim olarak düzenle','toG'],['rotl','Sola döndür','rl'],['rotr','Sağa döndür','rr'],['up','Yukarı taşı','up'],['down','Aşağı taşı','dn'],['trash','Sayfayı sil','del']];
  return `<span class="pgnum">Sayfa ${i+1}<span class="pgname">${T?'Yazı · ':p.objMode?'Nesneler · ':''}${esc(p.name)}</span></span><span class="pgtools">`+
    tools.map(([ico,t,a])=>`<button class="ib" data-act="${a}" title="${t}" aria-label="${t}">${ic(ico)}</button>`).join('')+'</span>'}
function buildViewer(){
  wDesel();S.pages.forEach(syncText);
  const list=$('#pagesList');list.innerHTML='';visible.clear();if(io)io.disconnect();
  for(const k in E)delete E[k];
  if(S.txt&&!document.contains(S.txt)){S.txt=null;if(S.ctx==='txt')S.ctx=null}
  io=new IntersectionObserver(ents=>{for(const en of ents){const id=en.target.dataset.pid;if(en.isIntersecting){visible.add(id);const p=pool.get(id);if(p&&E[id]&&E[id].rk!==S.k)renderBase(p)}else visible.delete(id)}},{root:$('#viewer'),rootMargin:'900px 0px'});
  $('#sampleNote').hidden=!S.pages.some(p=>p.sample);
  $('#emptyNote').hidden=S.pages.length>0;
  S.pages.forEach((p,i)=>{
    const T=p.kind==='text';
    const wrap=el('div','pgwrap'),head=el('div','pghead');
    head.innerHTML=pageHeadHTML(p,i);
    const _unused=T?[['up','Yukarı taşı','up'],['down','Aşağı taşı','dn'],['trash','Sayfayı sil','del']]:
      [...(p.objMode?[['undo','Orijinal görünüme döndür (nesneleri birleştir)','orig']]:[]),...(p.clip?[['uncrop','Kırpmayı kaldır','uc']]:[]),['layers','Resim olarak düzenle','toG'],['rotl','Sola döndür','rl'],['rotr','Sağa döndür','rr'],['up','Yukarı taşı','up'],['down','Aşağı taşı','dn'],['trash','Sayfayı sil','del']];
    const pg=el('div','pg'+(T?' tpg':''));pg.dataset.pid=p.id;pg.style.width=dw(p)*S.k+'px';
    const ov=el('div','ov');let c=null,doc=null,body=null;
    if(T){pg.style.minHeight=841.89*S.k+'px';doc=el('div','tdoc');doc.style.zoom=S.k/PT2PX;body=el('div','tbody');body.contentEditable='true';body.spellcheck=true;body.lang='tr';body.innerHTML=p.html||'<p><br></p>';doc.append(body);pg.append(doc,ov)}
    else{pg.style.height=dh(p)*S.k+'px';c=el('canvas','base');pg.append(c,ov)}
    wrap.append(head,pg);list.append(wrap);
    E[p.id]={wrap,pg,canvas:c,ov,doc,body,rk:0,task:null};
    head.addEventListener('click',ev=>{const b=ev.target.closest('[data-act]');if(b)pageAct(p,b.dataset.act)});
    ov.addEventListener('pointerdown',ev=>onDown(ev,p));ov.addEventListener('pointermove',ev=>showXY(ev,p));
    ov.addEventListener('dblclick',ev=>onDbl(ev,p));
    if(!T)io.observe(pg);
    if(T)p.h=Math.max(841.89,pg.offsetHeight/S.k);
    renderOv(p);
  });
  countWords();buildThumbs();updStatus();updUndo();updSelUI();
  $('#zl').textContent=Math.round(S.k/PT2PX*100)+'%';
}
async function paintPage(ctx,p,s,setTask){
  const W=ctx.canvas.width,H=ctx.canvas.height;ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  if(p.kind==='pdf'){const pg=await p.src.doc.getPage(p.index+1);const vp=pg.getViewport({scale:s,rotation:(pg.rotate+p.rot)%360,offsetX:-cx0(p)*s,offsetY:-cy0(p)*s});
    const un=p.objMode?filterCtx(ctx,true,true):null;
    try{const t=pg.render({canvasContext:ctx,viewport:vp});if(setTask)setTask(t);await t.promise}finally{if(un)un()}}
  else{ctx.save();ctx.translate(-cx0(p)*s,-cy0(p)*s);drawRot(ctx,p.img,p.rot,fw(p)*s,fh(p)*s);ctx.restore()}
}
async function renderBase(p){
  const e=E[p.id];if(!e||p.kind==='text')return;const k=S.k,dpr=Math.min(window.devicePixelRatio||1,2);e.rk=k;
  const c=e.canvas;
  try{
    const off=document.createElement('canvas');off.width=Math.max(1,Math.round(dw(p)*k*dpr));off.height=Math.max(1,Math.round(dh(p)*k*dpr));
    if(e.task){try{e.task.cancel()}catch(_){}}
    await paintPage(off.getContext('2d'),p,k*dpr,t=>e.task=t);
    if(e.rk!==k||E[p.id]!==e)return;
    c.width=off.width;c.height=off.height;c.getContext('2d').drawImage(off,0,0);
  }catch(err){if(err&&err.name==='RenderingCancelledException')return;console.warn(err);e.rk=0}
}
function setK(k){
  k=Math.max(0.25,Math.min(5,k));const v=$('#viewer');const ratio=v.scrollTop/Math.max(1,v.scrollHeight);
  S.k=k;
  for(const p of S.pages){const e=E[p.id];if(!e)continue;e.pg.style.width=dw(p)*k+'px';
    if(p.kind==='text'){e.doc.style.zoom=k/PT2PX;e.pg.style.minHeight=841.89*k+'px'}else e.pg.style.height=dh(p)*k+'px';renderOv(p)}
  if(typeof wSel!=='undefined'&&wSel)requestAnimationFrame(wPlace);
  v.scrollTop=ratio*v.scrollHeight;
  $('#zl').textContent=Math.round(k/PT2PX*100)+'%';
  clearTimeout(zt);zt=setTimeout(()=>{for(const id of visible){const p=pool.get(id);if(p&&E[id]&&E[id].rk!==S.k)renderBase(p)}},150);
}
function fitWidth(){
  if(!S.pages.length)return;const v=$('#viewer');const cs=getComputedStyle(v);
  const avail=v.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)-8;
  const maxW=Math.max(...S.pages.map(dw));setK(Math.min(2*PT2PX,avail/maxW));
}

/* ---------- thumbnails ---------- */
function buildThumbs(){
  const t=$('#thumbs');t.innerHTML='';if(tio)tio.disconnect();
  tio=new IntersectionObserver(ents=>ents.forEach(en=>{if(en.isIntersecting){const p=pool.get(en.target.dataset.pid);if(p)renderThumb(p,en.target.querySelector('canvas'));tio.unobserve(en.target)}}),{root:t,rootMargin:'400px'});
  S.pages.forEach((p,i)=>{
    const d=el('div','th'+(i===S.cur?' cur':''));d.dataset.pid=p.id;d.draggable=true;
    const tw=112,th=Math.min(170,tw*dh(p)/dw(p)),cw=th*dw(p)/dh(p);
    d.innerHTML=`<div class="thc"><canvas style="width:${cw}px;height:${th}px"></canvas>${p.anns.length?'<span class="dot" title="Bu sayfada işaret var"></span>':''}${p.kind==='text'?'<span class="tag">YAZI</span>':''}</div><label><input type="checkbox" ${S.checked.has(p.id)?'checked':''} aria-label="Sayfa ${i+1} seç"> ${i+1}</label>`;
    d.addEventListener('click',ev=>{if(ev.target.closest('label'))return;scrollToPage(S.pages.indexOf(p));if(innerWidth<=760)$('#side').classList.remove('show')});
    d.querySelector('input').addEventListener('change',ev=>{ev.target.checked?S.checked.add(p.id):S.checked.delete(p.id)});
    d.addEventListener('dragstart',ev=>{ev.dataTransfer.setData('text/x-pid',p.id);ev.dataTransfer.effectAllowed='move';d.classList.add('dragging')});
    d.addEventListener('dragend',()=>d.classList.remove('dragging'));
    d.addEventListener('dragover',ev=>{if(!ev.dataTransfer.types.includes('text/x-pid'))return;ev.preventDefault();const r=d.getBoundingClientRect();const after=ev.clientY>r.top+r.height/2;d.classList.toggle('ins-after',after);d.classList.toggle('ins-before',!after)});
    d.addEventListener('dragleave',()=>d.classList.remove('ins-after','ins-before'));
    d.addEventListener('drop',ev=>{const id=ev.dataTransfer.getData('text/x-pid');d.classList.remove('ins-after','ins-before');if(!id)return;ev.preventDefault();ev.stopPropagation();if(id===p.id)return;
      const r=d.getBoundingClientRect();const after=ev.clientY>r.top+r.height/2;pushUndo();
      const mv=pool.get(id);S.pages.splice(S.pages.indexOf(mv),1);let at=S.pages.indexOf(p)+(after?1:0);S.pages.splice(at,0,mv);keepScroll(buildViewer)});
    t.append(d);tio.observe(d);
  });
}
async function renderThumb(p,c){
  const dpr=Math.min(window.devicePixelRatio||1,2);const cw=parseFloat(c.style.width),s=cw/dw(p)*dpr;
  try{c.width=Math.max(1,Math.round(dw(p)*s));c.height=Math.max(1,Math.round(dh(p)*s));if(p.kind==='text'){drawTextThumb(p,c,s);if(p.anns.length){await ensureImgs(p);drawAnns(c.getContext('2d'),p.anns,s,false)}return}await paintPage(c.getContext('2d'),p,s);if(p.objMode||p.anns.some(a=>a.type==='img'||a.type==='white'||a.type==='poly')){await ensureImgs(p);drawAnns(c.getContext('2d'),p.anns,s,false)}}catch(e){}
}
function markThumb(p){const t=$(`.th[data-pid="${p.id}"] .thc`);if(!t)return;const d=t.querySelector('.dot');if(p.anns.length&&!d)t.insertAdjacentHTML('beforeend','<span class="dot" title="Bu sayfada işaret var"></span>');if(!p.anns.length&&d)d.remove()}
function scrollToPage(i,smooth=true){const p=S.pages[i];if(!p||!E[p.id])return;const v=$('#viewer');v.scrollTo({top:E[p.id].wrap.offsetTop-12,behavior:smooth?'smooth':'auto'})}

/* ---------- page actions ---------- */
function rotAnn(a,d,W,H){
  const P=d>0?([x,y])=>[H-y,x]:([x,y])=>[y,W-x];
  if(a.type==='path'||a.type==='poly'||a.type==='pline'||a.type==='area')a.pts=a.pts.map(P);
  else if(a.type==='arrow'||a.type==='dim'){[a.x1,a.y1]=P([a.x1,a.y1]);[a.x2,a.y2]=P([a.x2,a.y2])}
  else if(a.type==='xy'){[a.x,a.y]=P([a.x,a.y])}
  else if(a.type==='text'||a.type==='img'){const [cx,cy]=P([a.x+a.w/2,a.y+a.h/2]);a.x=cx-a.w/2;a.y=cy-a.h/2}
  else{const [x1,y1]=P([a.x,a.y]),[x2,y2]=P([a.x+a.w,a.y+a.h]);a.x=Math.min(x1,x2);a.y=Math.min(y1,y2);a.w=Math.abs(x2-x1);a.h=Math.abs(y2-y1)}
}
function rotatePage(p,d){const W=dw(p),H=dh(p);p.anns.forEach(a=>rotAnn(a,d,W,H));
  if(p.clip){const c=Object.assign({type:'rect'},p.clip);rotAnn(c,d,fw(p),fh(p));p.clip={x:c.x,y:c.y,w:c.w,h:c.h}}
  p.rot=((p.rot+d)%360+360)%360}
function shiftAnns(p,dx,dy){p.anns.forEach(a=>{const o=JSON.parse(JSON.stringify(a));moveAnn(a,o,dx,dy)})}
function applyCrop(p,r){
  const x=Math.max(0,r.x),y=Math.max(0,r.y),x2=Math.min(dw(p),r.x+r.w),y2=Math.min(dh(p),r.y+r.h);if(x2-x<8||y2-y<8)return false;
  shiftAnns(p,-x,-y);p.clip={x:cx0(p)+x,y:cy0(p)+y,w:x2-x,h:y2-y};S.hits=[];setTool('select');keepScroll(buildViewer);
  toast('Sayfa kırpıldı. Geri almak için Ctrl+Z; tamamen geri açmak için sayfanın üstündeki "Kırpmayı kaldır".',6000);return true}
function pageAct(p,act){
  const i=S.pages.indexOf(p);if(i<0)return;
  if(p.kind==='text'&&['rl','rr','toG','uc'].includes(act)){toast('Bu işlem yazı sayfalarında yok.');return}
  if(act==='rl'||act==='rr'){pushUndo();rotatePage(p,act==='rr'?90:-90);S.hits=[];keepScroll(buildViewer)}
  else if(act==='up'&&i>0){pushUndo();S.pages.splice(i,1);S.pages.splice(i-1,0,p);buildViewer();scrollToPage(i-1,false)}
  else if(act==='dn'&&i<S.pages.length-1){pushUndo();S.pages.splice(i,1);S.pages.splice(i+1,0,p);buildViewer();scrollToPage(i+1,false)}
  else if(act==='orig'){revertObj(p)}
  else if(act==='uc'&&p.clip){pushUndo();shiftAnns(p,p.clip.x,p.clip.y);p.clip=null;S.hits=[];keepScroll(buildViewer)}
  else if(act==='toG'){openStudio(p)}
  else if(act==='del'){pushUndo();S.pages.splice(i,1);S.checked.delete(p.id);if(S.sel&&S.sel.pageId===p.id)S.sel=null;S.hits=S.hits.filter(h=>h.pageId!==p.id);keepScroll(buildViewer);toast('Sayfa silindi. Geri almak için Ctrl+Z.')}
}

/* ---------- overlay ---------- */
const NS='http://www.w3.org/2000/svg';
function sv(tag,attrs){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);return e}
function arrowHead(a){const L=Math.max(9,a.lw*4),ang=Math.atan2(a.y2-a.y1,a.x2-a.x1),s=0.45;return [[a.x2,a.y2],[a.x2-L*Math.cos(ang-s),a.y2-L*Math.sin(ang-s)],[a.x2-L*Math.cos(ang+s),a.y2-L*Math.sin(ang+s)]]}
function bbox(a){if(a.type==='xy')return{x:a.x-4,y:a.y-4,w:8,h:8};if(a.type==='path'||a.type==='poly'||a.type==='pline'||a.type==='area'){const xs=a.pts.map(p=>p[0]),ys=a.pts.map(p=>p[1]);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}}
  if(a.type==='arrow'||a.type==='dim')return{x:Math.min(a.x1,a.x2),y:Math.min(a.y1,a.y2),w:Math.abs(a.x2-a.x1),h:Math.abs(a.y2-a.y1)};return a}
function renderOv(p){
  const e=E[p.id];if(!e)return;const ov=e.ov,k=S.k;ov.innerHTML='';
  const W=dw(p)*k,H=dh(p)*k;const svg=sv('svg',{class:'ovsvg',width:W,height:H,viewBox:`0 0 ${W} ${H}`});let hasSvg=false;
  updMeasLabels(p);
  for(const a of p.anns){
    if(a.hid)continue;
    if(SVGT.has(a.type)){hasSvg=true;const g=sv('g',{'data-aid':a.id,class:a.lock?'locked':''});measSvg(g,a,k);
      if(S.sel&&S.sel.pageId===p.id&&S.sel.aid===a.id){const b=bbox(a);g.append(sv('rect',{class:'selbox',x:b.x*k-5,y:b.y*k-5,width:b.w*k+10,height:b.h*k+10}))}svg.append(g);continue}
    const selected=S.sel&&S.sel.pageId===p.id&&S.sel.aid===a.id;
    if(a.type==='poly'){hasSvg=true;const g=sv('g',{'data-aid':a.id,class:a.lock?'locked':''});const d='M'+a.pts.map(([x,y])=>`${(x*k).toFixed(1)} ${(y*k).toFixed(1)}`).join(' L')+' Z';
      g.append(sv('path',{d,fill:a.fill||'#ffffff',stroke:'none'}));g.append(sv('path',{d,class:'hitfill',fill:'transparent'}));
      if(selected){const b=bbox(a);g.append(sv('rect',{class:'selbox',x:b.x*k-5,y:b.y*k-5,width:b.w*k+10,height:b.h*k+10}))}svg.append(g);continue}
    if(a.type==='path'||a.type==='arrow'){
      hasSvg=true;const g=sv('g',{'data-aid':a.id,class:a.lock?'locked':''});
      const d=a.type==='path'?'M'+a.pts.map(([x,y])=>`${(x*k).toFixed(1)} ${(y*k).toFixed(1)}`).join(' L'):`M${a.x1*k} ${a.y1*k} L${a.x2*k} ${a.y2*k}`;
      g.append(sv('path',{d,fill:'none',stroke:a.color,'stroke-width':a.lw*k,'stroke-linecap':'round','stroke-linejoin':'round'}));
      if(a.type==='arrow')g.append(sv('polygon',{points:arrowHead(a).map(([x,y])=>`${x*k},${y*k}`).join(' '),fill:a.color}));
      g.append(sv('path',{d,class:'hitpath',fill:'none',stroke:'transparent','stroke-width':Math.max(14,a.lw*k+10)}));
      if(selected){const b=bbox(a);g.append(sv('rect',{class:'selbox',x:b.x*k-5,y:b.y*k-5,width:b.w*k+10,height:b.h*k+10}))}
      svg.append(g);
    }else{
      const d=el('div','ann '+a.type+(selected?' sel':'')+(a.lock?' locked':''));d.dataset.aid=a.id;
      Object.assign(d.style,{left:a.x*k+'px',top:a.y*k+'px',width:a.w*k+'px',height:a.h*k+'px'});
      if(a.type==='text'){d.textContent=a.text;Object.assign(d.style,{fontSize:a.size*k+'px',color:a.color,fontWeight:a.bold?'700':'400',fontStyle:a.italic?'italic':'normal',textDecoration:a.underline?'underline':'none',textAlign:a.align||'left',fontFamily:fontCss(a.font),background:a.bg||'transparent'});if(a.lineKey)d.style.whiteSpace='pre'}
      else if(a.type==='hl')d.style.background=a.color;
      else if(a.type==='rect'){d.style.border=`${a.lw*k}px solid ${a.color}`}
      else if(a.type==='img'){const im=document.createElement('img');im.src=a.src;im.alt='';im.draggable=false;d.append(im)}
      if(selected&&S.editing!==a.id){const h=el('div','handle');h.dataset.handle='1';d.append(h)}
      ov.append(d);
    }
  }
  if(hasSvg)ov.append(svg);
  ocrLayer(p,ov,k);
  if(S.wm&&S.wm.text){const w=el('div','wm');w.textContent=S.wm.text;Object.assign(w.style,{fontSize:wmSize(dw(p))*k+'px',color:S.wm.color,opacity:S.wm.op});if(p.kind==='text')w.style.top=Math.min(50,42100/Math.max(1,dh(p)))+'%';ov.prepend(w)}
  if(S.pnum&&p.kind!=='text'){const n=el('div','pnum');n.textContent=String(S.pages.indexOf(p)+1);Object.assign(n.style,{fontSize:10*k+'px',top:(dh(p)-22-10)*k+'px'});ov.append(n)}
  if(p===S.pages[S.cur])refreshTree();
  S.hits.forEach((h,i)=>{if(h.pageId!==p.id)return;const d=el('div','hit'+(i===S.hitI?' cur':''));Object.assign(d.style,{left:h.x*k+'px',top:h.y*k+'px',width:h.w*k+'px',height:h.h*k+'px'});ov.append(d)});
}
function local(ev,ov){const r=ov.getBoundingClientRect();return[(ev.clientX-r.left)/S.k,(ev.clientY-r.top)/S.k]}
function selAnn(){if(!S.sel)return null;const p=pool.get(S.sel.pageId);if(!p)return null;const a=p.anns.find(a=>a.id===S.sel.aid);return a?{p,a}:null}
function setSel(sel){flushEdit();if(sel)S.ctx='ann';const prev=S.sel;S.sel=sel;if(prev){const p=pool.get(prev.pageId);if(p)renderOv(p)}if(sel&&(!prev||prev.pageId!==sel.pageId)){const p=pool.get(sel.pageId);if(p)renderOv(p)}updSelUI()}
function flushEdit(){const d=document.querySelector('#pagesList .ann.editing');if(d)d.blur()}
function setFsSel(v){const sel=$('#fsSel');v=Math.round(v*2)/2;if(![...sel.options].some(o=>+o.value===v)){const o=document.createElement('option');o.value=v;o.textContent=v+' pt';sel.append(o)}sel.value=v}
function updSelUI(){
  const s=selAnn();$('#delBtn').disabled=!s;
  const t=s&&s.a.type==='text'?s.a:null,src=t||S;
  if(s){const a=s.a;
    if(a.color&&a.type!=='hl')$$('#swatches .sw').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===a.color)));
    if(a.lw)$('#lwSel').value=a.lw;
  }else $$('#swatches .sw').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===S.color)));
  if(S.ctx==='txt'&&!t)return;
  setFsSel(t?t.size:S.fs);
  $('#boldBtn').setAttribute('aria-pressed',String(!!src.bold));$('#italBtn').setAttribute('aria-pressed',String(!!src.italic));$('#undBtn').setAttribute('aria-pressed',String(!!src.underline));$('#strBtn').setAttribute('aria-pressed','false');
  $('#pfSel').value=FONTS[src.font]?src.font:'Arial';const al=src.align||'left';
  [['alL','left'],['alC','center'],['alR','right'],['alJ','justify']].forEach(([id,v])=>$('#'+id).setAttribute('aria-pressed',String(al===v)));
  if(src.color&&/^#[0-9a-f]{6}$/i.test(src.color))$('#fColor').value=src.color;
}
function moveAnn(a,o,dx,dy){if(a.type==='path'||a.type==='poly'||a.type==='pline'||a.type==='area')a.pts=o.pts.map(([x,y])=>[x+dx,y+dy]);else if(a.type==='arrow'||a.type==='dim'){a.x1=o.x1+dx;a.y1=o.y1+dy;a.x2=o.x2+dx;a.y2=o.y2+dy}else{a.x=o.x+dx;a.y=o.y+dy}}
function drag(ov,ev,mv,up){ov.setPointerCapture(ev.pointerId);const m=e=>mv(e);const u=e=>{ov.removeEventListener('pointermove',m);ov.removeEventListener('pointerup',u);ov.removeEventListener('pointercancel',u);up(e)};ov.addEventListener('pointermove',m);ov.addEventListener('pointerup',u);ov.addEventListener('pointercancel',u)}
function onDown(ev,p){
  if(ev.button>0||ev.target.isContentEditable)return;
  flushEdit();
  const ov=E[p.id].ov;const [x,y]=local(ev,ov);const tool=S.tool;
  if(tool==='select'){
    const t=ev.target.closest('[data-aid]');if(!t){setSel(null);S.ctx=null;return}
    const a=p.anns.find(q=>q.id===t.dataset.aid);if(!a)return;
    const now=Date.now();if(a.type==='text'&&S._ld&&S._ld.aid===a.id&&now-S._ld.t<450&&!ev.target.closest('[data-handle]')){S._ld=null;ev.preventDefault();pushUndo();S.sel={pageId:p.id,aid:a.id};editText(p,a,'end');return}
    S._ld={aid:a.id,t:now};
    const resizing=!!ev.target.closest('[data-handle]');ev.preventDefault();
    setSel({pageId:p.id,aid:a.id});
    const before=snap(),o=JSON.parse(JSON.stringify(a));let moved=false;
    drag(ov,ev,m=>{const [mx,my]=local(m,ov);const dx=mx-x,dy=my-y;if(!moved&&Math.hypot(dx,dy)*S.k<3)return;moved=true;
      if(resizing){a.w=Math.max(12,o.w+dx);if(a.type==='img')a.h=a.w*o.h/o.w;else a.h=Math.max(a.type==='text'?a.size*1.25:4,o.h+dy)}else moveAnn(a,o,dx,dy);renderOv(p)},
      ()=>{if(moved){commitUndo(before);markThumb(p)}});
    return;
  }
  ev.preventDefault();
  if(p.kind==='text'&&['edit','crop','cut','lasso','grab','ocrsel'].includes(tool)){toast(tool==='ocrsel'?'Yazı sayfasındaki yazı zaten metin; seçip kopyalayabilirsiniz.':tool==='edit'?'Yazı sayfasında yazıyı doğrudan tıklayıp düzenleyebilirsiniz.':'Bu resim aracı PDF ve resim sayfalarında çalışır.');setTool('select');return}
  if(tool==='edit'){
    const t=ev.target.closest('.ann.text');
    if(t){const a=p.anns.find(q=>q.id===t.dataset.aid);if(a){pushUndo();S.sel={pageId:p.id,aid:a.id};editText(p,a,'end')}return}
    if(p.objMode){toast('Bu sayfadaki yazılar zaten ayrı kutular: bir yazıya çift tıklayıp düzenleyin, tutup sürükleyerek taşıyın.',5000);return}
    editLineAt(p,x,y);return;
  }
  if(tool==='text'){
    pushUndo();const w=Math.max(60,Math.min(240,dw(p)-x-4));
    const a={id:nid('a'),type:'text',x,y:Math.max(0,y-S.fs*0.65),w,h:S.fs*1.25,text:'',size:S.fs,color:S.color,bold:S.bold,italic:S.italic,underline:S.underline,font:S.font,align:S.align,bg:null};
    p.anns.push(a);setTool('select');S.sel={pageId:p.id,aid:a.id};editText(p,a,true);markThumb(p);return;
  }
  if(tool==='place'){
    const pi=S.pendingImg;if(!pi){setTool('select');return}
    pushUndo();const w=Math.min(pi.w,dw(p)*0.9),h=w/pi.ar;
    const a={id:nid('a'),type:'img',x:Math.max(0,x-w/2),y:Math.max(0,y-h/2),w,h,src:pi.src};
    p.anns.push(a);S.pendingImg=null;setTool('select');setSel({pageId:p.id,aid:a.id});renderOv(p);markThumb(p);return;
  }
  if(tool==='pline'||tool==='area'){buildClick(p,x,y,tool);return}
  if(tool==='pick'){pickColor(p,x,y);return}
  if(tool==='xy'){pushUndo();p.anns.push({id:nid('a'),type:'xy',x,y,color:S.color});renderOv(p);markThumb(p);return}
  const before=snap();let a;
  if(tool==='crop')a={id:nid('a'),type:'rect',x,y,w:0,h:0,color:'#3a3db0',lw:1.2,crop:true};
  else if(tool==='cut'||tool==='grab'||tool==='ocrsel')a={id:nid('a'),type:'rect',x,y,w:0,h:0,color:tool==='ocrsel'?'#e07800':'#3a3db0',lw:1.2,temp:tool};
  else if(tool==='lasso')a={id:nid('a'),type:'path',pts:[[x,y]],color:'#3a3db0',lw:1.5,temp:'lasso'};
  else if(tool==='dist'||tool==='calib')a={id:nid('a'),type:'dim',x1:x,y1:y,x2:x,y2:y,color:tool==='calib'?'#3a3db0':S.color,lw:tool==='calib'?1.2:Math.min(S.lw,2),temp:tool==='calib'?'calib':undefined};
  else if(tool==='rect'||tool==='hl'||tool==='white'||tool==='ellipse')a={id:nid('a'),type:tool,x,y,w:0,h:0,color:tool==='hl'?S.hlColor:S.color,lw:S.lw};
  else if(tool==='pen')a={id:nid('a'),type:'path',pts:[[x,y]],color:S.color,lw:S.lw};
  else if(tool==='arrow')a={id:nid('a'),type:'arrow',x1:x,y1:y,x2:x,y2:y,color:S.color,lw:S.lw};
  else return;
  if(tool==='white')delete a.color;
  p.anns.push(a);
  drag(ov,ev,m=>{const [mx,my]=local(m,ov);
    if(a.type==='path'){const l=a.pts[a.pts.length-1];if(Math.hypot(mx-l[0],my-l[1])*S.k>1.5)a.pts.push([mx,my])}
    else if(a.type==='arrow'||a.type==='dim'){a.x2=mx;a.y2=my;if(m.shiftKey){if(Math.abs(mx-x)>Math.abs(my-y))a.y2=y;else a.x2=x}}
    else if(a.type==='ellipse'&&m.shiftKey){const r=Math.max(Math.abs(mx-x),Math.abs(my-y));a.x=mx<x?x-r:x;a.y=my<y?y-r:y;a.w=a.h=r}
    else{a.x=Math.min(x,mx);a.y=Math.min(y,my);a.w=Math.abs(mx-x);a.h=Math.abs(my-y)}
    renderOv(p)},
   ()=>{let tiny;
    if(a.type==='path'){if(a.pts.length===1)a.pts.push([a.pts[0][0]+0.2,a.pts[0][1]+0.2]);tiny=false}
    else if(a.type==='arrow'||a.type==='dim')tiny=Math.hypot(a.x2-a.x1,a.y2-a.y1)<4;else tiny=a.w<3||a.h<3;
    if(a.temp==='calib'){p.anns.pop();renderOv(p);if(!tiny)openCalib(p,Math.hypot(a.x2-a.x1,a.y2-a.y1));return}
    if(a.temp==='ocrsel'){p.anns.pop();renderOv(p);setTool('select');if(!tiny)ocrCurrent({x:a.x,y:a.y,w:a.w,h:a.h},p);return}
    if(a.temp){p.anns.pop();renderOv(p);if(a.temp==='lasso'?a.pts.length>3:!tiny)imageOp(p,a);return}
    if(a.crop){p.anns.pop();if(tiny||!applyCrop(p,a))renderOv(p);else commitUndo(before);return}
    if(tiny)p.anns.pop();else{commitUndo(before);markThumb(p)}renderOv(p)});
}
function onDbl(ev,p){if(S.tool!=='select')return;const t=ev.target.closest('[data-aid]');if(!t)return;const a=p.anns.find(q=>q.id===t.dataset.aid);if(a&&a.type==='text'){pushUndo();editText(p,a,false)}}
function editText(p,a,isNew){
  flushEdit();S.editing=a.id;renderOv(p);const d=E[p.id].ov.querySelector(`[data-aid="${a.id}"]`);if(!d)return;
  d.contentEditable='true';d.classList.add('editing');d.style.minHeight=d.style.height;d.style.height='auto';
  if(a.lineKey){d.style.width='auto';d.style.minWidth=(a.minW||a.w)*S.k+'px';d.style.whiteSpace='pre'}
  d.focus();updSelUI();
  const r=document.createRange();r.selectNodeContents(d);if(isNew)r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r);
  d.addEventListener('paste',e=>{e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'))});
  d.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();d.blur()}});
  d.addEventListener('blur',()=>{
    S.editing=null;const t=d.innerText.replace(/\n$/,'');
    if(!t.trim()&&!a.lineKey){p.anns=p.anns.filter(q=>q!==a);if(S.sel&&S.sel.aid===a.id)S.sel=null;if(isNew===true)S.undo.pop(),updUndo()}
    else{a.text=t;if(a.lineKey)a.w=Math.max(a.minW||0,d.offsetWidth/S.k+1);a.h=Math.max(a.minH||0,a.size*1.25,d.offsetHeight/S.k)}
    renderOv(p);markThumb(p);updSelUI();
  },{once:true});
}
async function editLineAt(p,x,y){
  if(p.kind!=='pdf'){toast('Bu sayfa bir resim; yazıları doğrudan değiştirilemez. Beyaz örtü ile kapatıp Metin aracıyla yeniden yazın.',6000);return}
  let r;try{r=await getTC(p)}catch(e){return}
  const vp=r.pg.getViewport({scale:1,rotation:(r.pg.rotate+p.rot)%360});const ox=cx0(p),oy=cy0(p);
  const boxes=r.items.map(it=>{const b=boxFor(it,0,it.str.length,vp);b.x-=ox;b.y-=oy;b.it=it;return b});
  const hit=boxes.find(b=>b.it.str.trim()&&x>=b.x-2&&x<=b.x+b.w+2&&y>=b.y-2&&y<=b.y+b.h+2);
  if(!hit){toast(r.items.length?'Burada yazı bulunamadı. Doğrudan bir yazının üzerine tıklayın.':'Bu sayfada düzenlenebilir yazı yok (taranmış belge olabilir). Beyaz örtü ve Metin aracını kullanın.',5000);return}
  const cy=hit.y+hit.h/2;
  const row=boxes.filter(b=>Math.abs(b.y+b.h/2-cy)<hit.h*0.45&&Math.abs(b.h-hit.h)<hit.h*0.6).sort((a,b)=>a.x-b.x);
  let i=row.indexOf(hit),lo=i,hi=i;const gap=hit.h*1.6;
  while(lo>0&&row[lo].x-(row[lo-1].x+row[lo-1].w)<gap)lo--;
  while(hi<row.length-1&&row[hi+1].x-(row[hi].x+row[hi].w)<gap)hi++;
  const seg=row.slice(lo,hi+1);let text='',end=null;
  for(const b of seg){if(end!=null&&b.x-end>b.h*0.12&&!/\s$/.test(text)&&!/^\s/.test(b.it.str))text+=' ';text+=b.it.str;end=b.x+b.w}
  text=text.replace(/\s+$/,'');
  const bx=Math.min(...seg.map(b=>b.x)),by=Math.min(...seg.map(b=>b.y)),bx2=Math.max(...seg.map(b=>b.x+b.w)),by2=Math.max(...seg.map(b=>b.y+b.h));
  const key=Math.round(bx)+','+Math.round(by);
  const ex=p.anns.find(a=>a.lineKey===key);if(ex){pushUndo();S.sel={pageId:p.id,aid:ex.id};editText(p,ex,'end');return}
  let font='Arial',bold=false,italic=false;
  const st=r.styles&&r.styles[hit.it.fontName];if(st&&st.fontFamily){if(/serif/i.test(st.fontFamily)&&!/sans/i.test(st.fontFamily))font='Times New Roman';else if(/mono/i.test(st.fontFamily))font='Courier New'}
  try{const fo=r.pg.commonObjs.has(hit.it.fontName)?r.pg.commonObjs.get(hit.it.fontName):null;const nm=fo?String(fo.name||''):'';
    if(nm){if(/bold|black|heavy|semibold|demi/i.test(nm))bold=true;if(/italic|oblique/i.test(nm))italic=true;
      if(/times|roman|georgia|garamond|cambria|book/i.test(nm)&&!/sans/i.test(nm))font='Times New Roman';else if(/courier|mono/i.test(nm))font='Courier New';else if(/calibri|carlito/i.test(nm))font='Calibri';else if(/tahoma/i.test(nm))font='Tahoma';else if(/verdana/i.test(nm))font='Verdana';else if(/arial|helvetica|liberation ?sans|segoe|dejavu ?sans/i.test(nm))font='Arial'}}catch(e){}
  const fs=Math.max(4,(by2-by)/1.14),w=bx2-bx+2.5,h=by2-by+2;
  pushUndo();
  const a={id:nid('a'),type:'text',x:bx-0.5,y:by-1,w,h,minW:w,minH:h,text,size:Math.round(fs*10)/10,color:'#000000',bold,italic,underline:false,font,align:'left',bg:'#ffffff',lineKey:key};
  p.anns.push(a);S.sel={pageId:p.id,aid:a.id};editText(p,a,'end');markThumb(p);
}
function deleteSel(){const s=selAnn();if(!s)return;pushUndo();s.p.anns=s.p.anns.filter(a=>a!==s.a);S.sel=null;renderOv(s.p);markThumb(s.p);updSelUI()}
function applyProp(prop,val){
  const s=selAnn();if(!s)return;const a=s.a;
  const ok={color:['text','rect','path','arrow','ellipse','pline','dim','area','xy'],size:['text'],lw:['rect','path','arrow','ellipse','pline','dim','area'],bold:['text'],italic:['text'],underline:['text'],font:['text'],align:['text']}[prop];
  if(!ok.includes(a.type))return;pushUndo();a[prop]=val;if(prop==='size')a.h=Math.max(a.h,val*1.25);renderOv(s.p);
}
const HINTS={select:'Seç: işarete tıklayıp taşıyın, köşedeki tutamaçla boyutlandırın, metni değiştirmek için çift tıklayın.',
 text:'Metin: yazı eklemek istediğiniz yere tıklayıp yazın.',hl:'Vurgula: vurgulanacak alanın üzerinden sürükleyin.',
 pen:'Kalem: basılı tutup çizin.',rect:'Dikdörtgen: sürükleyerek çerçeve çizin.',arrow:'Ok: başlangıç noktasından bitişe sürükleyin.',
 white:'Beyaz örtü: değiştirmek istediğiniz yazının üstünü sürükleyerek kapatın, sonra Metin aracıyla yenisini yazın.',
 place:'Yerleştirmek istediğiniz yere tıklayın. Vazgeçmek için Esc.',
 edit:'Yazıyı düzenle: PDF’teki bir satırın üzerine tıklayın, satır düzenlenebilir olur. Yazı tipini ve boyutunu üstten değiştirebilirsiniz.',
 crop:'Kırp: sayfada bırakmak istediğiniz alanı sürükleyerek seçin.',
 cut:'Kes, ayır: kesmek istediğiniz alanı sürükleyerek seçin; parça ayrılır ve sürüklenebilir olur.',
 lasso:'Serbest kes: fareyi basılı tutup kesmek istediğiniz şeklin çevresini çizin, bırakınca kesilir.',
 grab:'Görsel al: almak istediğiniz alanı seçin; sonra kaydedebilir, yeni sayfa yapabilir ya da yazıya ekleyebilirsiniz.',
 ellipse:'Daire: sürükleyerek çizin. Shift basılıyken tam daire olur.',
 pline:'Çoklu çizgi: noktaları tıklayarak koyun; çift tık ya da Enter ile bitirin, Esc ile bırakın.',
 dist:'Mesafe: ölçmek istediğiniz iki nokta arasında sürükleyin. Shift ile yatay/dikey. Ölçeği Ölçü → Ölçek ile ayarlayın.',
 area:'Alan: köşe noktalarını tıklayarak koyun; çift tık ya da Enter ile bitirin. Alan ve çevre yazılır.',
 xy:'Nokta koy: koordinatını yazmak istediğiniz noktalara tıklayın.',
 pick:'Renk seçici: sayfada rengini almak istediğiniz yere tıklayın.',
 ocrsel:'Alandan yazı tanı: yazısını almak istediğiniz bölümü fareyle seçin.',
 calib:'Uzunluğunu bildiğiniz iki nokta arasında sürükleyin; sonra gerçek uzunluğu yazacaksınız.'};
function setTool(t){
  if(S.build)finishBuild();flushEdit();if(t!=='place')S.pendingImg=null;S.tool=t;
  $$('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tool===t));
  const v=$('#viewer');v.className=v.className.replace(/\btool-\S+/g,'')+' tool-'+t;
  if(t!=='select'&&S.sel)setSel(null);$('#pHint').textContent=HINTS[t]||'';
}
function countWords(){let n=0;for(const p of S.pages)if(p.kind==='text'){const e=E[p.id];const t=e&&e.body?e.body.innerText:(p.html||'').replace(/<[^>]+>/g,' ');n+=(t.match(/\S+/g)||[]).length}S.words=n}
function updStatus(){
  const n=S.pages.length;$('#docName').textContent=S.baseName||(S.pages.length&&S.pages.every(p=>p.sample)?'Örnek belge':S.pages.length?'Adsız belge':'Boş belge');const files=new Set(S.pages.filter(p=>!p.sample).map(p=>p.name)).size;
  $('#pStat').textContent=n?`Sayfa ${Math.min(S.cur+1,n)} / ${n}`+(S.words?` · ${S.words} sözcük`:'')+(S.objMsg?` · ${S.objMsg}`:'')+(S.ocrMsg?` · ${S.ocrMsg}`:''):'Sayfa yok';
  refreshTree();updScaleLbl();
}
let scrollRaf=0;
$('#viewer').addEventListener('scroll',()=>{if(scrollRaf)return;scrollRaf=requestAnimationFrame(()=>{scrollRaf=0;const vr=$('#viewer').getBoundingClientRect(),mid=vr.top+vr.height*0.35;let cur=0;S.pages.forEach((p,i)=>{const e=E[p.id];if(e&&e.pg.getBoundingClientRect().top<=mid)cur=i});
  if(cur!==S.cur){S.cur=cur;updStatus();$$('.th').forEach((t,i)=>t.classList.toggle('cur',i===cur));const ct=$$('.th')[cur];if(ct&&$('#thumbs').offsetParent){const tb=$('#thumbs'),r=ct.offsetTop;if(r<tb.scrollTop||r>tb.scrollTop+tb.clientHeight-120)tb.scrollTop=r-40}}})});
$('#viewer').addEventListener('wheel',e=>{if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();setK(S.k*(e.deltaY<0?1.1:1/1.1))},{passive:false});

/* ---------- search ---------- */
let sTok=0,sT=0;
async function getTC(p){const c=p.src.tc;if(!c[p.index]){const pg=await p.src.doc.getPage(p.index+1);const tc=await pg.getTextContent();c[p.index]={pg,items:tc.items.filter(it=>it.str&&it.transform),styles:tc.styles||{}}}return c[p.index]}
function boxFor(it,idx,len,vp){
  const [a,b,c,d,e,f]=it.transform;const h=Math.hypot(c,d)||it.height||10;const L=it.str.length||1;let x1=e,x2=e+it.width;
  if(b===0&&c===0&&a>0){x1=e+it.width*idx/L;x2=e+it.width*(idx+len)/L}
  const r=vp.convertToViewportRectangle([x1,f-h*0.22,x2,f+h*0.92]);
  return{x:Math.min(r[0],r[2]),y:Math.min(r[1],r[3]),w:Math.abs(r[2]-r[0]),h:Math.abs(r[3]-r[1])};
}
async function runSearch(q){
  const tok=++sTok;q=q.trim();const old=new Set(S.hits.map(h=>h.pageId));S.hits=[];S.hitI=-1;
  const qi=$('#qi');if(!q){qi.textContent='';old.forEach(id=>{const p=pool.get(id);if(p)renderOv(p)});return}
  const pp=S.pages.filter(p=>p.kind==='pdf');if(!pp.length){qi.textContent='PDF yok';old.forEach(id=>{const p=pool.get(id);if(p)renderOv(p)});return}
  qi.textContent='…';const qn=q.toLocaleLowerCase('tr-TR');
  for(const p of pp){
    let r;try{r=await getTC(p)}catch(e){continue}if(tok!==sTok)return;
    const vp=r.pg.getViewport({scale:1,rotation:(r.pg.rotate+p.rot)%360});
    for(const it of r.items){const s=it.str.toLocaleLowerCase('tr-TR');let i=s.indexOf(qn);while(i>=0){{const b=boxFor(it,i,qn.length,vp);b.x-=cx0(p);b.y-=cy0(p);S.hits.push(Object.assign({pageId:p.id},b))};i=s.indexOf(qn,i+qn.length)}}
  }
  const pages=new Set([...old,...S.hits.map(h=>h.pageId)]);pages.forEach(id=>{const p=pool.get(id);if(p)renderOv(p)});
  if(S.hits.length)gotoHit(0);else qi.textContent='Bulunamadı';
}
function gotoHit(i){
  if(!S.hits.length)return;const prev=S.hits[S.hitI];S.hitI=(i+S.hits.length)%S.hits.length;const h=S.hits[S.hitI];
  [prev&&prev.pageId,h.pageId].forEach(id=>{const p=id&&pool.get(id);if(p)renderOv(p)});
  $('#qi').textContent=`${S.hitI+1}/${S.hits.length}`;const e=E[h.pageId];if(e){const v=$('#viewer');v.scrollTo({top:e.wrap.offsetTop+e.pg.offsetTop+h.y*S.k-v.clientHeight/3,behavior:'smooth'})}
}
$('#q').addEventListener('input',e=>{clearTimeout(sT);sT=setTimeout(()=>runSearch(e.target.value),300)});
$('#q').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(S.hits.length)gotoHit(S.hitI+(e.shiftKey?-1:1));else runSearch(e.target.value)}});
$('#qprev').onclick=()=>gotoHit(S.hitI-1);$('#qnext').onclick=()=>gotoHit(S.hitI+1);

