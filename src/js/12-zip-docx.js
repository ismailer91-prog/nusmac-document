/* ---- zip (no library) ---- */
async function unzip(buf){
  const u8=new Uint8Array(buf),dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);let eo=-1;
  for(let i=u8.length-22;i>=Math.max(0,u8.length-66000);i--){if(dv.getUint32(i,true)===0x06054b50){eo=i;break}}
  if(eo<0)throw new Error('Dosya geçerli bir .docx değil (bozuk olabilir)');
  const n=dv.getUint16(eo+10,true);let p=dv.getUint32(eo+16,true);const files={};const td=new TextDecoder();
  for(let k=0;k<n;k++){
    if(dv.getUint32(p,true)!==0x02014b50)break;
    const method=dv.getUint16(p+10,true),cs=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),el=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),lo=dv.getUint32(p+42,true);
    const name=td.decode(u8.subarray(p+46,p+46+nl));p+=46+nl+el+cl;
    files[name.replace(/^\//,'')]={method,cs,lo};
  }
  const get=async name=>{const e=files[name];if(!e)return null;
    const lnl=dv.getUint16(e.lo+26,true),lel=dv.getUint16(e.lo+28,true);const data=u8.subarray(e.lo+30+lnl+lel,e.lo+30+lnl+lel+e.cs);
    if(e.method===0)return data.slice();
    if(e.method!==8)throw new Error('Desteklenmeyen sıkıştırma');
    if(!window.DecompressionStream)throw new Error('Tarayıcınız çok eski. Chrome veya Edge’in güncel sürümünü kullanın.');
    const s=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));return new Uint8Array(await new Response(s).arrayBuffer())};
  return{files,get,text:async name=>{const b=await get(name);return b?new TextDecoder().decode(b):null}};
}
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
function zipStore(entries,mime){
  const te=new TextEncoder(),parts=[],cd=[];let off=0;
  for(const [name,content] of entries){
    const data=typeof content==='string'?te.encode(content):content,nm=te.encode(name),crc=crc32(data);
    const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,nm.length,true);
    parts.push(h,nm,data);
    const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);
    cd.push(c,nm);off+=30+nm.length+data.length;
  }
  const cdSize=cd.reduce((s,x)=>s+x.byteLength,0);const e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,cdSize,true);e.setUint32(16,off,true);
  return new Blob([...parts,...cd,e],{type:mime});
}
/* ---- docx → html (no library) ---- */
const kids=(e,n)=>e?[...e.children].filter(c=>!n||c.localName===n):[];
const kid=(e,n)=>e?[...e.children].find(c=>c.localName===n)||null:null;
const wv=(e,a='val')=>{if(!e)return null;for(const at of e.attributes)if(at.localName===a)return at.value;return null};
const onOff=e=>e?!['0','false','off','none'].includes(wv(e)||'1'):undefined;
function b64(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)}
function roman(n){const m=[[1000,'m'],[900,'cm'],[500,'d'],[400,'cd'],[100,'c'],[90,'xc'],[50,'l'],[40,'xl'],[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']];let r='';for(const [v,s] of m)while(n>=v){r+=s;n-=v}return r}
function alpha(n){let s='';while(n>0){n--;s=String.fromCharCode(97+n%26)+s;n=Math.floor(n/26)}return s}
function fmtNum(n,f){switch(f){case'lowerLetter':return alpha(n);case'upperLetter':return alpha(n).toUpperCase();case'lowerRoman':return roman(n);case'upperRoman':return roman(n).toUpperCase();case'none':return'';default:return String(n)}}
function fixBullet(t){return(t||'•').replace(/[]/g,c=>({'':'•','':'▪','':'➢','':'❖','':'✓'}[c]))}
async function docxToHtml(buf){
  const z=await unzip(buf);const P=new DOMParser();const xml=async n=>{const t=await z.text(n);return t?P.parseFromString(t,'application/xml'):null};
  const doc=await xml('word/document.xml');if(!doc)throw new Error('Dosya geçerli bir .docx değil');
  const [sty,num,rels,theme]=await Promise.all([xml('word/styles.xml'),xml('word/numbering.xml'),xml('word/_rels/document.xml.rels'),xml('word/theme/theme1.xml')]);
  const relMap={};if(rels)for(const r of rels.documentElement.children)relMap[r.getAttribute('Id')]=r.getAttribute('Target');
  let minor='Calibri',major='Calibri Light';
  if(theme){const f=n=>{const e=theme.getElementsByTagNameNS('*',n)[0];const l=e&&[...e.children].find(c=>c.localName==='latin');return l&&l.getAttribute('typeface')};minor=f('minorFont')||minor;major=f('majorFont')||major}
  const styles={};let defP=null,defR=null;
  if(sty){for(const s of kids(sty.documentElement,'style')){styles[wv(s,'styleId')]={name:(wv(kid(s,'name'))||'').toLowerCase(),based:wv(kid(s,'basedOn')),pPr:kid(s,'pPr'),rPr:kid(s,'rPr'),type:wv(s,'type'),def:wv(s,'default')==='1'}}
    const dd=kid(sty.documentElement,'docDefaults');defP=kid(kid(dd,'pPrDefault'),'pPr');defR=kid(kid(dd,'rPrDefault'),'rPr')}
  const normalId=Object.keys(styles).find(k=>styles[k].type==='paragraph'&&styles[k].def)||'Normal';
  function readR(r,o){if(!r)return o;for(const c of r.children){const n=c.localName;
    if(n==='b')o.b=onOff(c);else if(n==='i')o.i=onOff(c);else if(n==='strike')o.s=onOff(c);else if(n==='caps')o.caps=onOff(c);else if(n==='vanish')o.hide=onOff(c);
    else if(n==='u')o.u=(wv(c)||'single')!=='none';else if(n==='color'){const v=wv(c);if(v&&v!=='auto')o.color='#'+v}
    else if(n==='sz')o.sz=+wv(c)/2;else if(n==='highlight'){const v=wv(c);o.hl=v&&v!=='none'?v:null}else if(n==='shd'){const f=wv(c,'fill');if(f&&f!=='auto'&&!/^0{0,6}$|^FFFFFF$/i.test(f))o.hl='#'+f}
    else if(n==='vertAlign')o.va=wv(c);else if(n==='rFonts'){const a=wv(c,'ascii')||wv(c,'hAnsi');const th=wv(c,'asciiTheme')||wv(c,'hAnsiTheme');if(a)o.font=a;else if(th)o.font=/major/.test(th)?major:minor}}return o}
  function readP(p,o){if(!p)return o;for(const c of p.children){const n=c.localName;
    if(n==='jc')o.jc=wv(c);else if(n==='ind'){const l=wv(c,'left')??wv(c,'start'),f=wv(c,'firstLine'),h=wv(c,'hanging'),r=wv(c,'right')??wv(c,'end');if(l!=null)o.ind=+l/20;if(r!=null)o.indR=+r/20;if(f!=null){o.first=+f/20}if(h!=null)o.first=-h/20}
    else if(n==='spacing'){const b=wv(c,'before'),a=wv(c,'after'),l=wv(c,'line'),lr=wv(c,'lineRule');if(b!=null)o.before=+b/20;if(a!=null)o.after=+a/20;if(l!=null){if(!lr||lr==='auto')o.lh=+l/240;else o.lhPt=+l/20}}
    else if(n==='numPr'){o.numId=wv(kid(c,'numId'));o.ilvl=+(wv(kid(c,'ilvl'))||0)}
    else if(n==='pageBreakBefore')o.pbb=onOff(c);else if(n==='keepNext'){}else if(n==='shd'){const f=wv(c,'fill');if(f&&f!=='auto'&&!/^FFFFFF$/i.test(f))o.bg='#'+f}}return o}
  const chainCache={};
  function styleChain(id){if(!id||!styles[id])return[];const out=[];let s=id,g=0;while(s&&styles[s]&&g++<20){out.unshift(styles[s]);s=styles[s].based}return out}
  function stylePR(id){if(chainCache[id])return chainCache[id];const ch=styleChain(id);const p={},r={};for(const s of ch){readP(s.pPr,p);readR(s.rPr,r);}if(ch.length)p._name=ch[ch.length-1].name;return chainCache[id]={p,r}}
  const baseR=readR(defR,{sz:11,font:minor});const baseP=readP(defP,{});
  // numbering
  const absMap={},numMap={};
  if(num){for(const a of kids(num.documentElement,'abstractNum')){const lv={};for(const l of kids(a,'lvl'))lv[+wv(l,'ilvl')]={fmt:wv(kid(l,'numFmt'))||'decimal',text:wv(kid(l,'lvlText'))||'',start:+(wv(kid(l,'start'))||1),pPr:kid(l,'pPr'),rPr:kid(l,'rPr')};absMap[wv(a,'abstractNumId')]=lv}
    for(const n of kids(num.documentElement,'num')){const ov={};for(const o of kids(n,'lvlOverride')){const so=kid(o,'startOverride');if(so)ov[+wv(o,'ilvl')]=+wv(so)}numMap[wv(n,'numId')]={abs:wv(kid(n,'abstractNumId')),ov}}}
  const counters={};
  function numText(numId,ilvl){const nm=numMap[numId];if(!nm)return null;const lv=absMap[nm.abs];if(!lv||!lv[ilvl])return null;
    const key=nm.abs;const c=counters[key]||(counters[key]={});const L=lv[ilvl];
    c[ilvl]=c[ilvl]==null?(nm.ov[ilvl]??L.start):c[ilvl]+1;for(const k in c)if(+k>ilvl)delete c[k];
    if(L.fmt==='bullet')return{t:fixBullet(L.text),L};
    const t=L.text.replace(/%(\d)/g,(m,d)=>{const i=+d-1;const v=c[i]??(lv[i]?lv[i].start:1);return fmtNum(v,lv[i]?lv[i].fmt:'decimal')});return{t,L}}
  const media={};
  async function imgSrc(rid){const t=relMap[rid];if(!t||/^https?:/i.test(t))return null;const path=t.startsWith('/')?t.slice(1):'word/'+t.replace(/^\.\//,'');
    if(media[path]!==undefined)return media[path];const b=await z.get(path);if(!b)return media[path]=null;
    const ext=(path.split('.').pop()||'').toLowerCase();const mt={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',bmp:'image/bmp',webp:'image/webp',svg:'image/svg+xml'}[ext];
    if(!mt)return media[path]=null;return media[path]=`data:${mt};base64,${b64(b)}`}
  const css=o=>Object.entries(o).filter(([k,v])=>v!=null&&v!=='').map(([k,v])=>`${k}:${v}`).join(';');
  function runCss(r){const d=[];if(r.u)d.push('underline');if(r.s)d.push('line-through');
    return css({'font-weight':r.b?'bold':null,'font-style':r.i?'italic':null,'text-decoration':d.join(' ')||null,color:r.color||null,'font-size':r.sz?r.sz+'pt':null,'font-family':r.font?`'${r.font.replace(/'/g,'')}'`:null,'background-color':r.hl?(r.hl.startsWith('#')?r.hl:({yellow:'#ffff00',green:'#00ff00',cyan:'#00ffff',magenta:'#ff00ff',blue:'#0000ff',red:'#ff0000',darkBlue:'#000080',darkCyan:'#008080',darkGreen:'#008000',darkMagenta:'#800080',darkRed:'#800000',darkYellow:'#808000',darkGray:'#808080',lightGray:'#c0c0c0',black:'#000000',white:'#ffffff'}[r.hl]||null)):null,'text-transform':r.caps?'uppercase':null,'vertical-align':r.va==='superscript'?'super':r.va==='subscript'?'sub':null})}
  async function runsHtml(container,pr,out){
    for(const c of container.children){const n=c.localName;
      if(n==='r'){const rp=Object.assign({},pr,readR(kid(c,'rPr'),{}));const rs=wv(kid(kid(c,'rPr'),'rStyle'));if(rs){Object.assign(rp,stylePR(rs).r,readR(kid(c,'rPr'),{}))}
        if(rp.hide)continue;let h='';
        for(const t of c.children){const tn=t.localName;
          if(tn==='t')h+=esc(t.textContent).replace(/ {2}/g,' &nbsp;');
          else if(tn==='tab')h+='<span style="display:inline-block;width:36pt"></span>';
          else if(tn==='br'){if(wv(t,'type')==='page'){if(h){out.push({h,rp});h=''}out.push({pb:1})}else h+='<br>'}
          else if(tn==='cr')h+='<br>';
          else if(tn==='noBreakHyphen')h+='‑';
          else if(tn==='sym'){const ch=wv(t,'char');if(ch)h+=fixBullet(String.fromCharCode(parseInt(ch,16)))}
          else if(tn==='drawing'||tn==='pict'||tn==='object'){
            const blip=t.getElementsByTagNameNS('*','blip')[0]||t.getElementsByTagNameNS('*','imagedata')[0];
            const rid=blip&&(wv(blip,'embed')||wv(blip,'id'));const src=rid&&await imgSrc(rid);
            if(src){const ext=t.getElementsByTagNameNS('*','extent')[0];let wpx='',hpx='';if(ext){wpx=Math.round(+ext.getAttribute('cx')/9525);hpx=Math.round(+ext.getAttribute('cy')/9525)}
              h+=`<img src="${src}"${wpx?` width="${wpx}" height="${hpx}"`:''} alt="">`}}
        }
        if(h)out.push({h,rp});
      }
      else if(['hyperlink','ins','smartTag','fldSimple','customXml','bdo','dir'].includes(n))await runsHtml(n==='smartTag'||n==='customXml'?c:c,pr,out);
      else if(n==='sdt'){const sc=kid(c,'sdtContent');if(sc)await runsHtml(sc,pr,out)}
    }
  }
  async function para(p){
    const pPr=kid(p,'pPr');const sid=wv(kid(pPr,'pStyle'))||normalId;const sp=stylePR(sid);
    const pp=readP(pPr,Object.assign({},baseP,sp.p));const rr=Object.assign({},baseR,sp.r);
    const name=sp.p._name||'';let tag='p';const hm=name.match(/^(heading|başlık)\s*(\d)/);if(hm)tag='h'+Math.min(3,+hm[2]);else if(name==='title'||name==='konu başlığı')tag='h1';
    let prefix='';
    if(pp.numId&&pp.numId!=='0'){const nt=numText(pp.numId,pp.ilvl||0);if(nt){readP(nt.L.pPr,pp);const lr=readP(pPr,{});Object.assign(pp,Object.fromEntries(Object.entries(lr).filter(([k])=>['ind','first','indR'].includes(k))));
      const nrp=readR(nt.L.rPr,Object.assign({},rr));if(nt.t)prefix=`<span style="${runCss(nrp)}">${esc(nt.t)}</span><span style="display:inline-block;min-width:${Math.max(6,Math.abs(pp.first||18)-6)}pt"> </span>`}}
    const segs=[];await runsHtml(p,rr,segs);
    const jc={both:'justify',distribute:'justify',center:'center',right:'right',end:'right'}[pp.jc]||null;
    const st=css({'text-align':jc,'margin-top':pp.before?pp.before+'pt':null,'margin-bottom':pp.after!=null?pp.after+'pt':null,'margin-left':pp.ind?pp.ind+'pt':null,'margin-right':pp.indR?pp.indR+'pt':null,'text-indent':pp.first?pp.first+'pt':null,'line-height':pp.lh?(Math.max(0.8,pp.lh)*1.15).toFixed(2):pp.lhPt?pp.lhPt+'pt':null,'background-color':pp.bg||null,'font-size':rr.sz?rr.sz+'pt':null,'font-family':rr.font?`'${rr.font}'`:null});
    let html='',cur=prefix;const open=`<${tag}${st?` style="${st}"`:''}>`;
    if(pp.pbb)html+='<hr class="pbreak">';
    for(const s of segs){if(s.pb){html+=open+(cur||'<br>')+`</${tag}>`+'<hr class="pbreak">';cur='';continue}const c=runCss(s.rp);cur+=c?`<span style="${c}">${s.h}</span>`:s.h}
    html+=open+(cur||'<br>')+`</${tag}>`;return html;
  }
  async function table(t){
    const tPr=kid(t,'tblPr');const bd=kid(tPr,'tblBorders');let none=false;
    if(bd){const vals=kids(bd).map(b=>wv(b));none=vals.length&&vals.every(v=>v==='none'||v==='nil')}
    else{const ts=wv(kid(tPr,'tblStyle'));none=!ts||(styles[ts]&&/normal|table normal/.test(styles[ts].name))}
    const rows=kids(t,'tr');const grid=[];let html=`<table style="border-collapse:collapse;${none?'':''}"${none?' class="nb"':''}><tbody>`;const vm={};const cellsOut=[];
    for(let ri=0;ri<rows.length;ri++){const tr=rows[ri];let col=0;const rowCells=[];
      for(const tc of kids(tr,'tc')){const tcPr=kid(tc,'tcPr');const span=+(wv(kid(tcPr,'gridSpan'))||1);const vmEl=kid(tcPr,'vMerge');const vmv=vmEl?(wv(vmEl)||'continue'):null;
        if(vmv==='continue'&&vm[col]){vm[col].rs++;col+=span;continue}
        const w=kid(tcPr,'tcW');const wd=w&&wv(w,'type')==='dxa'?(+wv(w,'w')/20):null;const shd=wv(kid(tcPr,'shd'),'fill');
        const va=wv(kid(tcPr,'vAlign'));
        const cell={rs:1,cs:span,style:css({width:wd?wd+'pt':null,'background-color':shd&&shd!=='auto'?'#'+shd:null,'vertical-align':va==='center'?'middle':va==='bottom'?'bottom':null}),inner:await blocks(tc)};
        if(vmv==='restart')vm[col]=cell;else delete vm[col];
        rowCells.push(cell);col+=span}
      cellsOut.push(rowCells)}
    for(const rc of cellsOut){html+='<tr>'+rc.map(c=>`<td${c.cs>1?` colspan="${c.cs}"`:''}${c.rs>1?` rowspan="${c.rs}"`:''}${c.style?` style="${c.style}"`:''}>${c.inner||'<p><br></p>'}</td>`).join('')+'</tr>'}
    return html+'</tbody></table>';
  }
  async function blocks(el){let h='';for(const c of el.children){const n=c.localName;
    if(n==='p')h+=await para(c);else if(n==='tbl')h+=await table(c);
    else if(n==='sdt'){const sc=kid(c,'sdtContent');if(sc)h+=await blocks(sc)}else if(n==='customXml')h+=await blocks(c)}
    return h}
  const body=kid(doc.documentElement,'body');if(!body)throw new Error('Belgede içerik bulunamadı');
  let html=await blocks(body);
  const sect=kid(body,'sectPr');const pm=kid(sect,'pgMar');
  return{html:html||'<p><br></p>',margins:pm?{t:+wv(pm,'top')/15,r:+wv(pm,'right')/15,b:+wv(pm,'bottom')/15,l:+wv(pm,'left')/15}:null};
}
function withTimeout(p,ms,msg){let t;return Promise.race([p,new Promise((_,rej)=>{t=setTimeout(()=>rej(new Error(msg)),ms)})]).finally(()=>clearTimeout(t))}
