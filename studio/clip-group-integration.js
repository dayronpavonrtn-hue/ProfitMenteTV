(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteClipGroupEngine||window.ProfitMenteClipGroups)return;
  const $=s=>document.querySelector(s),engine=new ProfitMenteClipGroupEngine();
  const multi=()=>window.ProfitMenteMultiSelect?.engine;
  const props=$('.props');if(!props)return;
  const panel=document.createElement('section');panel.className='clipGroupPanel';panel.innerHTML=`<hr><h3>Grupos de clips</h3><div id="clipGroupInfo" class="clipEmpty">Selecciona 2 o más clips para crear un grupo persistente.</div><div class="ciActions"><button id="groupClips">🔗 Agrupar</button><button id="ungroupClips">⛓ Desagrupar</button></div><small>Un clic en cualquier miembro vuelve a seleccionar el grupo completo. El vínculo se guarda dentro del proyecto.</small>`;props.appendChild(panel);
  const style=document.createElement('style');style.textContent='.clip[data-grouped="1"]{box-shadow:inset 0 -3px 0 rgba(120,210,255,.75)}.clipGroupPanel .ciActions{display:flex;gap:6px;flex-wrap:wrap}.clipGroupPanel small{display:block;margin-top:7px;opacity:.72;line-height:1.35}';document.head.appendChild(style);
  function status(t){if(typeof setStatus==='function')setStatus(t)}
  function selectedIds(){return multi()?.values?.()||[]}
  function selectedClips(){const ids=new Set(selectedIds().map(String));return (project?.clips||[]).filter(c=>ids.has(String(c.id)))}
  function refresh(){
    const selected=selectedClips(),groups=new Set(selected.map(c=>engine.groupId(c)).filter(Boolean));
    const info=$('#clipGroupInfo');if(info){
      if(!selected.length)info.textContent='Selecciona 2 o más clips para crear un grupo persistente.';
      else if(groups.size)info.textContent=`${selected.length} clip(s) seleccionados · ${groups.size} grupo(s) vinculado(s).`;
      else info.textContent=`${selected.length} clip(s) seleccionados · sin vínculo persistente.`;
    }
    const groupBtn=$('#groupClips'),ungroupBtn=$('#ungroupClips');if(groupBtn)groupBtn.disabled=selected.length<2;if(ungroupBtn)ungroupBtn.disabled=!groups.size;
    document.querySelectorAll('.clip').forEach(el=>{const clip=(project?.clips||[]).find(c=>String(c.id)===String(el.dataset.id));el.dataset.grouped=engine.groupId(clip)?'1':'0'})
  }
  function commit(message){persist?.();drawTimeline?.();renderAt?.(+$('#playhead').value||0);requestAnimationFrame(()=>{window.ProfitMenteMultiSelect?.refresh?.();refresh()});status(message)}
  $('#groupClips').onclick=()=>{const r=engine.group(project,selectedIds());if(!r.changed){status('Selecciona al menos 2 clips para agrupar');return}multi()?.set(r.members);commit(`${r.members.length} clips vinculados en un grupo persistente`)};
  $('#ungroupClips').onclick=()=>{const r=engine.ungroup(project,selectedIds());if(!r.changed){status('La selección no pertenece a ningún grupo');return}multi()?.set(r.members);commit(`${r.groups} grupo(s) deshecho(s) · ${r.changed} clips liberados`)};
  document.addEventListener('click',e=>{
    const el=e.target.closest?.('.clip');if(!el||e.shiftKey||e.ctrlKey||e.metaKey)return;
    const clip=(project?.clips||[]).find(c=>String(c.id)===String(el.dataset.id)),groupId=engine.groupId(clip);if(!groupId)return;
    const ids=engine.members(project,groupId).map(c=>String(c.id));if(ids.length<2)return;
    requestAnimationFrame(()=>{multi()?.set(ids);window.ProfitMenteMultiSelect?.refresh?.();refresh();status(`Grupo seleccionado · ${ids.length} clips vinculados`)})
  },true);
  window.addEventListener('profitmente:features-ready',refresh);
  const oldDraw=window.drawTimeline;if(typeof oldDraw==='function')window.drawTimeline=function(){oldDraw();requestAnimationFrame(refresh)};
  const repaired=engine.repair(project);if(repaired.repaired)persist?.();
  window.ProfitMenteClipGroups={engine,refresh};refresh();
})();