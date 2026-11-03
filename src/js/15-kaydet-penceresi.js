/* ---------- kaydet penceresi ---------- */
const fmtVal=()=>{const r=document.querySelector('input[name="svf"]:checked');return r?r.value:'pdf'};
const SVNOTES={pdf:'Tüm sayfalar tek PDF olur. Yazılar (düzenlediğiniz ve eklediğiniz metinler, Word sayfaları dahil) seçilebilir ve aranabilir kalır. Beyaz örtüyle kapattığınız yazılar dosyadan tamamen silinir.',
  docx:'Yazı sayfaları Word’de düzenlenebilir kalır. PDF ve resim sayfaları Word’e resim olarak eklenir.',
  jpg:'Her sayfa ayrı bir resim olur. Birden fazla sayfa varsa hepsi tek bir .zip dosyasında toplanır.',
  png:'Her sayfa ayrı bir resim olur (kayıpsız kalite). Birden fazla sayfa varsa hepsi tek bir .zip dosyasında toplanır.'};
function svUpd(){const f=fmtVal();$('#svSplitW').hidden=f!=='pdf';$('#svFlatW').hidden=f!=='pdf';$('#svNote').textContent=SVNOTES[f]}
function openSave(){
  flushEdit();syncAll();if(!S.pages.length){toast('Kaydedilecek sayfa yok. Önce bir dosya açın.');return}
  const n=S.pages.length,chk=S.pages.filter(p=>S.checked.has(p.id)).length;const k={pdf:0,text:0,img:0};S.pages.forEach(p=>k[p.kind==='pdf'?'pdf':p.kind==='text'?'text':'img']++);
  const parts=[k.pdf&&`${k.pdf} PDF`,k.text&&`${k.text} yazı`,k.img&&`${k.img} resim`].filter(Boolean).join(', ');
  $('#svInfo').textContent=`Belgede ${n} sayfa var (${parts}).`;
  const r=$('#svRange');r.innerHTML=`<option value="all">Tüm sayfalar (${n})</option><option value="cur">Yalnız bulunduğum sayfa (${S.cur+1})</option><option value="sel"${chk?'':' disabled'}>Soldaki listede işaretli sayfalar (${chk})</option>`;
  $('#svName').value=S.baseName?S.baseName+'-duzenlendi':'belge';$('#svSplit').checked=false;$('#svFlat').checked=false;svUpd();$('#saveModal').hidden=false;setTimeout(()=>$('#svGo').focus(),30);
}
$$('input[name="svf"]').forEach(r=>r.onchange=svUpd);
$('#svCancel').onclick=()=>$('#saveModal').hidden=true;
$('#saveModal').addEventListener('pointerdown',e=>{if(e.target.id==='saveModal')$('#saveModal').hidden=true});
$('#svName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#svGo').click()}});
$('#svGo').onclick=async()=>{
  const f=fmtVal(),r=$('#svRange').value;let pages=r==='cur'?[S.pages[S.cur]]:r==='sel'?S.pages.filter(p=>S.checked.has(p.id)):S.pages.slice();pages=pages.filter(Boolean);
  if(!pages.length){toast('Seçili sayfa yok.');return}
  const name=safeName(($('#svName').value.trim()||'belge').replace(/\.(pdf|docx|jpe?g|png|zip)$/i,''));$('#saveModal').hidden=true;syncAll();let ok=false;
  if(f==='pdf')ok=$('#svSplit').checked&&pages.length>1?await exportSplitPdf(pages,name):await exportPdf(pages,name+'.pdf',$('#svFlat').checked);
  else if(f==='docx')ok=await exportDocx(pages,name+'.docx');else ok=await exportImages(pages,f,name);
  if(ok&&r==='all')S.dirty=false;
};
$('#saveBtn').onclick=openSave;
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#saveModal').hidden)$('#saveModal').hidden=true;if(!$('#sigModal').hidden)closeSign()}});

/* ---------- dosyalar ---------- */
$('#fileIn').onchange=e=>{const fs=[...e.target.files];e.target.value='';openFiles(fs)};
$('#fileIn2').onchange=e=>{const fs=[...e.target.files];e.target.value='';openFiles(fs)};
$('#newBtn').onclick=()=>{if(!S.pages.length)return;wDesel();syncAll();pushUndo();S.pages=[];S.sel=null;S.hits=[];S.checked.clear();S.baseName='';S.txt=null;buildViewer();toast('Belge temizlendi. Geri almak için Ctrl+Z.')};
let dragDepth=0;
window.addEventListener('dragenter',e=>{if(e.dataTransfer&&e.dataTransfer.types.includes('Files')){dragDepth++;document.body.classList.add('dropping')}});
window.addEventListener('dragleave',e=>{if(e.dataTransfer&&e.dataTransfer.types.includes('Files')&&--dragDepth<=0){dragDepth=0;document.body.classList.remove('dropping')}});
window.addEventListener('dragover',e=>{if(e.dataTransfer&&e.dataTransfer.types.includes('Files'))e.preventDefault()});
window.addEventListener('drop',e=>{if(!e.dataTransfer||!e.dataTransfer.files.length)return;e.preventDefault();dragDepth=0;document.body.classList.remove('dropping');openFiles([...e.dataTransfer.files])});
window.addEventListener('beforeunload',e=>{if(S.dirty&&S.pages.some(p=>!p.sample)){e.preventDefault();e.returnValue=''}});

