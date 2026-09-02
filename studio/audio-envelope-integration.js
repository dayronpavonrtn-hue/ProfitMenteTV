(()=>{
  const $=s=>document.querySelector(s),form=$('#clipInspectorForm');
  if(!form)return;
  const block=document.createElement('div');
  block.id='ciAudioEnvelopeWrap';
  block.innerHTML=`<h4>Envolvente de audio</h4><div class="ciGrid"><label>Fade entrada (s)<input id="ciFadeIn" type="number" min="0" step="0.05"></label><label>Fade salida (s)<input id="ciFadeOut" type="number" min="0" step="0.05"></label></div><div class="ciActions"><button id="ciFadeQuick">Suave 0.25s</button><button id="ciFadeReset">Sin fades</button></div><small id="ciFadeInfo"></small>`;
  const volumeWrap=$('#ciVolumeWrap');
  if(volumeWrap)volumeWrap.insertAdjacentElement('afterend',block);else form.appendChild(block);
  const engine=new ProfitMenteAudioEnvelopeEngine();
  const selected=()=>window.ProfitMenteEditTools?.selectedId||null;
  const clip=()=>project.clips.find(c=>c.id===selected());
  const eligible=c=>{if(!c?.asset)return false;const a=assets.find(x=>x.id===c.asset);return [4,5,6].includes(Number(c.track))||([0,1].includes(Number(c.track))&&a?.type==='video')};
  function draw(){const c=clip();block.hidden=!eligible(c);if(!c||block.hidden)return;const e=engine.forClip(c),d=Math.max(.001,Number(c.duration)||.001),locked=engine.trackLocked(project,c.track);$('#ciFadeIn').max=d;$('#ciFadeOut').max=d;$('#ciFadeIn').disabled=locked;$('#ciFadeOut').disabled=locked;$('#ciFadeQuick').disabled=locked;$('#ciFadeReset').disabled=locked;if(document.activeElement!==$('#ciFadeIn'))$('#ciFadeIn').value=e.fadeIn.toFixed(2);if(document.activeElement!==$('#ciFadeOut'))$('#ciFadeOut').value=e.fadeOut.toFixed(2);$('#ciFadeInfo').textContent=locked?`Pista bloqueada · entrada ${e.fadeIn.toFixed(2)}s · salida ${e.fadeOut.toFixed(2)}s`:`Entrada ${e.fadeIn.toFixed(2)}s · salida ${e.fadeOut.toFixed(2)}s · duración ${d.toFixed(2)}s`}
  function save(fi,fo,label){const c=clip();if(!eligible(c))return;const r=engine.apply(project,c,fi,fo);if(!r.ok){if(r.reason==='locked')setStatus?.('La pista está bloqueada: desbloquéala para editar los fades');draw();return}persist?.();drawTimeline?.();renderAt?.(+$('#playhead').value||0);setStatus?.(label||'Envolvente de audio actualizada');draw()}
  $('#ciFadeIn').addEventListener('change',()=>{const c=clip();if(c)save($('#ciFadeIn').value,c.fadeOut??.25,'Fade de entrada actualizado')});
  $('#ciFadeOut').addEventListener('change',()=>{const c=clip();if(c)save(c.fadeIn??.18,$('#ciFadeOut').value,'Fade de salida actualizado')});
  $('#ciFadeQuick').onclick=()=>save(.25,.25,'Fades suaves aplicados');
  $('#ciFadeReset').onclick=()=>save(0,0,'Fades eliminados');
  document.addEventListener('click',e=>{if(e.target.closest?.('.clip'))requestAnimationFrame(draw)},true);
  const oldDraw=window.drawTimeline;if(typeof oldDraw==='function')window.drawTimeline=function(){oldDraw();requestAnimationFrame(draw)};
  setInterval(draw,600);draw();
})();