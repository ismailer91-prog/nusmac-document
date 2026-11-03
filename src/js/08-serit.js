/* ---------- ribbon ---------- */
function showTab(t){$$('.rtabs [data-rt]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.rt===t)));$$('#ribbon [data-rp]').forEach(p=>p.hidden=p.dataset.rp!==t)}
$$('.rtabs [data-rt]').forEach(b=>b.onclick=()=>showTab(b.dataset.rt));
$$('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
$('#swatches').addEventListener('click',e=>{const b=e.target.closest('[data-color]');if(!b)return;S.color=b.dataset.color;if(selAnn())applyProp('color',S.color);$$('#swatches .sw').forEach(x=>x.setAttribute('aria-pressed',x===b))});
$('#lwSel').onchange=e=>{S.lw=+e.target.value;applyProp('lw',S.lw)};
$('#pfSel').innerHTML=Object.keys(FONTS).map(f=>`<option>${f}</option>`).join('');
$('#ribbon').addEventListener('pointerdown',e=>{
  const b=e.target.closest('button,label.lb,label.sb');if(b&&!b.closest('.search'))e.preventDefault();
  if(!inTxt()&&e.target.closest('button,select,input[type=color]'))flushEdit();
});
const inTxt=()=>{const a=document.activeElement;return !!(a&&a.classList&&a.classList.contains('tbody'))};
const useTxt=()=>S.ctx==='txt'&&S.txt&&document.contains(S.txt);
const annT=()=>{const s=selAnn();return s&&s.a.type==='text'?s:null};
$('#delBtn').onclick=deleteSel;
$('#undoBtn').onclick=()=>{if(inTxt()){document.execCommand('undo');textChanged(document.activeElement)}else undo()};
$('#redoBtn').onclick=()=>{if(inTxt()){document.execCommand('redo');textChanged(document.activeElement)}else redo()};
$('#zin').onclick=()=>setK(S.k*1.2);$('#zout').onclick=()=>setK(S.k/1.2);$('#zfit').onclick=fitWidth;
$('#sideBtn').onclick=()=>$('#thumbs').classList.toggle('show');

/* ---------- formatting (yazı sayfası veya metin kutusu) ---------- */
function restoreTxt(){const b=S.txt;if(!b||!document.contains(b))return false;b.focus({preventScroll:true});if(S.tRange&&b.contains(S.tRange.startContainer)){const s=getSelection();s.removeAllRanges();s.addRange(S.tRange)}return true}
function needTxt(){toast('Bu düğme yazı sayfalarında çalışır. Önce bir yazı sayfasının içine tıklayın (Ekle → Yazı sayfası ile yenisini ekleyebilirsiniz).',5500)}
function tcmd(c,v=null){if(!restoreTxt()){needTxt();return}document.execCommand(c,false,v);textChanged(S.txt);syncFmtUI()}
function txtSize(pt){if(!restoreTxt()){needTxt();return}const b=S.txt;S.lastPt=pt;const sel=getSelection();
  if(sel.rangeCount&&sel.getRangeAt(0).collapsed){const r=sel.getRangeAt(0);const sp=document.createElement('span');sp.style.fontSize=pt+'pt';const t=document.createTextNode('\u200B');sp.append(t);r.insertNode(sp);
    const nr=document.createRange();nr.setStart(t,1);nr.collapse(true);sel.removeAllRanges();sel.addRange(nr);S.tRange=nr.cloneRange();textChanged(b);return}
  document.execCommand('fontSize',false,'7');
  b.querySelectorAll('font[size="7"]').forEach(f=>{const s=document.createElement('span');s.style.fontSize=pt+'pt';s.innerHTML=f.innerHTML;f.replaceWith(s)});
  b.querySelectorAll('span').forEach(s=>{if(/xxx-large|-webkit-xxx-large/.test(s.style.fontSize))s.style.fontSize=pt+'pt'});textChanged(b)}
function fmtToggle(cmd,prop){if(useTxt()){tcmd(cmd);return}const t=annT();if(t){applyProp(prop,!t.a[prop]);updSelUI();return}S[prop]=!S[prop];updSelUI()}
$('#boldBtn').onclick=()=>fmtToggle('bold','bold');$('#italBtn').onclick=()=>fmtToggle('italic','italic');$('#undBtn').onclick=()=>fmtToggle('underline','underline');
$('#strBtn').onclick=()=>useTxt()?tcmd('strikeThrough'):needTxt();
$('#pfSel').onchange=e=>{const v=e.target.value;if(useTxt())tcmd('fontName',v);else if(annT())applyProp('font',v);else S.font=v};
$('#fsSel').onchange=e=>{const v=+e.target.value;if(useTxt())txtSize(v);else if(annT())applyProp('size',v);else S.fs=v};
$('#fColor').onchange=e=>{const v=e.target.value;if(useTxt())tcmd('foreColor',v);else if(annT())applyProp('color',v);else{S.color=v;updSelUI()}};
[['alL','justifyLeft','left'],['alC','justifyCenter','center'],['alR','justifyRight','right'],['alJ','justifyFull','left']].forEach(([id,c,a])=>$('#'+id).onclick=()=>{if(useTxt())tcmd(c);else if(annT()){applyProp('align',a);updSelUI()}else{S.align=a;updSelUI()}});
[['ulBtn','insertUnorderedList'],['olBtn','insertOrderedList'],['outBtn','outdent'],['indBtn','indent'],['clrBtn','removeFormat']].forEach(([id,c])=>$('#'+id).onclick=()=>useTxt()?tcmd(c):needTxt());
$('#fBlock').onchange=e=>{if(useTxt())tcmd('formatBlock','<'+e.target.value+'>');else{needTxt();e.target.value='p'}};
$('#tblBtn').onclick=()=>{if(!useTxt())return needTxt();let r='';for(let i=0;i<3;i++)r+='<tr>'+'<td><br></td>'.repeat(3)+'</tr>';tcmd('insertHTML',`<table style="border-collapse:collapse;width:100%"><tbody>${r}</tbody></table><p><br></p>`)};
$('#brkBtn').onclick=()=>useTxt()?tcmd('insertHTML','<hr class="pbreak"><p><br></p>'):needTxt();
function syncFmtUI(){
  const q=c=>{try{return document.queryCommandState(c)}catch(e){return false}};
  [['boldBtn','bold'],['italBtn','italic'],['undBtn','underline'],['strBtn','strikeThrough']].forEach(([id,c])=>$('#'+id).setAttribute('aria-pressed',String(q(c))));
  [['alL','justifyLeft'],['alC','justifyCenter'],['alR','justifyRight'],['alJ','justifyFull']].forEach(([id,c])=>$('#'+id).setAttribute('aria-pressed',String(q(c))));
  try{const f=(document.queryCommandValue('fontName')||'').replace(/["']/g,'').split(',')[0].trim().toLowerCase();const o=[...$('#pfSel').options].find(o=>o.value.toLowerCase()===f);if(o)$('#pfSel').value=o.value}catch(e){}
  const n=S.tRange&&S.tRange.startContainer;const ex=n&&(n.nodeType===1?n:n.parentElement);
  if(ex&&S.txt&&S.txt.contains(ex)){setFsSel(Math.round(parseFloat(getComputedStyle(ex).fontSize)*0.75*2)/2);const b=ex.closest('h1,h2,h3,p');$('#fBlock').value=b&&S.txt.contains(b)?b.tagName.toLowerCase():'p'}
}
document.addEventListener('selectionchange',()=>{const s=getSelection();if(!s.rangeCount)return;const n=s.anchorNode;const e=n&&(n.nodeType===1?n:n.parentElement);const b=e&&e.closest&&e.closest('.tbody');
  if(b){S.txt=b;S.tRange=s.getRangeAt(0).cloneRange();if(S.ctx!=='txt'){S.ctx='txt';if(S.sel)setSel(null)}const p=pageOf(b);if(p){const i=S.pages.indexOf(p);if(i>=0&&i!==S.cur){S.cur=i;updStatus();$$('.th').forEach((t,j)=>t.classList.toggle('cur',j===i))}}syncFmtUI()}});

/* ---------- page buttons ---------- */
function curPage(fn){const p=S.pages[S.cur];if(!p){toast('Belgede sayfa yok.');return}fn(p)}
$('#rotL').onclick=()=>curPage(p=>pageAct(p,'rl'));$('#rotR').onclick=()=>curPage(p=>pageAct(p,'rr'));
$('#editImg').onclick=()=>curPage(p=>openStudio(p));$('#delPage').onclick=()=>curPage(p=>pageAct(p,'del'));
$('#pdf2txt').onclick=()=>pdfToWord();$('#newImg').onclick=()=>openStudio(null);
$('#addTxt').onclick=()=>addTextPageAt('<p><br></p>','Yazı sayfası');$('#emptyTxt').onclick=()=>addTextPageAt('<p><br></p>','Yazı sayfası');
$('#blankBtn').onclick=()=>{clearSample();pushUndo();const c=document.createElement('canvas');c.width=10;c.height=14;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,10,14);
  const at=S.pages.length?S.cur+1:0;addPage({id:nid('p'),kind:'img',img:c,w:595.28,h:841.89,rot:0,anns:[],name:'Boş sayfa',nat:2.5},at);buildViewer();if(S.pages.length===1)fitWidth();scrollToPage(at,false)};

/* ---------- keyboard ---------- */
document.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;
  if(mod&&k==='s'){e.preventDefault();if($('#studio').hidden)openSave();return}
  if(mod&&k==='h'&&$('#studio').hidden){e.preventDefault();openFind();return}
  if(!$('#studio').hidden||!$('#sigModal').hidden||!$('#saveModal').hidden)return;const t=e.target;if(t.isContentEditable||/INPUT|SELECT|TEXTAREA/.test(t.tagName))return;
  if(mod&&k==='z'){e.preventDefault();e.shiftKey?redo():undo();return}
  if(mod&&k==='y'){e.preventDefault();redo();return}
  if(mod&&k==='f'){e.preventDefault();$('#q').focus();return}
  if(mod&&k==='h'){e.preventDefault();openFind();return}
  if((e.key==='Delete'||e.key==='Backspace')&&S.sel){e.preventDefault();deleteSel();return}
  if(e.key==='Escape'){setSel(null);setTool('select');return}
  if(mod||e.altKey)return;
  const m={v:'select',t:'text',e:'edit',h:'hl',p:'pen',r:'rect',a:'arrow',w:'white',c:'crop',k:'cut',l:'lasso',g:'grab'};if(m[k])setTool(m[k]);
});

