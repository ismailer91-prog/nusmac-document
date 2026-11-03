/* =====================================================================
   Ek araçlar
   - Netcad'den: mesafe / alan / çoklu çizgi / nokta (koordinat) ölçümü, sayfa ölçeği (1:1000 …), imleç koordinatı
   - Photoshop'tan: renk seçici, yatay/dikey çevir, gri ton, siyah-beyaz, negatif, parlaklık/kontrast
   - Word'den: yazıyı büyüt/küçült, BÜYÜK/küçük harf, sembol ekle
   - Yazı tanıma (OCR, Tesseract): resimdeki/taranmış sayfadaki yazıyı okur
   ===================================================================== */

/* ---------- ölçü: birimler ve etiketler ---------- */
const SVGT=new Set(['ellipse','pline','dim','area','xy']);
const PAPER_MPP=0.0254/72;                       /* kâğıtta 1 pt = 0,3528 mm */
const mppOf=p=>p&&p.ms&&p.ms.mpp?p.ms.mpp:PAPER_MPP;
const isPaper=p=>!(p&&p.ms&&p.ms.mpp);
const nf=(v,d)=>v.toLocaleString('tr-TR',{minimumFractionDigits:d,maximumFractionDigits:d});
function fmtLen(p,pt){const m=pt*mppOf(p);if(isPaper(p))return m<0.1?nf(m*1000,1)+' mm':nf(m*100,1)+' cm';return m>=1000?nf(m/1000,3)+' km':nf(m,2)+' m'}
function fmtArea(p,pt2){const m2=pt2*mppOf(p)**2;if(isPaper(p))return nf(m2*1e4,1)+' cm²';return m2>=10000?nf(m2,1)+' m² ('+nf(m2/1e4,3)+' ha)':nf(m2,2)+' m²'}
function fmtXY(p,x,y){const m=mppOf(p),H=dh(p);if(isPaper(p))return `X ${nf(x*m*100,1)}  Y ${nf((H-y)*m*100,1)} cm`;return `X ${nf(x*m,2)}  Y ${nf((H-y)*m,2)} m`}
function plen(pts,closed){let s=0;for(let i=1;i<pts.length;i++)s+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);if(closed&&pts.length>2){const a=pts[0],b=pts[pts.length-1];s+=Math.hypot(a[0]-b[0],a[1]-b[1])}return s}
function parea(pts){let s=0;for(let i=0;i<pts.length;i++){const [x1,y1]=pts[i],[x2,y2]=pts[(i+1)%pts.length];s+=x1*y2-x2*y1}return Math.abs(s)/2}
function pcenter(pts){let x=0,y=0;pts.forEach(q=>{x+=q[0];y+=q[1]});return[x/pts.length,y/pts.length]}
function measLabel(p,a){
  if(a.type==='dim')return fmtLen(p,Math.hypot(a.x2-a.x1,a.y2-a.y1));
  if(a.type==='pline')return fmtLen(p,plen(a.pts,false));
  if(a.type==='area')return 'Alan: '+fmtArea(p,parea(a.pts))+'\nÇevre: '+fmtLen(p,plen(a.pts,true));
  if(a.type==='xy')return fmtXY(p,a.x,a.y);
  return '';
}
function updMeasLabels(p){for(const a of p.anns)if(a.type==='dim'||a.type==='pline'||a.type==='area'||a.type==='xy')a.lbl=measLabel(p,a)}
const LBL_PT=9;
function labelPos(a){
  if(a.type==='dim'){const mx=(a.x1+a.x2)/2,my=(a.y1+a.y2)/2;return[mx,my-LBL_PT*0.9]}
  if(a.type==='area')return pcenter(a.pts);
  if(a.type==='pline'){const q=a.pts[a.pts.length-1];return[q[0]+4,q[1]-LBL_PT*0.8]}
  if(a.type==='xy')return[a.x+6,a.y-6];
  return null;
}
function dimTicks(a){const dx=a.x2-a.x1,dy=a.y2-a.y1,L=Math.hypot(dx,dy)||1,nx=-dy/L*4,ny=dx/L*4;return[[a.x1+nx,a.y1+ny,a.x1-nx,a.y1-ny],[a.x2+nx,a.y2+ny,a.x2-nx,a.y2-ny]]}
const mAlpha=(c,o)=>/^#[0-9a-f]{6}$/i.test(c||'')?c+Math.round(o*255).toString(16).padStart(2,'0'):'rgba(31,63,191,'+o+')';

/* ekranda (SVG) */
function measSvg(g,a,k){
  const col=a.color||'#1f3fbf',lw=Math.max(0.8,(a.lw||1.5))*k;const P=([x,y])=>`${(x*k).toFixed(1)} ${(y*k).toFixed(1)}`;let d=null;
  if(a.type==='ellipse'){const e={cx:(a.x+a.w/2)*k,cy:(a.y+a.h/2)*k,rx:Math.max(0.5,a.w/2*k),ry:Math.max(0.5,a.h/2*k)};
    g.append(sv('ellipse',Object.assign({fill:'none',stroke:col,'stroke-width':lw},e)));g.append(sv('ellipse',Object.assign({class:'hitpath',fill:'none',stroke:'transparent','stroke-width':Math.max(14,lw+10)},e)));return}
  if(a.type==='xy'){g.append(sv('path',{d:`M${(a.x-4)*k} ${a.y*k}h${8*k}M${a.x*k} ${(a.y-4)*k}v${8*k}`,stroke:col,'stroke-width':Math.max(1,1.2*k),fill:'none'}));
    g.append(sv('circle',{cx:a.x*k,cy:a.y*k,r:Math.max(6,5*k),class:'hitfill',fill:'transparent'}))}
  if(a.type==='pline'){d='M'+a.pts.map(P).join(' L')}
  if(a.type==='area'){d='M'+a.pts.map(P).join(' L')+' Z';g.append(sv('path',{d,fill:mAlpha(col,0.14),stroke:'none',class:'hitfill'}))}
  if(a.type==='dim'){d=`M${P([a.x1,a.y1])} L${P([a.x2,a.y2])}`;for(const [x1,y1,x2,y2] of dimTicks(a))g.append(sv('path',{d:`M${P([x1,y1])} L${P([x2,y2])}`,stroke:col,'stroke-width':lw,fill:'none'}))}
  if(d){g.append(sv('path',{d,fill:'none',stroke:col,'stroke-width':lw,'stroke-linejoin':'round','stroke-linecap':'round','stroke-dasharray':a.type==='area'?'':''}));
    if(a.type!=='area')g.append(sv('path',{d,class:'hitpath',fill:'none',stroke:'transparent','stroke-width':Math.max(14,lw+10)}));
    else g.append(sv('path',{d,class:'hitpath',fill:'none',stroke:'transparent','stroke-width':Math.max(14,lw+10)}))}
  const lp=labelPos(a);if(lp&&a.lbl){const lines=a.lbl.split('\n'),fs=LBL_PT*k;const t=sv('text',{x:lp[0]*k,y:lp[1]*k-(lines.length-1)*fs*0.6,class:'mlbl','font-size':fs,fill:col,'text-anchor':a.type==='dim'||a.type==='area'?'middle':'start'});
    lines.forEach((ln,i)=>{const s=sv('tspan',{x:lp[0]*k,dy:i?fs*1.2:0});s.textContent=ln;t.append(s)});g.append(t)}
}
/* kaydederken (canvas) */
function drawMeas(ctx,a,s){
  const col=a.color||'#1f3fbf';ctx.strokeStyle=col;ctx.lineWidth=Math.max(0.8,a.lw||1.5)*s;ctx.lineJoin='round';ctx.lineCap='round';
  const path=(pts,close)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x*s,y*s):ctx.moveTo(x*s,y*s));if(close)ctx.closePath()};
  if(a.type==='ellipse'){ctx.beginPath();ctx.ellipse((a.x+a.w/2)*s,(a.y+a.h/2)*s,Math.max(0.5,a.w/2*s),Math.max(0.5,a.h/2*s),0,0,Math.PI*2);ctx.stroke();return}
  if(a.type==='pline'){path(a.pts,false);ctx.stroke()}
  if(a.type==='area'){path(a.pts,true);ctx.fillStyle=mAlpha(col,0.14);ctx.fill();ctx.stroke()}
  if(a.type==='dim'){path([[a.x1,a.y1],[a.x2,a.y2]]);ctx.stroke();for(const [x1,y1,x2,y2] of dimTicks(a)){path([[x1,y1],[x2,y2]]);ctx.stroke()}}
  if(a.type==='xy'){ctx.lineWidth=1.2*s;path([[a.x-4,a.y],[a.x+4,a.y]]);ctx.stroke();path([[a.x,a.y-4],[a.x,a.y+4]]);ctx.stroke()}
  const lp=labelPos(a);if(lp&&a.lbl){const lines=a.lbl.split('\n'),fs=LBL_PT*s;ctx.font=`600 ${fs}px Arial, Helvetica, sans-serif`;ctx.textAlign=a.type==='dim'||a.type==='area'?'center':'left';ctx.textBaseline='alphabetic';
    lines.forEach((ln,i)=>{const x=lp[0]*s,y=lp[1]*s-(lines.length-1)*fs*0.6+i*fs*1.2;ctx.lineWidth=3*s/2;ctx.strokeStyle='#ffffff';ctx.strokeText(ln,x,y);ctx.fillStyle=col;ctx.fillText(ln,x,y)})}
}

/* ---------- çoklu çizgi / alan: tıklayarak nokta koyma ---------- */
function buildClick(p,x,y,tool){
  const B=S.build;if(B&&B.p!==p)finishBuild();
  if(!S.build){const ov=E[p.id].ov;const a={id:nid('a'),type:tool==='area'?'area':'pline',pts:[[x,y],[x,y]],color:S.color,lw:Math.min(S.lw,3)};
    const st={p,a,ov,before:snap(),t:Date.now(),x,y};st.mv=e=>{const [mx,my]=local(e,ov);a.pts[a.pts.length-1]=[mx,my];renderOv(p)};
    ov.addEventListener('pointermove',st.mv);S.build=st;p.anns.push(a);renderOv(p);return}
  const now=Date.now();if(now-S.build.t<350&&Math.hypot(x-S.build.x,y-S.build.y)*S.k<6){finishBuild();return}
  const a=S.build.a;S.build.t=now;S.build.x=x;S.build.y=y;a.pts[a.pts.length-1]=[x,y];a.pts.push([x,y]);renderOv(p);
}
function finishBuild(){
  const st=S.build;if(!st)return;S.build=null;st.ov.removeEventListener('pointermove',st.mv);const {p,a}=st;
  a.pts.pop();a.pts=a.pts.filter((q,i,l)=>!i||Math.hypot(q[0]-l[i-1][0],q[1]-l[i-1][1])>0.5);
  const ok=a.type==='area'?a.pts.length>=3:a.pts.length>=2;
  if(ok){commitUndo(st.before);markThumb(p)}else p.anns=p.anns.filter(q=>q!==a);
  renderOv(p);
}

/* ---------- imleç koordinatı ve ölçek ---------- */
function showXY(ev,p){const ov=E[p.id]&&E[p.id].ov;if(!ov)return;const [x,y]=local(ev,ov);const t=fmtXY(p,x,y);$('#pXY').textContent=t;$('#xyLbl').textContent=t}
function scaleName(p){return isPaper(p)?'kâğıt (1:1)':p.ms.name}
function updScaleLbl(){const p=S.pages[S.cur];$('#scaleLbl').textContent='Ölçek: '+(p?scaleName(p):'–')}
function setScale(pages,ms){pushUndo();pages.forEach(p=>{p.ms=ms;renderOv(p)});updScaleLbl();buildTree();S.dirty=true}
$('#scaleBtn').onclick=()=>{const p=S.pages[S.cur];if(!p){toast('Önce bir dosya açın.');return}
  const n=p.ms&&p.ms.n?String(p.ms.n):'0';const sel=$('#scaleSel');sel.value=[...sel.options].some(o=>o.value===n)?n:(p.ms?'c':'0');$('#scaleCustom').value=p.ms&&p.ms.n||1000;$('#scaleCustomW').hidden=sel.value!=='c';$('#scaleAll').checked=false;$('#scaleModal').hidden=false};
$('#scaleSel').onchange=e=>{$('#scaleCustomW').hidden=e.target.value!=='c'};
$('#scaleCancel').onclick=()=>$('#scaleModal').hidden=true;
$('#scaleGo').onclick=()=>{const v=$('#scaleSel').value;const n=v==='c'?Math.round(+$('#scaleCustom').value):+v;
  if(v==='c'&&!(n>0)){toast('Ölçek için 1’den büyük bir sayı yazın.');return}
  const ms=n?{mpp:PAPER_MPP*n,n,name:'1:'+n.toLocaleString('tr-TR')}:null;$('#scaleModal').hidden=true;
  setScale($('#scaleAll').checked?S.pages:[S.pages[S.cur]],ms);toast(ms?`Ölçek ${ms.name} olarak ayarlandı.`:'Ölçek kâğıt (gerçek boyut) olarak ayarlandı.')};
$('#scaleCalib').onclick=()=>{$('#scaleModal').hidden=true;setTool('calib');toast('Uzunluğunu bildiğiniz iki nokta arasında sürükleyin.',5000)};
function openCalib(p,len){S.calib={p,len};setTool('select');$('#calibAll').checked=false;$('#calibModal').hidden=false;setTimeout(()=>$('#calibLen').select(),30)}
$('#calibCancel').onclick=()=>{$('#calibModal').hidden=true;S.calib=null};
$('#calibGo').onclick=()=>{const c=S.calib;const m=+$('#calibLen').value;if(!c)return;if(!(m>0)){toast('Gerçek uzunluğu metre olarak yazın (ör. 25,5).');return}
  const mpp=m/c.len;const n=Math.round(mpp/PAPER_MPP);$('#calibModal').hidden=true;S.calib=null;
  setScale($('#calibAll').checked?S.pages:[c.p],{mpp,n,name:'≈1:'+n.toLocaleString('tr-TR')});toast(`Ölçek ayarlandı: yaklaşık 1:${n.toLocaleString('tr-TR')}.`)};
$('#calibLen').addEventListener('keydown',e=>{if(e.key==='Enter')$('#calibGo').click()});

/* ---------- renk seçici ---------- */
function pickColor(p,x,y){
  const e=E[p.id];const c=e&&e.canvas;if(!c||!c.width){toast('Sayfa henüz çizilmedi, biraz bekleyip tekrar deneyin.');return}
  const px=Math.max(0,Math.min(c.width-1,Math.round(x/dw(p)*c.width))),py=Math.max(0,Math.min(c.height-1,Math.round(y/dh(p)*c.height)));
  const d=c.getContext('2d').getImageData(px,py,1,1).data;const hex='#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join('');
  S.color=hex;$('#fColor').value=hex;$('#fBar').style.background=hex;$$('#swatches .sw').forEach(x=>x.setAttribute('aria-pressed','false'));
  if(selAnn())applyProp('color',hex);setTool('select');toast('Renk alındı: '+hex+'. Kalem, kutu ve metin bu renkle çizilir.');
}

/* ---------- sayfa resmi ayarları (Photoshop benzeri) ----------
   Sayfanın görüntüsü değişir; PDF sayfası resim sayfasına dönüşür. Geri alınabilmesi için her sürüm IMGV'de saklanır. */
const IMGV=new Map();let ivN=0;
function imgFields(p){return{kind:p.kind,img:p.img,nat:p.nat,src:p.src,index:p.index,objMode:p.objMode,objSig:p.objSig,objTried:p.objTried}}
function storeVer(p){if(p.iv==null)p.iv=++ivN;const k=p.id+':'+p.iv;if(!IMGV.has(k))IMGV.set(k,imgFields(p))}
function applyImgVer(p,iv){const f=IMGV.get(p.id+':'+iv);if(!f)return;Object.assign(p,f);p.iv=iv}
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c}
async function rawCanvas(p){
  if(p.kind==='img'){const [w,h]=srcSize(p.img);const c=mkCanvas(w,h);c.getContext('2d').drawImage(p.img,0,0);return c}
  const pg=await p.src.doc.getPage(p.index+1);const s=Math.min(pageScale(p),4500/Math.max(p.w,p.h));const vp=pg.getViewport({scale:s});
  const c=mkCanvas(vp.width,vp.height),x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
  const un=p.objMode?filterCtx(x,true,true):null;try{await pg.render({canvasContext:x,viewport:vp}).promise}finally{if(un)un()}return c;
}
function adjCanvas(src,op,arg){
  const c=mkCanvas(src.width,src.height),x=c.getContext('2d');
  if(op==='fliph'){x.translate(c.width,0);x.scale(-1,1)}else if(op==='flipv'){x.translate(0,c.height);x.scale(1,-1)}
  else if(op==='gray')x.filter='grayscale(1)';else if(op==='invert')x.filter='invert(1)';
  else if(op==='bc')x.filter=`brightness(${Math.max(0,1+arg.b/100)}) contrast(${Math.max(0,1+arg.c/100)})`;
  x.drawImage(src,0,0);x.filter='none';
  if(op==='bw'){const id=x.getImageData(0,0,c.width,c.height),d=id.data,h=new Array(256).fill(0),N=d.length/4;
    for(let i=0;i<d.length;i+=4){const v=(d[i]*299+d[i+1]*587+d[i+2]*114)/1000|0;d[i]=v;h[v]++}
    let sum=0;for(let i=0;i<256;i++)sum+=i*h[i];let sB=0,wB=0,best=0,th=128;
    for(let t=0;t<256;t++){wB+=h[t];if(!wB)continue;const wF=N-wB;if(!wF)break;sB+=t*h[t];const mB=sB/wB,mF=(sum-sB)/wF,b=wB*wF*(mB-mF)**2;if(b>best){best=b;th=t}}
    for(let i=0;i<d.length;i+=4){const v=d[i]>th?255:0;d[i]=d[i+1]=d[i+2]=v}x.putImageData(id,0,0)}
  return c;
}
const ADJ_MSG={fliph:'Sayfa yatay çevrildi.',flipv:'Sayfa dikey çevrildi.',gray:'Sayfa gri tona çevrildi.',bw:'Sayfa siyah-beyaz yapıldı.',invert:'Renkler ters çevrildi.',bc:'Parlaklık / kontrast uygulandı.'};
async function adjustPage(op,arg){
  const p=S.pages[S.cur];if(!p){toast('Önce bir dosya açın.');return}
  if(p.kind==='text'){toast('Bu ayar resim ve PDF sayfalarında çalışır.');return}
  if(p.rot%180&&(op==='fliph'||op==='flipv'))op=op==='fliph'?'flipv':'fliph';
  busy('Uygulanıyor…');await tick();
  try{storeVer(p);const src=await rawCanvas(p);const c=adjCanvas(src,op,arg);src.width=src.height=0;
    pushUndo();Object.assign(p,{kind:'img',img:c,nat:c.width/p.w,src:undefined,index:undefined,objMode:false,objTried:true});p.iv=++ivN;storeVer(p);
    keepScroll(buildViewer);S.dirty=true;
    toast(ADJ_MSG[op]+((op==='fliph'||op==='flipv')&&p.anns.some(a=>!a.auto)?' Eklediğiniz işaretler çevrilmedi.':''));
  }catch(e){console.error(e);toast('Uygulanamadı: '+(e.message||e),6000)}finally{busy(false)}
}
$$('[data-adj]').forEach(b=>b.onclick=()=>adjustPage(b.dataset.adj));
/* parlaklık / kontrast: sayfada canlı önizleme (CSS filtresi), Uygula ile kalıcı */
function bcPreview(){const p=S.pages[S.cur];const b=+$('#bcB').value,c=+$('#bcC').value;$('#bcBo').textContent=b;$('#bcCo').textContent=c;
  const e=p&&E[p.id];if(e&&e.canvas)e.canvas.style.filter=`brightness(${1+b/100}) contrast(${1+c/100})`}
function bcClear(){const p=S.pages[S.cur];const e=p&&E[p.id];if(e&&e.canvas)e.canvas.style.filter=''}
$('#bcBtn').onclick=()=>{const p=S.pages[S.cur];if(!p){toast('Önce bir dosya açın.');return}if(p.kind==='text'){toast('Bu ayar resim ve PDF sayfalarında çalışır.');return}
  $('#bcB').value=0;$('#bcC').value=0;bcPreview();$('#bcModal').hidden=false};
$('#bcB').oninput=bcPreview;$('#bcC').oninput=bcPreview;
$('#bcReset').onclick=()=>{$('#bcB').value=0;$('#bcC').value=0;bcPreview()};
$('#bcCancel').onclick=()=>{bcClear();$('#bcModal').hidden=true};
$('#bcGo').onclick=()=>{const b=+$('#bcB').value,c=+$('#bcC').value;bcClear();$('#bcModal').hidden=true;if(b||c)adjustPage('bc',{b,c})};

/* ---------- Word komutları ---------- */
const FS_STEPS=[6,7,8,9,10,11,12,14,16,18,20,22,24,28,32,36,40,48,60,72];
function stepFont(d){const cur=+$('#fsSel').value||S.fs;const v=d>0?(FS_STEPS.find(x=>x>cur)||cur+12):([...FS_STEPS].reverse().find(x=>x<cur)||Math.max(4,cur-1));
  setFsSel(v);$('#fsSel').dispatchEvent(new Event('change'))}
$('#fsUp').onclick=()=>stepFont(1);$('#fsDown').onclick=()=>stepFont(-1);
function trCase(t,m){const L='tr-TR';
  if(m==='upper')return t.toLocaleUpperCase(L);if(m==='lower')return t.toLocaleLowerCase(L);
  const lo=t.toLocaleLowerCase(L);
  if(m==='title')return lo.replace(/(^|[\s(“"'«\-/])(\p{L})/gu,(x,a,b)=>a+b.toLocaleUpperCase(L));
  return lo.replace(/(^\s*|[.!?…]\s+)(\p{L})/gu,(x,a,b)=>a+b.toLocaleUpperCase(L));
}
/* seçili aralıktaki yazıyı biçimini bozmadan dönüştür */
function caseRange(r,m){
  const root=r.commonAncestorContainer.nodeType===3?r.commonAncestorContainer.parentNode:r.commonAncestorContainer;
  const nodes=[];const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=tw.nextNode()))if(r.intersectsNode(n))nodes.push(n);
  const parts=nodes.map(n=>{const s=n===r.startContainer?r.startOffset:0,e=n===r.endContainer?r.endOffset:n.length;return{n,s,e,t:n.nodeValue.slice(s,e)}});
  const full=parts.map(q=>q.t).join(''),T=trCase(full,m);let i=0;
  for(const q of parts){const nt=T.length===full.length?T.slice(i,i+q.t.length):trCase(q.t,m);i+=q.t.length;q.n.nodeValue=q.n.nodeValue.slice(0,q.s)+nt+q.n.nodeValue.slice(q.e)}
}
$$('[data-case]').forEach(b=>b.onclick=()=>{closeDD();const m=b.dataset.case;
  if(useTxt()){if(!restoreTxt())return;const sel=getSelection();if(!sel.rangeCount||sel.isCollapsed){toast('Önce değiştirmek istediğiniz yazıyı seçin.');return}
    caseRange(sel.getRangeAt(0),m);textChanged(S.txt);return}
  const t=annT();if(t){pushUndo();t.a.text=trCase(t.a.text,m);renderOv(t.p);buildTree();return}
  toast('Önce bir yazı seçin: yazı sayfasında yazıyı seçin ya da bir metin kutusuna tıklayın.',5000)});
$$('[data-sym]').forEach(b=>{b.addEventListener('pointerdown',e=>e.preventDefault());b.onclick=()=>{const ch=b.dataset.sym;
  if(useTxt()){if(!restoreTxt())return;document.execCommand('insertText',false,ch);textChanged(S.txt);S.tRange=getSelection().rangeCount?getSelection().getRangeAt(0).cloneRange():S.tRange;return}
  const t=annT();if(t){pushUndo();t.a.text=(t.a.text||'')+ch;renderOv(t.p);buildTree();return}
  closeDD();toast('Sembolü koymak için önce yazı sayfasına ya da bir metin kutusuna tıklayın.',5000)}});

/* ---------- yazı tanıma (OCR) ----------
   Tesseract programla birlikte gelir (app/lib/tesseract, Türkçe dil dosyası dahil), internet gerekmez.
   Dosyalar okunup bellekten (blob) verilir; çünkü yerel dosyalarda fetch çalışmaz. */
const OCR={p:null};
async function readAsset(rel){const D=window.desktop;if(D&&D.readAsset){try{const b=await D.readAsset(rel);if(b)return b}catch(e){}}return await readUrl(rel)}
function ocrWorker(){
  if(OCR.p)return OCR.p;
  OCR.p=(async()=>{
    if(!window.Tesseract)throw new Error('Yazı tanıma bileşeni yüklenemedi');
    const log=m=>{if(m.status==='recognizing text')busy(`Yazılar tanınıyor… %${Math.round(m.progress*100)}`)};
    const [ws,cs,lg]=await Promise.all(['lib/tesseract/worker.min.js','lib/tesseract/tesseract-core-simd-lstm.wasm.js','lib/tesseract/lang/tur.traineddata.gz'].map(readAsset));
    if(!(ws&&cs&&lg)){
      if(/^https?:/.test(location.protocol))return Tesseract.createWorker('tur',1,{logger:log});   /* tarayıcı sürümü: dosyalar internetten */
      throw new Error('Yazı tanıma dosyaları bulunamadı. Programı yeniden kurmayı deneyin.');
    }
    const url=(parts,t)=>URL.createObjectURL(new Blob(parts,{type:t}));
    const lang=url([lg],'application/gzip'),core=url([cs],'text/javascript');
    const patch=`(function(){var L=${JSON.stringify({tur:lang})};var f=self.fetch.bind(self);self.fetch=function(u,o){var m=String(u).match(/nusmac-lang\\/(\\w+)\\.traineddata/);return m?f(L[m[1]],o):f(u,o)}})();\n`;
    return Tesseract.createWorker('tur',1,{workerPath:url([patch,ws],'text/javascript'),corePath:core+'#core.js',langPath:'nusmac-lang',workerBlobURL:false,cacheMethod:'none',logger:log});
  })();
  OCR.p.catch(()=>{OCR.p=null});return OCR.p;
}
const ocrKey=p=>JSON.stringify([p.rot,p.clip||null,p.iv||0]);
/* PDF'e görünmez metin katmanı için: tanınan satırlar (örtülenler hariç) */
function ocrWords(p){
  if(!p.ocr||p.ocr.key!==ocrKey(p))return[];
  const cov=p.anns.filter(a=>!a.hid&&(a.type==='white'||a.type==='poly'||(a.type==='text'&&a.bg))).map(annBox);
  return p.ocr.lines.filter(l=>!cov.some(r=>boxHit(l,r))).map(l=>({s:l.text,x:l.x,y:l.y,w:l.w,h:l.h,fam:'Arial',bold:false,italic:false}));
}
async function ocrCurrent(){
  const p=S.pages[S.cur];if(!p){toast('Önce bir resim ya da PDF açın.');return}
  if(p.kind==='text'){toast('Yazı sayfasındaki yazı zaten metin; seçip kopyalayabilirsiniz.');return}
  flushEdit();busy('Yazı tanıma hazırlanıyor…');await tick();
  try{
    const s=Math.max(1.5,Math.min(p.kind==='img'?(p.nat||2):3,3500/Math.max(dw(p),dh(p))));
    const c=await composite(p,s);const w=await ocrWorker();busy('Yazılar tanınıyor…');
    const res=await w.recognize(c,{},{blocks:true});c.width=c.height=0;
    const lines=[],paras=[];let conf=0;
    for(const b of res.data.blocks||[])for(const pa of b.paragraphs||[]){const pl=[];
      for(const l of pa.lines||[]){const t=(l.text||'').replace(/\s+/g,' ').trim();if(!t||l.confidence<25)continue;const bb=l.bbox;
        const L={text:t,x:bb.x0/s,y:bb.y0/s,w:(bb.x1-bb.x0)/s,h:(bb.y1-bb.y0)/s,conf:l.confidence};lines.push(L);pl.push(L);conf+=l.confidence}
      if(pl.length)paras.push(pl)}
    busy(false);
    if(!lines.length){toast('Bu sayfada okunabilir yazı bulunamadı.',5000);return}
    p.ocr={key:ocrKey(p),lines,paras};S.dirty=true;
    $('#ocrInfo').textContent=`Sayfa ${S.cur+1}: ${lines.length} satır tanındı · ortalama güven %${Math.round(conf/lines.length)}`;
    $('#ocrText').value=paras.map(pl=>pl.map(l=>l.text).join('\n')).join('\n\n');
    S.ocrPage=p;$('#ocrModal').hidden=false;setTimeout(()=>$('#ocrText').focus(),30);
  }catch(e){console.error(e);toast('Yazı tanınamadı: '+(e.message||e),6000)}finally{busy(false)}
}
/* kutudaki düzeltmeler: satır sayısı aynıysa satırlara işlenir */
function ocrApplyEdits(p){const tl=$('#ocrText').value.split('\n').filter(x=>x.trim());if(p&&p.ocr&&tl.length===p.ocr.lines.length)p.ocr.lines.forEach((l,i)=>l.text=tl[i].trim())}
$('#ocrBtn').onclick=ocrCurrent;
$('#ocrClose').onclick=()=>{ocrApplyEdits(S.ocrPage);$('#ocrModal').hidden=true};
$('#ocrCopy').onclick=async()=>{try{await navigator.clipboard.writeText($('#ocrText').value);toast('Yazı panoya kopyalandı.')}catch(e){$('#ocrText').select();document.execCommand('copy');toast('Yazı panoya kopyalandı.')}};
$('#ocrToPage').onclick=()=>{const v=$('#ocrText').value.trim();if(!v)return;ocrApplyEdits(S.ocrPage);$('#ocrModal').hidden=true;
  addTextPageAt(v.split(/\n\s*\n/).map(pa=>'<p>'+esc(pa.trim()).replace(/\n/g,'<br>')+'</p>').join(''),'Tanınan yazı');toast('Tanınan yazı yeni bir yazı sayfası olarak eklendi.')};
$('#ocrEdit').onclick=()=>{const p=S.ocrPage;if(!p||!p.ocr)return;ocrApplyEdits(p);$('#ocrModal').hidden=true;pushUndo();
  p.ocr.lines.forEach((l,i)=>{const size=Math.max(5,Math.round(l.h*0.78*10)/10);
    p.anns.push({id:nid('a'),type:'text',x:l.x-1,y:l.y-1,w:l.w+3,h:l.h+2,minW:l.w+3,minH:l.h+2,text:l.text,size,color:'#000000',bold:false,italic:false,underline:false,font:'Arial',align:'left',bg:'#ffffff',lineKey:'ocr'+i})});
  p.ocr=null;renderOv(p);markThumb(p);buildTree();toast('Satırlar düzenlenebilir metin kutusu oldu: çift tıklayıp değiştirin.',5000)};
