(()=>{
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
  const presets={
    natural:{brightness:0,contrast:0,saturation:0,hue:0},
    vivid:{brightness:4,contrast:14,saturation:28,hue:0},
    warm:{brightness:3,contrast:8,saturation:12,hue:-8},
    cool:{brightness:1,contrast:9,saturation:8,hue:10},
    mono:{brightness:0,contrast:14,saturation:-100,hue:0}
  };
  function normalize(c={}){return {brightness:clamp(c.brightness,-100,100),contrast:clamp(c.contrast,-90,100),saturation:clamp(c.saturation,-100,200),hue:clamp(c.hue,-180,180)}}
  function cssFilter(c={}){const v=normalize(c);return `brightness(${Math.max(.05,1+v.brightness/100)}) contrast(${Math.max(.1,1+v.contrast/100)}) saturate(${Math.max(0,1+v.saturation/100)}) hue-rotate(${v.hue}deg)`}
  function ffmpegFilter(c={}){const v=normalize(c),b=(v.brightness/100).toFixed(3),co=Math.max(.1,1+v.contrast/100).toFixed(3),s=Math.max(0,1+v.saturation/100).toFixed(3),h=v.hue.toFixed(2);return `eq=brightness=${b}:contrast=${co}:saturation=${s},hue=h=${h}`}
  function applyPreset(c,name){const p=presets[name]||presets.natural;Object.assign(c,p);return normalize(c)}
  window.ProfitMenteColorGrade={normalize,cssFilter,ffmpegFilter,applyPreset,presets};

  const props=document.querySelector('.clipInspector');if(!props)return;
  const panel=document.createElement('div');panel.id='ciColorWrap';panel.innerHTML=`<h4>Color</h4><label>Preset<select id="ciColorPreset"><option value="custom">Personalizado</option><option value="natural">Natural</option><option value="vivid">Vívido</option><option value="warm">Cálido</option><option value="cool">Frío</option><option value="mono">Blanco y negro</option></select></label><div class="ciGrid"><label>Brillo<input id="ciBrightness" type="number" min="-100" max="100" step="1"></label><label>Contraste<input id="ciContrast" type="number" min="-90" max="100" step="1"></label></div><div class="ciGrid"><label>Saturación<input id="ciSaturation" type="number" min="-100" max="200" step="1"></label><label>Tono °<input id="ciHue" type="number" min="-180" max="180" step="1"></label></div><button id="ciResetColor">Restablecer color</button>`;
  const transform=document.querySelector('#ciTransformWrap');(transform?.parentNode||props).insertBefore(panel,transform?.nextSibling||null);
  const selected=()=>window.ProfitMenteEditTools?.selectedId||null;
  const clip=()=>project.clips.find(c=>c.id===selected());
  function isVisual(c){return !!c&&[0,1].includes(Number(c.track))}
  function redraw(message){persist?.();drawTimeline?.();renderAt?.(+document.querySelector('#playhead').value||0);setStatus?.(message||'Color actualizado');render()}
  function render(){const c=clip();panel.hidden=!isVisual(c);if(!isVisual(c))return;const v=normalize(c);for(const [id,key] of [['ciBrightness','brightness'],['ciContrast','contrast'],['ciSaturation','saturation'],['ciHue','hue']]){const el=document.querySelector('#'+id);if(document.activeElement!==el)el.value=v[key]}}
  for(const [id,key,lo,hi] of [['ciBrightness','brightness',-100,100],['ciContrast','contrast',-90,100],['ciSaturation','saturation',-100,200],['ciHue','hue',-180,180]])document.querySelector('#'+id).addEventListener('change',e=>{const c=clip();if(!isVisual(c))return;c[key]=clamp(e.target.value,lo,hi);document.querySelector('#ciColorPreset').value='custom';redraw('Corrección de color actualizada')});
  document.querySelector('#ciColorPreset').addEventListener('change',e=>{const c=clip();if(!isVisual(c)||e.target.value==='custom')return;applyPreset(c,e.target.value);redraw(`Preset ${e.target.options[e.target.selectedIndex].text} aplicado`)});
  document.querySelector('#ciResetColor').onclick=()=>{const c=clip();if(!isVisual(c))return;Object.assign(c,presets.natural);document.querySelector('#ciColorPreset').value='natural';redraw('Color restablecido')};
  document.addEventListener('click',e=>{if(e.target.closest?.('.clip'))requestAnimationFrame(render)},true);setInterval(render,600);render();
})();