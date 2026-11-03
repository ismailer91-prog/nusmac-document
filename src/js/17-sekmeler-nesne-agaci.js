/* ---------- şerit sekmeleri ---------- */
function setTab(name){
  if(!$(`.rpanel[data-panel="${name}"]`))name='home';
  $$('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===name)));
  $$('.rpanel').forEach(p=>p.hidden=p.dataset.panel!==name);
  closeDD();lsSet('nusmac.tab',name);
}
$$('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$('.tabs').addEventListener('keydown',e=>{
  if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;const tabs=$$('[data-tab]');const i=tabs.findIndex(b=>b.getAttribute('aria-selected')==='true');
  const n=tabs[(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];setTab(n.dataset.tab);n.focus();e.preventDefault()});
setTab(lsGet('nusmac.tab','home'));

/* ---------- vekil düğmeler ----------
   Aynı komut birden fazla yerde (hızlı erişim, Giriş sekmesi, sol panel) durabilir: data-proxy="#asılDüğme".
   Vekil, asıl düğmeye tıklar; asılın etkin/basılı durumu vekile kopyalanır. */
const proxyMirror=new MutationObserver(ms=>ms.forEach(m=>syncProxies(m.target)));
function syncProxies(t){if(!t.id)return;$$(`[data-proxy="#${t.id}"]`).forEach(b=>{b.disabled=!!t.disabled;const ap=t.getAttribute('aria-pressed');if(ap!=null)b.setAttribute('aria-pressed',ap);else b.removeAttribute('aria-pressed')})}
$$('[data-proxy]').forEach(b=>{const t=$(b.dataset.proxy);if(!t){b.hidden=true;return}
  b.addEventListener('click',e=>{e.preventDefault();closeDD();t.click()});
  proxyMirror.observe(t,{attributes:true,attributeFilter:['disabled','aria-pressed']});syncProxies(t)});

/* ---------- sol panel: sayfalar / nesneler ayırıcısı ---------- */
(()=>{const sp=$('#spPages'),bar=$('#sideSplit');const h0=lsGet('nusmac.sideH',null);if(h0)sp.style.flexBasis=h0+'px';
  bar.addEventListener('pointerdown',e=>{e.preventDefault();bar.setPointerCapture(e.pointerId);const y0=e.clientY,b0=sp.getBoundingClientRect().height;
    const mv=ev=>{const max=$('#side').clientHeight-120;const h=Math.max(120,Math.min(max,b0+ev.clientY-y0));sp.style.flexBasis=h+'px'};
    const up=()=>{bar.removeEventListener('pointermove',mv);bar.removeEventListener('pointerup',up);lsSet('nusmac.sideH',Math.round(sp.getBoundingClientRect().height))};
    bar.addEventListener('pointermove',mv);bar.addEventListener('pointerup',up)});
})();

/* ---------- nesne ağacı (Netcad'deki katman yöneticisi gibi) ----------
   Bulunulan sayfadaki işaretler türlerine göre gruplanır. Her öğe: göster/gizle (a.hid), kilit (a.lock: seçilemez, taşınamaz), sil.
   Gizlenen nesne ekranda görünmez ve kaydedilen dosyaya da girmez. */
const TGROUPS=[['text','Yazılar','text'],['img','Resimler ve imzalar','image'],['meas','Ölçüler','ruler'],['draw','Çizimler','pen'],['hl','Vurgular','hl'],['cover','Örtüler','white']];
const tgOf=a=>(a.type==='dim'||a.type==='area'||a.type==='xy')?'meas':a.type==='text'?'text':a.type==='img'?'img':a.type==='hl'?'hl':(a.type==='white'||a.type==='poly')?'cover':'draw';
const treeOpen=lsGet('nusmac.tree',{text:true,img:true,draw:true,hl:true,cover:true});
function annLabel(a){
  if(a.type==='text'){const t=(a.text||'').replace(/\s+/g,' ').trim();return t?(t.length>48?t.slice(0,48)+'…':t):'(boş yazı)'}
  return {img:a.auto?'PDF resmi':'Resim / imza',path:'Kalem çizgisi',rect:'Kutu',arrow:'Ok',hl:'Vurgu',white:'Beyaz örtü',poly:'Serbest kesim',ellipse:'Daire / elips',
    pline:'Çoklu çizgi · '+(a.lbl||''),dim:'Mesafe · '+(a.lbl||''),area:'Alan · '+(a.lbl||'').split('\n')[0].replace(/^Alan: /,''),xy:'Nokta · '+(a.lbl||'')}[a.type]||a.type;
}
function refreshTree(){if(refreshTree.r)return;refreshTree.r=requestAnimationFrame(()=>{refreshTree.r=0;buildTree()})}
function afterAnnChange(p){renderOv(p);markThumb(p);updSelUI();buildTree()}
function showAnn(p,a){const e=E[p.id];if(!e)return;const v=$('#viewer');const top=e.wrap.offsetTop+e.pg.offsetTop+(a.y!=null?a.y:Math.min(a.y1,a.y2)||0)*S.k;
  if(top<v.scrollTop+40||top>v.scrollTop+v.clientHeight-80)v.scrollTo({top:Math.max(0,top-v.clientHeight/3),behavior:'smooth'})}
function buildTree(){
  const box=$('#objTree');if(!box)return;const p=S.pages[S.cur];const sc=box.scrollTop;box.innerHTML='';
  $('#objCount').textContent=p?`Sayfa ${S.cur+1}`:'';
  if(!p){box.innerHTML='<div class="tempty">Belge boş.</div>';return}
  if(!p.anns.length){box.innerHTML='<div class="tempty">Bu sayfada nesne yok. Metin, resim, imza ya da çizim eklediğinizde burada listelenir.</div>';return}
  for(const [g,name,icon] of TGROUPS){
    const items=p.anns.filter(a=>tgOf(a)===g);if(!items.length)continue;
    const vis=items.filter(a=>!a.hid).length;
    const row=el('div','tg');row.setAttribute('role','treeitem');row.setAttribute('aria-expanded',String(treeOpen[g]!==false));
    row.innerHTML=`<button class="tw" title="Aç / kapat" aria-label="${name} aç/kapat"></button><input type="checkbox" title="Hepsini göster / gizle" aria-label="${name}: göster">${ic(icon)}<span class="tn">${name}</span><span class="tc">${items.length}</span>`;
    const cb=row.querySelector('input');cb.checked=vis>0;cb.indeterminate=vis>0&&vis<items.length;
    const toggle=()=>{treeOpen[g]=treeOpen[g]===false;lsSet('nusmac.tree',treeOpen);buildTree()};
    row.querySelector('.tw').onclick=toggle;row.querySelector('.tn').onclick=toggle;
    cb.onchange=()=>{pushUndo();const on=cb.checked;items.forEach(a=>{if(on)delete a.hid;else a.hid=true});if(!on&&S.sel&&items.some(a=>a.id===S.sel.aid))S.sel=null;afterAnnChange(p)};
    box.append(row);
    if(treeOpen[g]===false)continue;
    for(const a of items){
      const it=el('div','ti'+(S.sel&&S.sel.pageId===p.id&&S.sel.aid===a.id?' sel':'')+(a.hid?' off':''));it.setAttribute('role','treeitem');
      it.innerHTML=`<input type="checkbox" ${a.hid?'':'checked'} title="Göster / gizle" aria-label="Göster"><span class="tn" title="${esc(a.type==='text'?a.text||'':annLabel(a))}">${esc(annLabel(a))}</span>${a.auto?'<span class="tauto" title="PDF’ten otomatik ayrıştırıldı">PDF</span>':''}<button class="ib tl" aria-pressed="${!!a.lock}" title="${a.lock?'Kilidi aç':'Kilitle: seçilemez, taşınamaz'}">${ic(a.lock?'lock':'unlock')}</button><button class="ib tdel" title="Sil">${ic('trash')}</button>`;
      it.querySelector('input').onchange=ev=>{pushUndo();if(ev.target.checked)delete a.hid;else{a.hid=true;if(S.sel&&S.sel.aid===a.id)S.sel=null}afterAnnChange(p)};
      it.querySelector('.tl').onclick=()=>{pushUndo();if(a.lock)delete a.lock;else{a.lock=true;if(S.sel&&S.sel.aid===a.id)S.sel=null}afterAnnChange(p)};
      it.querySelector('.tdel').onclick=()=>{pushUndo();p.anns=p.anns.filter(x=>x!==a);if(S.sel&&S.sel.aid===a.id)S.sel=null;afterAnnChange(p)};
      it.addEventListener('click',ev=>{if(ev.target.closest('input,button'))return;showAnn(p,a);if(a.hid||a.lock)return;setTool('select');setSel({pageId:p.id,aid:a.id});buildTree()});
      box.append(it);
    }
  }
  box.scrollTop=sc;
}
$('#treeShowAll').onclick=()=>{const p=S.pages[S.cur];if(!p||!p.anns.some(a=>a.hid||a.lock))return;pushUndo();p.anns.forEach(a=>{delete a.hid;delete a.lock});afterAnnChange(p);toast('Bu sayfadaki tüm nesneler gösterildi ve kilitleri açıldı.')};
