(()=>{
  if(typeof document==='undefined'||typeof ProfitMenteAudioDuckingEngine==='undefined')return;
  const form=document.querySelector('#clipInspectorForm'),volume=document.querySelector('#ciVolumeWrap');if(!form||!volume)return;
  const wrap=document.createElement('label');wrap.id='ciDuckVolumeWrap';wrap.hidden=true;wrap.innerHTML='Música durante voz<input id="ciDuckVolume" type="range" min="0" max="1" step="0.01"><small id="ciDuckVolumeValue"></small>';volume.insertAdjacentElement('afterend',wrap);
  const input=wrap.querySelector('#ciDuckVolume'),value=wrap.querySelector('#ciDuckVolumeValue');
  const selected=()=>window.ProfitMenteEditTools?.selectedId||null,byId=id=>(project?.clips||[]).find(c=>c.id===id);
  function render(){const c=byId(selected()),music=Number(c?.track)===5;wrap.hidden=!music;if(!music)return;const v=ProfitMenteAudioDuckingEngine.duckVolume(c);if(document.activeElement!==input)input.value=v;value.textContent=`${Math.round(v*100)}% · baja solo mientras hay voz`}
  function commit(){const c=byId(selected());if(!c||Number(c.track)!==5)return;c.duckVolume=Math.max(0,Math.min(1,Number(input.value)||0));persist?.();renderAt?.(+document.querySelector('#playhead')?.value||0);setStatus?.(`Ducking de música: ${Math.round(c.duckVolume*100)}% durante voz`);render()}
  input.addEventListener('input',()=>{value.textContent=`${Math.round((Number(input.value)||0)*100)}% · baja solo mientras hay voz`;commit()});
  document.addEventListener('click',e=>{if(e.target.closest?.('.clip'))requestAnimationFrame(render)},true);
  setInterval(render,600);render();
})();
