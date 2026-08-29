(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteSafeAreaEngine)return;
  const $=s=>document.querySelector(s),engine=new ProfitMenteSafeAreaEngine(),screen=$('.screen'),props=$('.props');if(!screen||!props)return;
  const panel=document.createElement('section');panel.className='safeAreaPanel';panel.innerHTML='<hr><h3>Zona segura social</h3><label>Plataforma<select id="safeAreaPlatform"><option value="generic">Genérica</option><option value="tiktok">TikTok</option><option value="reels">Instagram Reels</option><option value="shorts">YouTube Shorts</option></select></label><label class="safeAreaToggle"><input id="safeAreaEnabled" type="checkbox" checked> Mostrar guías en preview</label><button id="safeAreaFixBtn" type="button">↔ Ajustar textos a zona segura</button><small id="safeAreaStatus">Protege textos contra botones, captions y controles de la plataforma.</small>';props.appendChild(panel);
  const overlay=document.createElement('div');overlay.id='safeAreaOverlay';overlay.innerHTML='<div class="safeAreaRect"><span>ZONA SEGURA</span></div>';screen.appendChild(overlay);
  const style=document.createElement('style');style.textContent='#safeAreaOverlay{position:absolute;inset:0;pointer-events:none;z-index:8}.safeAreaRect{position:absolute;border:2px dashed rgba(255,230,109,.9);box-sizing:border-box;box-shadow:0 0 0 9999px rgba(0,0,0,.13) inset}.safeAreaRect span{position:absolute;left:6px;top:5px;font:700 10px/1 Arial,sans-serif;letter-spacing:.08em;color:#ffe66d;text-shadow:0 1px 2px #000}.safeAreaPanel small{display:block;opacity:.72;line-height:1.35}.safeAreaToggle{display:flex!important;gap:8px;align-items:center}.safeAreaToggle input{width:auto!important;margin:0}.safeAreaPanel button{width:100%;margin:8px 0}';document.head.appendChild(style);
  const platform=$('#safeAreaPlatform'),enabled=$('#safeAreaEnabled'),statusEl=$('#safeAreaStatus'),fixBtn=$('#safeAreaFixBtn');
  function apply(){
    const r=engine.rect(platform.value,project?.format||'9:16'),box=overlay.querySelector('.safeAreaRect');
    box.style.left=(r.x*100)+'%';box.style.top=(r.y*100)+'%';box.style.width=(r.width*100)+'%';box.style.height=(r.height*100)+'%';overlay.hidden=!enabled.checked;
    const qa=engine.inspect(project,platform.value);statusEl.textContent=qa.warnings.length?`${qa.warnings.length} texto(s) fuera de la zona segura.`:'Todos los títulos están dentro de la zona segura.';fixBtn.disabled=!qa.warnings.length;return qa
  }
  function repair(){
    const before=engine.inspect(project,platform.value);if(!before.warnings.length){apply();return}
    const result=engine.clampProject(project,platform.value);
    if(result.changed){if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof renderAt==='function')renderAt(+($('#playhead')?.value||0));if(typeof setStatus==='function')setStatus(`${result.count} texto(s) ajustados a la zona segura`);window.dispatchEvent(new CustomEvent('profitmente:safe-area-fixed',{detail:result}))}
    apply()
  }
  platform.onchange=()=>{project.safeAreaPlatform=platform.value;if(typeof persist==='function')persist();apply()};enabled.onchange=()=>{project.safeAreaGuides=enabled.checked;if(typeof persist==='function')persist();apply()};fixBtn.onclick=repair;
  platform.value=project.safeAreaPlatform||'generic';enabled.checked=project.safeAreaGuides!==false;
  const format=$('#format');format?.addEventListener('change',()=>requestAnimationFrame(apply));
  const qaBtn=$('#qaBtn');qaBtn?.addEventListener('click',()=>{const result=apply();if(!result.warnings.length)return;const report=$('#qaReport');if(report){const lines=result.warnings.slice(0,5).map(x=>`⚠️ Zona segura: ${String(x.name||'Texto').replace(/[<>]/g,'')}`);report.innerHTML+=`<br>${lines.join('<br>')}${result.warnings.length>5?`<br>⚠️ +${result.warnings.length-5} texto(s) más`:''}`}});
  const oldDraw=window.drawTimeline;if(typeof oldDraw==='function')window.drawTimeline=function(){oldDraw();requestAnimationFrame(apply)};
  window.ProfitMenteSafeArea={engine,apply,repair};apply();
})();