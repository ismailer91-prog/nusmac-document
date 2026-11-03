/* ---------- PDF nesne modu: yazılar ve resimler ayrı, düzenlenebilir nesneler ---------- */
function filterCtx(ctx,noText,noImg){
  if(noText){ctx.fillText=function(){};ctx.strokeText=function(){}}
  if(noImg){const dI=CanvasRenderingContext2D.prototype.drawImage;ctx.drawImage=function(){if(arguments.length===9)return;return dI.apply(this,arguments)}}
  return()=>{delete ctx.fillText;delete ctx.strokeText;delete ctx.drawImage};
}
const mmul=(m,n)=>[m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]];
function fontGuess(r,it){let font='Arial',bold=false,italic=false;
  const st=r.styles&&r.styles[it.fontName];if(st&&st.fontFamily){if(/serif/i.test(st.fontFamily)&&!/sans/i.test(st.fontFamily))font='Times New Roman';else if(/mono/i.test(st.fontFamily))font='Courier New'}
  try{const fo=r.pg.commonObjs.has(it.fontName)?r.pg.commonObjs.get(it.fontName):null;const nm=fo?String(fo.name||''):'';
    if(nm){if(/bold|black|heavy|semibold|demi/i.test(nm))bold=true;if(/italic|oblique/i.test(nm))italic=true;
      if(/times|roman|georgia|garamond|cambria|book/i.test(nm)&&!/sans/i.test(nm))font='Times New Roman';else if(/courier|mono/i.test(nm))font='Courier New';else if(/calibri|carlito/i.test(nm))font='Calibri';else if(/tahoma/i.test(nm))font='Tahoma';else if(/verdana/i.test(nm))font='Verdana';else if(/arial|helvetica|liberation ?sans|segoe|dejavu ?sans/i.test(nm))font='Arial'}}catch(e){}
  return{font,bold,italic}}
const hex2=v=>('0'+Math.round(v).toString(16)).slice(-2);
async function objectify(p){
  if(p.kind!=='pdf'||p.objMode||p.objTried)return;p.objTried=true;
  const r=await getTC(p);const pg=r.pg;const rot=(pg.rotate+p.rot)%360,s=2;
  const vp1=pg.getViewport({scale:1,rotation:rot}),vps=pg.getViewport({scale:s,rotation:rot});
  const mk=()=>{const c=document.createElement('canvas');c.width=Math.ceil(vps.width);c.height=Math.ceil(vps.height);return c};
  const N=mk(),A=mk();await pg.render({canvasContext:N.getContext('2d'),viewport:vps}).promise;
  const ax=A.getContext('2d');const un=filterCtx(ax,true,false);try{await pg.render({canvasContext:ax,viewport:vps}).promise}finally{un()}
  const nd=N.getContext('2d').getImageData(0,0,N.width,N.height).data,ad=ax.getImageData(0,0,A.width,A.height).data,CW=N.width,CH=N.height;
  const ox=cx0(p),oy=cy0(p),auto=[];
  /* yazı satırları */
  const its=r.items.filter(it=>it.str&&it.transform).map(it=>{const b=boxFor(it,0,it.str.length,vp1);const [, , c,d,e,f]=it.transform;const [bx,by]=vp1.convertToViewportPoint(e,f);return{it,b,bx,by,fs:Math.hypot(c,d)||b.h/1.14}})
    .filter(o=>o.b.w>0.5&&o.b.h>0.5).sort((a,b)=>a.by-b.by||a.bx-b.bx);
  const lines=[];
  for(const o of its){const L=lines.find(l=>Math.abs(l.by-o.by)<o.fs*0.35&&Math.abs(l.fs-o.fs)<o.fs*0.45&&o.b.x-l.x2<o.fs*1.6&&o.b.x>l.x1-o.fs*0.5);
    if(L){L.items.push(o);L.x2=Math.max(L.x2,o.b.x+o.b.w)}else lines.push({by:o.by,fs:o.fs,items:[o],x1:o.b.x,x2:o.b.x+o.b.w})}
  for(const L of lines){L.items.sort((a,b)=>a.b.x-b.b.x);let text='',end=null;
    for(const o of L.items){if(end!=null&&o.b.x-end>o.fs*0.12&&!/\s$/.test(text)&&!/^\s/.test(o.it.str))text+=' ';text+=o.it.str;end=o.b.x+o.b.w}
    text=text.replace(/\s+$/,'').replace(/^\s+/,'');if(!text)continue;
    const x1=Math.min(...L.items.map(o=>o.b.x)),y1=Math.min(...L.items.map(o=>o.b.y)),x2=Math.max(...L.items.map(o=>o.b.x+o.b.w)),y2=Math.max(...L.items.map(o=>o.b.y+o.b.h));
    /* görünürlük ve renk: yazılı ve yazısız çizim arasındaki fark */
    let best=0,col=[0,0,0];const X1=Math.max(0,Math.floor(x1*s)),X2=Math.min(CW,Math.ceil(x2*s)),Y1=Math.max(0,Math.floor(y1*s)),Y2=Math.min(CH,Math.ceil(y2*s));const step=(X2-X1)*(Y2-Y1)>60000?2:1;
    for(let y=Y1;y<Y2;y+=step)for(let x=X1;x<X2;x+=step){const k=(y*CW+x)*4;const d=Math.abs(nd[k]-ad[k])+Math.abs(nd[k+1]-ad[k+1])+Math.abs(nd[k+2]-ad[k+2]);if(d>best){best=d;col=[nd[k],nd[k+1],nd[k+2]]}}
    if(best<60)continue;
    const color=Math.max(...col)<90?'#000000':'#'+col.map(hex2).join('');
    const g=fontGuess(r,L.items[0].it);const w=x2-x1+2.5,h=y2-y1+2;
    auto.push({id:nid('a'),type:'text',x:x1-0.5-ox,y:y1-1-oy,w,h,minW:w,minH:h,text,size:Math.round(Math.max(4,(y2-y1)/1.14)*10)/10,color,bold:g.bold,italic:g.italic,underline:false,font:g.font,align:'left',bg:null,lineKey:'o'+auto.length,auto:true});
  }
  /* resimler: işlem listesinden konumları bul, yazısız çizimden kes */
  try{const ops=await pg.getOperatorList();const O=pdfjsLib.OPS;const IMG=new Set([O.paintImageXObject,O.paintJpegXObject,O.paintInlineImageXObject].filter(v=>v!=null));
    let ctm=[1,0,0,1,0,0];const stack=[];const boxes=[];
    for(let i=0;i<ops.fnArray.length;i++){const fn=ops.fnArray[i],a=ops.argsArray[i];
      if(fn===O.save)stack.push(ctm);else if(fn===O.restore)ctm=stack.pop()||[1,0,0,1,0,0];else if(fn===O.transform)ctm=mmul(ctm,a);
      else if(fn===O.paintFormXObjectBegin){stack.push(ctm);if(a&&a[0]&&a[0].length===6)ctm=mmul(ctm,a[0])}else if(fn===O.paintFormXObjectEnd)ctm=stack.pop()||[1,0,0,1,0,0];
      else if(IMG.has(fn)){const pts=[[0,0],[1,0],[0,1],[1,1]].map(([u,v])=>vp1.convertToViewportPoint(ctm[0]*u+ctm[2]*v+ctm[4],ctm[1]*u+ctm[3]*v+ctm[5]));
        const xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1]);const bx=Math.max(0,Math.min(...xs)),by=Math.max(0,Math.min(...ys)),bx2=Math.min(vp1.width,Math.max(...xs)),by2=Math.min(vp1.height,Math.max(...ys));
        if(bx2-bx>4&&by2-by>4)boxes.push({x:bx,y:by,w:bx2-bx,h:by2-by})}}
    for(const b of boxes){if(boxes.some(o=>o!==b&&o.x<=b.x&&o.y<=b.y&&o.x+o.w>=b.x+b.w&&o.y+o.h>=b.y+b.h&&(o.w*o.h>b.w*b.h)))continue;
      const c=document.createElement('canvas');c.width=Math.max(1,Math.round(b.w*s));c.height=Math.max(1,Math.round(b.h*s));c.getContext('2d').drawImage(A,-b.x*s,-b.y*s);
      const url=URL.createObjectURL(await canvasBlob(c,'image/png'));await loadImg(url);
      auto.unshift({id:nid('a'),type:'img',x:b.x-ox,y:b.y-oy,w:b.w,h:b.h,src:url,auto:true})}}
  catch(e){console.warn('resim konumları alınamadı',e)}
  N.width=N.height=A.width=A.height=0;
  if(!S.pages.includes(p)||!S.objAuto)return;
  p.anns=auto.concat(p.anns);p.objMode=true;p.objSig=sigOf(auto);
  const e=E[p.id];if(e){e.rk=0;if(visible.has(p.id))renderBase(p);renderOv(p);const h=e.wrap.querySelector('.pghead');if(h)h.innerHTML=pageHeadHTML(p,S.pages.indexOf(p))}
  const tc=$(`.th[data-pid="${p.id}"] canvas`);if(tc)renderThumb(p,tc);
  if(S.sel&&S.sel.pageId===p.id)updSelUI();
}
const sigOf=l=>JSON.stringify(l.map(a=>{const c=Object.assign({},a);delete c.id;delete c.lock;return c}));
function objChanged(p){if(!p.objMode)return false;return sigOf(p.anns.filter(a=>a.auto))!==p.objSig}
const OBJQ=[];let objBusy=false;
function queueObj(pages){if(!S.objAuto)return;for(const p of pages)if(p.kind==='pdf'&&!p.objMode&&!p.objTried&&!OBJQ.includes(p))OBJQ.push(p);runObjQ()}
async function runObjQ(){if(objBusy)return;objBusy=true;
  try{while(OBJQ.length){let i=OBJQ.indexOf(S.pages[S.cur]);if(i<0)i=0;const p=OBJQ.splice(i,1)[0];if(!S.pages.includes(p)||!S.objAuto)continue;
      S.objMsg=`Yazı ve resimler ayrıştırılıyor… ${OBJQ.length+1} sayfa kaldı`;updStatus();
      try{await objectify(p)}catch(e){console.warn('nesne modu',e)}await new Promise(r=>setTimeout(r,15))}}
  finally{objBusy=false;S.objMsg='';updStatus()}}
function revertObj(p){if(!p.objMode)return;pushUndo();p.anns=p.anns.filter(a=>!a.auto);p.objMode=false;p.objSig=null;keepScroll(buildViewer);toast('Sayfa orijinal görünümüne döndü. Tekrar nesnelere ayırmak için Sayfa → Nesneler.',5000)}
function updObjBtn(){$('#objBtn').setAttribute('aria-pressed',String(!!S.objAuto))}
$('#objBtn').onclick=()=>{S.objAuto=!S.objAuto;updObjBtn();lsSet('nusmac.objAuto',S.objAuto);
  if(S.objAuto){S.pages.forEach(p=>{if(p.kind==='pdf'&&!p.objMode)p.objTried=false});queueObj(S.pages);toast('Nesne modu açık: PDF yazıları ve resimleri ayrı ayrı düzenlenebilir.',4000)}
  else{OBJQ.length=0;const ps=S.pages.filter(p=>p.objMode&&!objChanged(p)&&!p.anns.some(a=>!a.auto));
    if(ps.length){pushUndo();ps.forEach(p=>{p.anns=p.anns.filter(a=>!a.auto);p.objMode=false;p.objSig=null});keepScroll(buildViewer)}
    toast(ps.length?'Nesne modu kapandı; değiştirilmemiş sayfalar orijinal görünüme döndü.':'Nesne modu kapandı. Yeni açılan PDF’ler ayrıştırılmayacak.',5000)}};

