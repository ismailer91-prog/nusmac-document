/* ---------- yazı sayfaları ---------- */
try{document.execCommand('defaultParagraphSeparator',false,'p');document.execCommand('styleWithCSS',false,true)}catch(e){}
const isImgFile=f=>/^image\//.test(f.type||'')||/\.(jpe?g|png|gif|webp|bmp|tiff?)$/i.test(f.name||'');
const TXT_W=606;
function textPage(html,name,extra){return Object.assign({id:nid('p'),kind:'text',html:html||'<p><br></p>',w:595.28,h:841.89,rot:0,anns:[],name:name||'Yazı sayfası'},extra||{})}
function pageOf(n){const pg=n&&n.closest&&n.closest('.pg');return pg?pool.get(pg.dataset.pid):null}
function syncText(p){const e=E[p.id];if(p.kind==='text'&&e&&e.body)p.html=e.body.innerHTML}
function syncAll(){wDesel();S.pages.forEach(syncText)}
function focusText(p,atEnd){const b=E[p.id]&&E[p.id].body;if(!b)return;b.focus({preventScroll:true});const r=document.createRange();r.selectNodeContents(b);r.collapse(!atEnd);const s=getSelection();s.removeAllRanges();s.addRange(r)}
function addTextPageAt(html,name){clearSample();pushUndo();const at=S.pages.length?Math.min(S.cur+1,S.pages.length):0;const p=textPage(html,name);addPage(p,at);buildViewer();if(S.pages.length===1)fitWidth();scrollToPage(at,false);setTimeout(()=>focusText(p,false),60);return p}
function textChanged(b){if(!b)return;S.dirty=true;const p=pageOf(b);if(!p)return;clearTimeout(p._t);
  p._t=setTimeout(()=>{if(S.lastPt)b.querySelectorAll('span').forEach(x=>{if(/xxx-large/.test(x.style.fontSize))x.style.fontSize=S.lastPt+'pt'});p.html=b.innerHTML;const e=E[p.id];if(e)p.h=Math.max(841.89,e.pg.offsetHeight/S.k);const c=$(`.th[data-pid="${p.id}"] canvas`);if(c)renderThumb(p,c);countWords();updStatus()},500)}
function drawTextThumb(p,c,s){const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);const d=document.createElement('div');d.innerHTML=p.html||'';
  const m=94*s/PT2PX,W=c.width-2*m;let y=m;x.fillStyle='#b9bdc8';
  for(const n of d.querySelectorAll('p,h1,h2,h3,li,tr')){const t=(n.textContent||'').trim();const big=/^H/.test(n.tagName);const lh=(big?7:4.6)*s;const per=big?40:95;
    let len=t.length;if(!len){y+=lh;continue}while(len>0&&y<c.height-m){const w=Math.min(1,len/per)*W;const al=getComputedStyle?(n.style.textAlign||''):'';const x0=al==='center'?m+(W-w)/2:al==='right'?m+W-w:m;x.fillRect(x0,y,w,Math.max(1,lh*0.42));y+=lh;len-=per}
    y+=lh*0.6;if(y>c.height-m)break}
  d.querySelectorAll('img').length&&(x.fillStyle='#d6d9e2');}
async function txtImages(files,range){
  if(range){const b=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement;S.txt=b.closest('.tbody');S.tRange=range}
  if(!S.txt||!document.contains(S.txt)){needTxt();return}
  let html='';
  for(const f of files){try{const im=await fileToImage(f);const [iw,ih]=srcSize(im);const s=Math.min(1,1600/Math.max(iw,ih));const c=document.createElement('canvas');c.width=Math.round(iw*s);c.height=Math.round(ih*s);
      const x=c.getContext('2d');const png=/png|gif|webp/i.test(f.type||'')||/\.(png|gif|webp)$/i.test(f.name||'');if(!png){x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height)}x.drawImage(im,0,0,c.width,c.height);
      const w=Math.round(Math.min(TXT_W,iw*0.75));html+=`<img src="${c.toDataURL(png?'image/png':'image/jpeg',0.9)}" style="width:${w}px" alt="">`}
    catch(err){toast(`${f.name}: ${err.message}`)}}
  if(!html)return;restoreTxt();document.execCommand('insertHTML',false,html);textChanged(S.txt);
  toast(files.length>1?'Resimler eklendi. Boyutunu değiştirmek için resme tıklayın.':'Resim eklendi. Boyutunu değiştirmek için resme tıklayın.',4500);
}
$('#imgIn').onchange=async e=>{const fs=[...e.target.files];e.target.value='';if(!fs.length)return;
  if(useTxt()){txtImages(fs);return}
  if(!S.pages.length){openFiles(fs);return}
  const f=fs[0];try{const im=await fileToImage(f);let [iw,ih]=srcSize(im);const s=Math.min(1,1600/Math.max(iw,ih));const c=document.createElement('canvas');c.width=Math.round(iw*s);c.height=Math.round(ih*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
    const png=/png|gif|webp/i.test(f.type);preparePlace(c.toDataURL(png?'image/png':'image/jpeg',0.9),c.width/c.height,Math.min(iw*0.75,260))}catch(err){toast(err.message)}};
const PL=$('#pagesList');
PL.addEventListener('input',e=>{const b=e.target.closest&&e.target.closest('.tbody');if(b)textChanged(b)});
PL.addEventListener('click',e=>{const b=e.target.closest('.tbody');if(b&&e.target.tagName==='IMG')wSelImg(e.target);else wDesel()});
PL.addEventListener('keydown',e=>{if(wSel&&e.target.closest&&e.target.closest('.tbody'))wDesel()});
PL.addEventListener('paste',e=>{const b=e.target.closest&&e.target.closest('.tbody');if(!b)return;const fs=[...(e.clipboardData&&e.clipboardData.files||[])].filter(isImgFile);if(!fs.length)return;e.preventDefault();S.txt=b;
  const s=getSelection();if(s.rangeCount)S.tRange=s.getRangeAt(0).cloneRange();txtImages(fs.map((f,i)=>new File([f],f.name||`resim${i+1}.png`,{type:f.type})))});
PL.addEventListener('dragover',e=>{if(e.target.closest&&e.target.closest('.tbody')&&e.dataTransfer&&[...e.dataTransfer.types].includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy'}});
PL.addEventListener('drop',e=>{const b=e.target.closest&&e.target.closest('.tbody');if(!b)return;const fs=[...(e.dataTransfer&&e.dataTransfer.files||[])];const imgs=fs.filter(isImgFile);if(!imgs.length||imgs.length!==fs.length)return;
  e.preventDefault();e.stopPropagation();dragDepth=0;document.body.classList.remove('dropping');
  let r=null;if(document.caretRangeFromPoint)r=document.caretRangeFromPoint(e.clientX,e.clientY);else if(document.caretPositionFromPoint){const q=document.caretPositionFromPoint(e.clientX,e.clientY);if(q){r=document.createRange();r.setStart(q.offsetNode,q.offset)}}
  if(!r||!b.contains(r.startContainer)){r=document.createRange();r.selectNodeContents(b);r.collapse(false)}txtImages(imgs,r)});
/* seçili resim: boyut, hizalama, silme */
let wSel=null;const wBar=$('#wImgBar'),wHan=$('#wImgHandle');
const zf=()=>S.k/PT2PX;
function wPlace(){if(!wSel||!document.contains(wSel)){wDesel();return}const r=wSel.getBoundingClientRect(),vr=$('#viewer').getBoundingClientRect();
  if(r.bottom<vr.top+4||r.top>vr.bottom-4){wBar.hidden=true;wHan.hidden=true;return}wBar.hidden=false;wHan.hidden=false;
  const bw=wBar.offsetWidth;wBar.style.left=Math.max(vr.left+4,Math.min(r.left,vr.right-bw-4))+'px';wBar.style.top=(r.top-vr.top>50?r.top-46:Math.min(r.bottom+8,vr.bottom-44))+'px';
  wHan.style.left=(r.right-7)+'px';wHan.style.top=(r.bottom-7)+'px'}
function freeImage(img){
  const p=pageOf(img),e=p&&E[p.id];if(!e)return null;const pr=e.pg.getBoundingClientRect(),r=img.getBoundingClientRect();
  pushUndo();const a={id:nid('a'),type:'img',x:(r.left-pr.left)/S.k,y:(r.top-pr.top)/S.k,w:r.width/S.k,h:r.height/S.k,src:img.src};loadImg(a.src);
  const body=img.closest('.tbody');img.remove();textChanged(body);p.html=body.innerHTML;p.anns.push(a);if(S.tool!=='select')setTool('select');
  S.sel={pageId:p.id,aid:a.id};S.ctx='ann';renderOv(p);markThumb(p);updSelUI();return{p,a};
}
PL.addEventListener('pointerdown',e=>{
  const img=e.target.tagName==='IMG'&&e.target.closest('.tbody')?e.target:null;if(!img||e.button>0)return;
  e.preventDefault();const x0=e.clientX,y0=e.clientY;let cur=null,o=null,ox=0,oy=0;
  const mv=m=>{
    if(!cur){if(Math.hypot(m.clientX-x0,m.clientY-y0)<6)return;wDesel();cur=freeImage(img);if(!cur){end();return}o=JSON.parse(JSON.stringify(cur.a));ox=x0;oy=y0;
      toast('Resim serbest konuma alındı; bıraktığınız yerde kalır.',4000)}
    moveAnn(cur.a,o,(m.clientX-ox)/S.k,(m.clientY-oy)/S.k);renderOv(cur.p)};
  const end=()=>{document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',end);if(cur){markThumb(cur.p);S.dirty=true}};
  document.addEventListener('pointermove',mv);document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);
});
function wSelImg(img){if(wSel&&wSel!==img)wSel.classList.remove('wsel');wSel=img;img.classList.add('wsel');wPlace()}
function wDesel(){if(wSel){wSel.classList.remove('wsel');if(!wSel.className)wSel.removeAttribute('class')}wSel=null;wBar.hidden=true;wHan.hidden=true}
$('#viewer').addEventListener('scroll',()=>{if(wSel)wPlace()});window.addEventListener('resize',()=>{if(wSel)wPlace()});
wBar.addEventListener('pointerdown',e=>e.preventDefault());
wBar.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!wSel)return;const body=wSel.closest('.tbody');
  if(b.dataset.w){wSel.style.width=Math.round(TXT_W*b.dataset.w/100)+'px';wSel.removeAttribute('width');wSel.removeAttribute('height')}
  else if(b.dataset.al){const a=b.dataset.al;Object.assign(wSel.style,{display:'block',marginLeft:a==='left'?'0':'auto',marginRight:a==='right'?'0':'auto'})}
  else if(b.dataset.act==='del'){const im=wSel;wDesel();im.remove();textChanged(body);return}
  else if(b.dataset.act==='free'){const im=wSel;wDesel();const r=freeImage(im);if(r)toast('Resim serbest konuma alındı. Artık sayfada istediğiniz yere sürükleyebilir, köşesinden boyutlandırabilirsiniz.',6000);return}
  textChanged(body);requestAnimationFrame(wPlace)});
wHan.addEventListener('pointerdown',e=>{if(!wSel)return;e.preventDefault();e.stopPropagation();wHan.setPointerCapture(e.pointerId);const img=wSel,x0=e.clientX,w0=parseFloat(getComputedStyle(img).width)||img.getBoundingClientRect().width/zf();
  const mv=m=>{const w=Math.max(24,Math.min(TXT_W,w0+(m.clientX-x0)/zf()));img.style.width=Math.round(w)+'px';img.removeAttribute('width');img.removeAttribute('height');wPlace()};
  const up=()=>{wHan.removeEventListener('pointermove',mv);wHan.removeEventListener('pointerup',up);wHan.removeEventListener('pointercancel',up);textChanged(img.closest('.tbody'))};
  wHan.addEventListener('pointermove',mv);wHan.addEventListener('pointerup',up);wHan.addEventListener('pointercancel',up)});

/* ---------- açılır klasörler ---------- */
let ddOpen=null;
function closeDD(){if(ddOpen){ddOpen.menu.hidden=true;if(ddOpen.btn)ddOpen.btn.setAttribute('aria-expanded','false');ddOpen=null}}
function openDDAt(m,x,y,btn){closeDD();m.hidden=false;m.style.left=Math.max(8,Math.min(x,innerWidth-m.offsetWidth-8))+'px';m.style.top=Math.max(8,Math.min(y,innerHeight-m.offsetHeight-8))+'px';if(btn)btn.setAttribute('aria-expanded','true');ddOpen={menu:m,btn}}
$$('[data-menu]').forEach(b=>{b.setAttribute('aria-haspopup','true');b.setAttribute('aria-expanded','false');
  b.onclick=e=>{e.stopPropagation();const m=$('#'+b.dataset.menu);if(ddOpen&&ddOpen.menu===m){closeDD();return}const r=b.getBoundingClientRect();openDDAt(m,r.left,r.bottom+4,b)}});
document.addEventListener('pointerdown',e=>{if(ddOpen&&!e.target.closest('.ddm')&&!e.target.closest('[data-menu]'))closeDD()});
$$('.ddm').forEach(m=>{m.addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault()});m.addEventListener('click',e=>{if(e.target.closest('button'))setTimeout(closeDD,0)})});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDD()});

/* ---------- yazı: yeni biçimler ---------- */
$('#fColor').addEventListener('input',e=>$('#fBar').style.background=e.target.value);
$('#hColor').addEventListener('input',e=>$('#hBar').style.background=e.target.value);
$('#hColor').addEventListener('change',e=>{if(useTxt())tcmd('hiliteColor',e.target.value);else needTxt()});
$('#supBtn').onclick=()=>useTxt()?tcmd('superscript'):needTxt();$('#subBtn').onclick=()=>useTxt()?tcmd('subscript'):needTxt();
$('#lsSel').onchange=e=>{const v=e.target.value;e.target.value='';if(!v)return;if(!restoreTxt())return needTxt();
  const sel=getSelection();if(!sel.rangeCount)return;const r=sel.getRangeAt(0);const B='p,h1,h2,h3,li,div,td';
  let blocks=[...S.txt.querySelectorAll(B)].filter(b=>r.intersectsNode(b)&&!b.querySelector(B));
  if(!blocks.length){const n=r.startContainer;const b=(n.nodeType===1?n:n.parentElement).closest(B);if(b&&S.txt.contains(b))blocks=[b]}
  if(!blocks.length){document.execCommand('formatBlock',false,'<p>');const n=getSelection().getRangeAt(0).startContainer;const b=(n.nodeType===1?n:n.parentElement).closest('p');if(b)blocks=[b]}
  blocks.forEach(b=>b.style.lineHeight=v);textChanged(S.txt);toast(`Satır aralığı ${v.replace('.',',')} yapıldı.`,2500)};
$('#dateBtn').onclick=()=>useTxt()?tcmd('insertText',new Date().toLocaleDateString('tr-TR')):needTxt();

/* ---------- bul ve değiştir (yazı sayfaları) ---------- */
const trLow=s=>s.replace(/İ/g,'i').replace(/I/g,'ı').toLowerCase();
function txtNodes(){const out=[];$$('#pagesList .tbody').forEach(b=>{const tw=document.createTreeWalker(b,NodeFilter.SHOW_TEXT);let n;while((n=tw.nextNode()))out.push(n)});return out}
function findNext(q){
  if(!q)return false;const ql=trLow(q),nodes=txtNodes(),sel=getSelection();let sN=null,sO=0;
  if(sel.rangeCount){const r=sel.getRangeAt(0);sN=r.endContainer;sO=r.endOffset}
  const hit=(n,from)=>{const i=trLow(n.data).indexOf(ql,from);if(i<0)return false;const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+q.length);
    const b=n.parentElement.closest('.tbody');b.focus({preventScroll:true});sel.removeAllRanges();sel.addRange(r);S.txt=b;S.tRange=r.cloneRange();S.ctx='txt';n.parentElement.scrollIntoView({block:'center',behavior:'smooth'});return true};
  let passed=!sN||!nodes.includes(sN);
  for(const n of nodes){if(!passed){if(n===sN){passed=true;if(hit(n,sO))return true}continue}if(hit(n,0))return true}
  for(const n of nodes){if(hit(n,0))return true;if(n===sN)break}
  return false;
}
function openFind(){const has=S.pages.some(p=>p.kind==='text');$('#findPanel').hidden=false;$('#fpInfo').textContent=has?'':'Belgede yazı sayfası yok. PDF içinde aramak için üstteki arama kutusunu kullanın.';
  const s=getSelection();const t=s.rangeCount?String(s):'';if(t&&t.length<60)$('#fpFind').value=t;setTimeout(()=>{$('#fpFind').focus();$('#fpFind').select()},20)}
$('#findBtn').onclick=openFind;$('#fpClose').onclick=()=>$('#findPanel').hidden=true;
$('#fpNext').onclick=()=>{const q=$('#fpFind').value;if(!q)return;$('#fpInfo').textContent=findNext(q)?'':'Bulunamadı.'};
$('#fpFind').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#fpNext').click()}});
$('#fpOne').onclick=()=>{const q=$('#fpFind').value,rep=$('#fpRep').value;if(!q)return;const s=getSelection();
  if(s.rangeCount&&trLow(String(s))===trLow(q)&&s.anchorNode&&s.anchorNode.parentElement&&s.anchorNode.parentElement.closest('.tbody')){const b=s.anchorNode.parentElement.closest('.tbody');document.execCommand('insertText',false,rep);textChanged(b)}
  $('#fpInfo').textContent=findNext(q)?'':'Başka bulunamadı.'};
$('#fpAll').onclick=()=>{const q=$('#fpFind').value,rep=$('#fpRep').value;if(!q)return;const ql=trLow(q);let n=0;const touched=new Set();
  for(const t of txtNodes()){const low=trLow(t.data);if(low.indexOf(ql)<0)continue;let out='',i=0,j;while((j=low.indexOf(ql,i))>=0){out+=t.data.slice(i,j)+rep;i=j+q.length;n++}out+=t.data.slice(i);t.data=out;touched.add(t.parentElement.closest('.tbody'))}
  touched.forEach(b=>textChanged(b));if(n)pushUndo();$('#fpInfo').textContent=n?`${n} yer değiştirildi.`:'Bulunamadı.'};

/* ---------- sayfa numarası, filigran, çoğalt ---------- */
function wmSize(Wpt){const L=Math.max(3,(S.wm&&S.wm.text||'').length);return Math.min(Wpt*0.9/(L*0.62),Wpt*0.2)}
function decorate(c,Wpt,n){const x=c.getContext('2d'),W=c.width,H=c.height,s=W/Wpt;
  if(S.wm&&S.wm.text){x.save();x.globalAlpha=S.wm.op;x.fillStyle=S.wm.color;x.translate(W/2,H/2);x.rotate(-35*Math.PI/180);x.font=`bold ${wmSize(Wpt)*s}px Arial, Helvetica, sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(S.wm.text,0,0);x.restore()}
  if(S.pnum&&n){x.save();x.fillStyle='#333333';x.font=`${10*s}px Arial, Helvetica, sans-serif`;x.textAlign='center';x.textBaseline='alphabetic';x.fillText(String(n),W/2,H-22*s);x.restore()}}
function updPnum(){$('#pnumBtn').setAttribute('aria-pressed',String(!!S.pnum));$('#pnumLbl').textContent='Sayfa numaraları: '+(S.pnum?'açık':'kapalı')}
$('#pnumBtn').onclick=()=>{S.pnum=!S.pnum;S.dirty=true;updPnum();S.pages.forEach(renderOv);toast(S.pnum?'Sayfa numaraları açıldı. Kaydederken her sayfanın altına eklenir.':'Sayfa numaraları kapatıldı.',3500)};
$('#wmBtn').onclick=()=>{if(S.wm){$('#wmText').value=S.wm.text;$('#wmColor').value=S.wm.color;$('#wmOp').value=Math.round(S.wm.op*100)}$('#wmModal').hidden=false;setTimeout(()=>$('#wmText').select(),20)};
$('#wmCancel').onclick=()=>$('#wmModal').hidden=true;
$('#wmOff').onclick=()=>{S.wm=null;$('#wmModal').hidden=true;S.pages.forEach(renderOv);toast('Filigran kaldırıldı.')};
$('#wmGo').onclick=()=>{const t=$('#wmText').value.trim();if(!t){$('#wmOff').click();return}S.wm={text:t,color:$('#wmColor').value,op:+$('#wmOp').value/100};S.dirty=true;$('#wmModal').hidden=true;S.pages.forEach(renderOv);toast('Filigran eklendi. Kaydederken tüm sayfalara işlenir.')};
$('#wmText').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#wmGo').click()}});
function dupPage(p){syncText(p);pushUndo();const c=Object.assign({},p,{id:nid('p'),anns:JSON.parse(JSON.stringify(p.anns)).map(a=>Object.assign(a,{id:nid('a')})),sample:false,_t:null});if(p.clip)c.clip=Object.assign({},p.clip);
  const i=S.pages.indexOf(p);addPage(c,i+1);buildViewer();scrollToPage(i+1,false);toast('Sayfa çoğaltıldı.')}
$('#dupPage').onclick=()=>curPage(dupPage);

