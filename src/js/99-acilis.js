/* ---------- boot ---------- */
const missing=[['pdfjsLib','PDF görüntüleyici'],['PDFLib','PDF kaydedici'],['html2canvas','sayfa çizici'],['UTIF','TIF okuyucu']].filter(([g])=>!window[g]).map(([,n])=>n);
setTool('select');updObjBtn();buildViewer();
/* otomatik testler için (yalnız adres #test ile biterse) */
if(location.hash==='#test')window.__nm={S,pool,E,OBJQ,pushUndo,renderOv,objChanged,nid};
if(window.desktop&&window.desktop.onOpenFile)window.desktop.onOpenFile(f=>openFiles([new File([f.data],f.name)]));
if(missing.length)toast('Bazı bileşenler yüklenemedi: '+missing.join(', ')+'. İnternet bağlantısını kontrol edip sayfayı yenileyin.',8000);
