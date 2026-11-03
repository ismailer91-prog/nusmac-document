/* ---------- undo ---------- */
function snap(){return JSON.stringify({order:S.pages.map(p=>p.id),st:S.pages.map(p=>({id:p.id,rot:p.rot,anns:p.anns,clip:p.clip||null,objMode:!!p.objMode,objSig:p.objSig||null}))})}
function pushUndo(){S.dirty=true;S.undo.push(snap());if(S.undo.length>80)S.undo.shift();S.redo=[];updUndo()}
function commitUndo(before){S.dirty=true;S.undo.push(before);if(S.undo.length>80)S.undo.shift();S.redo=[];updUndo()}
function restore(s){const o=JSON.parse(s);S.pages=o.order.map(id=>pool.get(id)).filter(Boolean);for(const st of o.st){const p=pool.get(st.id);if(p){p.rot=st.rot;p.anns=st.anns;p.clip=st.clip||null;p.objMode=st.objMode;p.objSig=st.objSig;if(p.objMode)p.objTried=true}}S.sel=null;S.editing=null;keepScroll(buildViewer)}
function undo(){if(!S.undo.length)return;S.redo.push(snap());restore(S.undo.pop());updUndo()}
function redo(){if(!S.redo.length)return;S.undo.push(snap());restore(S.redo.pop());updUndo()}
function updUndo(){$('#undoBtn').disabled=!S.undo.length;$('#redoBtn').disabled=!S.redo.length}
function keepScroll(fn){const v=$('#viewer'),t=v.scrollTop;fn();v.scrollTop=t}

