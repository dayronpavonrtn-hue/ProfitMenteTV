(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteTrackMixerEngine)return;
  const E=window.ProfitMenteTrackMixerEngine,$=s=>document.querySelector(s),AUDIO=new Set(E.AUDIO_TRACKS);
  function ensure(){project.trackState=E.ensure(project.trackState);return project.trackState}
  function audioEngine(){return typeof audio!=='undefined'?audio:window.audio}
  function applyLive(track,gain){audioEngine()?.setTrackGain?.(track,gain)}
  function commit(track,gain){
    E.setGain(ensure(),track,gain);applyLive(track,gain);persist?.();setStatus?.(`Nivel de pista ${Math.round(gain*100)}%`);
  }
  function decorate(){
    ensure();
    document.querySelectorAll('.track').forEach((row,track)=>{
      if(!AUDIO.has(track)||row.querySelector('.trackMixer'))return;
      const label=row.querySelector('span');if(!label)return;
      const gain=E.gain(project.trackState,track),wrap=document.createElement('span');wrap.className='trackMixer';
      wrap.innerHTML=`<input class="trackGain" type="range" min="0" max="200" step="5" value="${Math.round(gain*100)}" title="Nivel de pista 0–200%"><small>${E.percent(gain)}</small>`;
      const input=wrap.querySelector('input'),out=wrap.querySelector('small');
      for(const ev of ['click','pointerdown','dblclick'])wrap.addEventListener(ev,e=>e.stopPropagation());
      input.addEventListener('input',()=>{const value=E.setGain(ensure(),track,Number(input.value)/100);out.textContent=E.percent(value);applyLive(track,value)});
      input.addEventListener('change',()=>commit(track,E.gain(project.trackState,track)));
      input.addEventListener('dblclick',e=>{e.preventDefault();input.value='100';const value=E.setGain(ensure(),track,1);out.textContent='100%';applyLive(track,value);commit(track,value)});
      label.appendChild(wrap);
    });
    for(const track of E.AUDIO_TRACKS)applyLive(track,E.gain(project.trackState,track));
  }
  const baseDraw=drawTimeline;drawTimeline=function(){baseDraw();decorate()};
  window.addEventListener('profitmente:project-restored',()=>requestAnimationFrame(()=>{drawTimeline();decorate()}));
  if(!$('#profitmenteTrackMixerStyle')){const style=document.createElement('style');style.id='profitmenteTrackMixerStyle';style.textContent='.trackMixer{display:inline-flex;align-items:center;gap:4px;margin-left:5px;vertical-align:middle}.trackMixer input{width:66px;height:14px;padding:0}.trackMixer small{min-width:32px;font-size:9px;color:#aeb7c8}';document.head.appendChild(style)}
  decorate();
  window.ProfitMenteTrackMixer={engine:E,refresh:decorate,setGain(track,value){const gain=E.setGain(ensure(),track,value);if(gain==null)return null;applyLive(track,gain);persist?.();drawTimeline();return gain}};
})();
