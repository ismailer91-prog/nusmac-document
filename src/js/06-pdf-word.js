/* ---------- PDF text → Word ---------- */
async function pdfToWord(){
  const pp=S.pages.filter(p=>p.kind==='pdf');
  if(!pp.length){toast('Aktarılacak PDF sayfası yok. Taranmış (resim) sayfalarda seçilebilir metin bulunmaz.',6000);return}
  busy('Metin çıkarılıyor…');let html='',chars=0;
  try{
    for(let n=0;n<pp.length;n++){
      const {items}=await getTC(pp[n]);const lines=[];
      for(const it of items){const [a,b,c,d,e,f]=it.transform;const h=Math.hypot(c,d)||10;let l=lines.find(l=>Math.abs(l.y-f)<h*0.5);if(!l){l={y:f,h,items:[]};lines.push(l)}l.items.push({x:e,w:it.width,s:it.str,h})}
      lines.sort((a,b)=>b.y-a.y);
      const txt=lines.map(l=>{l.items.sort((a,b)=>a.x-b.x);let s='',end=null;for(const it of l.items){if(end!=null&&it.x-end>it.h*0.15&&!s.endsWith(' ')&&!it.s.startsWith(' '))s+=' ';s+=it.s;end=it.x+it.w}const x0=l.items[0].x;return{t:s.replace(/\s+/g,' ').trim(),y:l.y,h:l.h,x0,x1:end}}).filter(l=>l.t);
      const maxR=Math.max(...txt.map(l=>l.x1),1),minL=Math.min(...txt.map(l=>l.x0),0);
      let para=[];const flush=()=>{if(para.length){html+='<p>'+esc(para.join(' '))+'</p>';para=[]}};
      txt.forEach((l,i)=>{chars+=l.t.length;para.push(l.t);const nx=txt[i+1];const short=l.x1<minL+(maxR-minL)*0.7;const gap=nx?(l.y-nx.y)>l.h*1.9:true;if(short||gap)flush()});flush();
      if(n<pp.length-1)html+='<hr class="pbreak">';
    }
  }catch(e){busy(false);toast('Metin çıkarılamadı: '+(e.message||e));return}
  busy(false);
  if(!chars){toast('Bu PDF’te seçilebilir metin bulunamadı (büyük olasılıkla taranmış belge).',6000);return}
  const p=addTextPageAt(html,'PDF metni');
  toast(`PDF’teki yazı, düzenlenebilir yazı sayfası olarak eklendi (sayfa ${S.pages.indexOf(p)+1}). Biçim sadeleştirilmiştir.`,6500);
}

