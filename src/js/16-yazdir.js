/* ---------- yazdır ----------
   Her sayfa (filigran ve sayfa numarasıyla) resim olarak #printArea'ya konur, sonra sistemin yazdırma penceresi açılır.
   Yazdırma CSS'i (styles.css, @media print) yalnız #printArea'yı gösterir; her sayfa kâğıda sığdırılır. */
async function printDoc(){
  flushEdit();syncAll();
  if(!S.pages.length){toast('Yazdırılacak sayfa yok. Önce bir dosya açın.');return}
  const box=$('#printArea');box.innerHTML='';let ok=false;
  try{
    let n=0,num=0;
    for(const p of S.pages){busy(`Yazdırma hazırlanıyor… ${++n}/${S.pages.length}`);await tick();
      for(const c of await pageCanvases(p)){decorate(c,p.kind==='text'?595.28:dw(p),++num);
        const im=new Image();im.alt='';im.src=URL.createObjectURL(await canvasBlob(c,'image/png'));await im.decode();
        const d=el('div','prpage');d.append(im);box.append(d);c.width=c.height=0}}
    ok=true;
  }catch(e){console.error(e);toast('Yazdırma hazırlanamadı: '+(e.message||e),6000)}
  finally{busy(false)}
  if(ok){await tick();window.print()}
  setTimeout(()=>{box.querySelectorAll('img').forEach(i=>URL.revokeObjectURL(i.src));box.innerHTML=''},500);
}
$('#printBtn').onclick=printDoc;
