(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteBeatDetectEngine)return;
  const marker=window.markerEngine;if(!marker)return;
  const toolbar=document.querySelector('.markerToolbar');if(!toolbar||document.querySelector('#beatDetectBtn'))return;
  const btn=document.createElement('button');btn.id='beatDetectBtn';btn.title='Detecta golpes rítmicos localmente y crea marcadores para editar al ritmo';btn.textContent='♫ Beats';toolbar.appendChild(btn);
  const engine=new ProfitMenteBeatDetectEngine();
  const audioContext=()=>{const C=window.AudioContext||window.webkitAudioContext;if(!C)throw new Error('AudioContext no está disponible en este navegador');return new C()};
  function chosenClip(){
    const selected=window.ProfitMenteEditTools?.selectedId,byId=(project.clips||[]).find(c=>c.id===selected&&[4,5,6].includes(Number(c.track))&&c.asset);
    if(byId)return byId;
    return (project.clips||[]).filter(c=>[5,6,4].includes(Number(c.track))&&c.asset).sort((a,b)=>[5,6,4].indexOf(Number(a.track))-[5,6,4].indexOf(Number(b.track))||Number(a.start)-Number(b.start))[0]||null;
  }
  async function run(){
    const clip=chosenClip();if(!clip){setStatus?.('Añade o selecciona un clip de música, voz o SFX para detectar beats');return}
    if(project.trackState?.[clip.track]?.locked){setStatus?.('La pista de audio seleccionada está bloqueada');return}
    const asset=assets.find(a=>a.id===clip.asset);if(!asset?.blob){setStatus?.('El archivo de audio seleccionado no está disponible localmente');return}
    btn.disabled=true;setStatus?.(`Analizando ritmo localmente: ${asset.name}…`);let ctx;
    try{
      ctx=audioContext();const buffer=await ctx.decodeAudioData(await asset.blob.arrayBuffer());const channels=[];for(let i=0;i<buffer.numberOfChannels;i++)channels.push(buffer.getChannelData(i));
      const beats=engine.detect(channels,buffer.sampleRate),mapped=engine.mapToTimeline(beats,clip).filter(b=>b.time>=0&&b.time<=Number(project.duration||0)+.001);
      if(!mapped.length){setStatus?.('No se detectaron golpes claros dentro de este clip');return}
      const merged=engine.mergeMarkers(Array.isArray(project.markers)?project.markers:[],mapped,{prefix:'Beat'});project.markers=merged.markers;persist?.();marker.render();
      setStatus?.(`${merged.added} marcador(es) de beat creados${merged.removed?` · ${merged.removed} detecciones anteriores reemplazadas`:''} · edición al ritmo lista`);
    }catch(err){console.error(err);setStatus?.('No se pudo analizar el ritmo: '+err.message)}finally{try{await ctx?.close?.()}catch{}btn.disabled=false}
  }
  btn.onclick=run;window.ProfitMenteBeatDetect={engine,run,chosenClip};
})();
