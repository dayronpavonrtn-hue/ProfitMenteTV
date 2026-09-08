(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteEditNavigationEngine||window.ProfitMenteEditNavigation)return;
  const E=window.ProfitMenteEditNavigationEngine,$=s=>document.querySelector(s);
  function typing(){return ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||!!document.activeElement?.isContentEditable}
  function selectedTrack(){
    const id=window.ProfitMenteEditTools?.selectedId;
    const clip=id===undefined||id===null?null:window.ProfitMenteClipIdentity?.find?.(id);
    const track=clip?E.trackKey(clip.track):null;
    return track===null?null:track;
  }
  function current(){const value=E.scalarNumber($('#playhead')?.value);return value===null?0:value}
  async function move(direction,{selectedOnly=false}={}){
    const track=selectedOnly?selectedTrack():null;
    const result=E.seek(project,current(),direction,{track,includeMarkers:false,includeRange:true});
    if(!result.ok){setStatus?.('No se pudo navegar entre cortes: timeline inválido');return result}
    window.ProfitMenteShuttleTransport?.stop?.();
    window.ProfitMenteTransport?.seek?.(result.time);
    const slider=$('#playhead');if(slider)slider.value=result.time;
    syncForm?.();await renderAt?.(result.time);
    const label=direction==='previous'?'anterior':'siguiente',scope=track===null?'timeline':`pista ${track+1}`;
    setStatus?.(`Corte ${label} · ${scope} · ${result.time.toFixed(2)}s${result.edge?' · límite':''}`);
    return result;
  }
  function mount(){
    if($('#editNavigationControls'))return;
    const head=document.querySelector('.timelineHead');if(!head)return;
    const box=document.createElement('span');box.id='editNavigationControls';box.className='editNavigationControls';box.innerHTML='<button id="previousEditBtn" title="Corte anterior (↑)">↑ Corte</button><button id="nextEditBtn" title="Corte siguiente (↓)">Corte ↓</button>';
    head.appendChild(box);
    $('#previousEditBtn').onclick=()=>move('previous');$('#nextEditBtn').onclick=()=>move('next');
    if(!document.querySelector('#profitmenteEditNavigationStyle')){const s=document.createElement('style');s.id='profitmenteEditNavigationStyle';s.textContent='.editNavigationControls{display:inline-flex;gap:4px;margin-left:8px}.editNavigationControls button{font-size:10px;padding:4px 7px}';document.head.appendChild(s)}
  }
  document.addEventListener('keydown',event=>{
    if(typing()||event.ctrlKey||event.metaKey||event.altKey)return;
    if(event.key!=='ArrowUp'&&event.key!=='ArrowDown')return;
    event.preventDefault();event.stopImmediatePropagation();
    move(event.key==='ArrowUp'?'previous':'next',{selectedOnly:event.shiftKey});
  });
  window.addEventListener('load',mount,{once:true});if(document.readyState==='complete')mount();
  window.ProfitMenteEditNavigation={engine:E,move,previous:options=>move('previous',options),next:options=>move('next',options)};
})();
