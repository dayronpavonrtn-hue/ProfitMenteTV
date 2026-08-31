(()=>{
  if(typeof document==='undefined'||window.ProfitMenteClipLock)return;
  const Engine=window.ProfitMenteClipLockEngine;if(!Engine)return;
  const engine=new Engine(),$=s=>document.querySelector(s);
  const byId=id=>(project?.clips||[]).find(c=>String(c.id)===String(id));
  const selected=()=>byId(window.ProfitMenteEditTools?.selectedId);
  const clipFromElement=el=>byId(el?.closest?.('.clip')?.dataset?.id);
  const status=text=>typeof setStatus==='function'&&setStatus(text);
  const MUTATION_BUTTONS=new Set(['splitBtn','duplicateBtn','deleteClipBtn','splitClipBtn','rippleDeleteBtn','closeGapsBtn','insertGapBtn','ciSlipBack','ciSlipForward','ciToCursor','ciFit','ciKeyStart','ciKeyEnd','ciKeyClear','ciResetTransform']);

  const style=document.createElement('style');
  style.textContent='.clip.clipLocked{outline:1px solid rgba(255,190,64,.8);cursor:default}.clip.clipLocked::after{content:" 🔒";font-size:.8em}.clipInspector .ciClipLockRow{margin:.35rem 0 .6rem;display:flex;align-items:center;gap:.4rem}.clipInspector .ciClipLockedHint{font-size:.78rem;opacity:.75}';
  document.head.appendChild(style);

  function ensureControl(){
    const form=$('#clipInspectorForm');if(!form||$('#ciClipLocked'))return;
    const row=document.createElement('label');row.className='ciCheck ciClipLockRow';row.innerHTML='<input id="ciClipLocked" type="checkbox"> 🔒 Bloquear este clip <small class="ciClipLockedHint">Protege edición accidental</small>';
    form.insertBefore(row,form.firstChild);
    $('#ciClipLocked').addEventListener('change',e=>{
      const clip=selected();if(!clip)return;
      engine.setLocked(clip,e.target.checked);
      if(typeof persist==='function')persist();
      if(typeof drawTimeline==='function')drawTimeline();
      if(typeof renderAt==='function')renderAt(+$('#playhead')?.value||0);
      status(clip.locked?'Clip bloqueado · selección permitida, edición protegida':'Clip desbloqueado');
      requestAnimationFrame(sync);
    });
  }
  function protectInspector(clip){
    const form=$('#clipInspectorForm');if(!form)return;
    const own=engine.clipLocked(clip),locked=engine.isLocked(project,clip);
    const toggle=$('#ciClipLocked');if(toggle)toggle.checked=own;
    form.querySelectorAll('input,select,button').forEach(el=>{
      if(el.id==='ciClipLocked')return;
      if(locked){if(!el.disabled){el.disabled=true;el.dataset.clipLockDisabled='1'}}
      else if(el.dataset.clipLockDisabled==='1'){el.disabled=false;delete el.dataset.clipLockDisabled}
    });
  }
  function decorate(){
    ensureControl();
    document.querySelectorAll('.clip').forEach(el=>{
      const clip=byId(el.dataset.id),own=engine.clipLocked(clip);
      el.classList.toggle('clipLocked',own);
      if(own)el.title='Clip bloqueado: selección permitida; mover, recortar y editar están protegidos';
    });
    protectInspector(selected());
  }
  function block(message='Este clip o su pista están bloqueados'){
    status(message);requestAnimationFrame(sync);return true;
  }
  function sync(){ensureControl();decorate()}

  document.addEventListener('pointerdown',e=>{
    const el=e.target.closest?.('.clip'),clip=clipFromElement(e.target);if(!el||!engine.isLocked(project,clip))return;
    e.preventDefault();e.stopImmediatePropagation();
    window.ProfitMenteEditTools?.select?.(clip.id);
    block(engine.clipLocked(clip)?'Clip bloqueado · selección permitida, arrastre y recorte protegidos':'Pista bloqueada · edición protegida');
  },true);
  document.addEventListener('dblclick',e=>{
    const clip=clipFromElement(e.target);if(!engine.isLocked(project,clip))return;
    e.preventDefault();e.stopImmediatePropagation();block();
  },true);
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('button');if(!btn||!MUTATION_BUTTONS.has(btn.id))return;
    const clip=selected();if(!engine.isLocked(project,clip))return;
    e.preventDefault();e.stopImmediatePropagation();block();
  },true);
  document.addEventListener('keydown',e=>{
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable)return;
    const clip=selected();if(!engine.isLocked(project,clip))return;
    const mod=e.ctrlKey||e.metaKey,key=String(e.key||'').toLowerCase();
    const mutation=e.key==='Delete'||e.key==='Backspace'||key==='s'||(mod&&key==='d')||(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight'))||(e.shiftKey&&e.key==='Delete')||key==='g';
    if(!mutation)return;e.preventDefault();e.stopImmediatePropagation();block();
  },true);

  const baseDraw=window.drawTimeline;
  if(typeof baseDraw==='function')window.drawTimeline=function(...args){const result=baseDraw.apply(this,args);requestAnimationFrame(sync);return result};
  document.addEventListener('click',e=>{if(e.target.closest?.('.clip'))requestAnimationFrame(sync)},true);
  window.addEventListener('profitmente:features-ready',()=>requestAnimationFrame(sync));
  window.ProfitMenteClipLock={engine,sync,isLocked:clip=>engine.isLocked(project,clip),isClipLocked:clip=>engine.clipLocked(clip)};
  requestAnimationFrame(sync);
})();
