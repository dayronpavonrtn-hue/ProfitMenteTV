(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteExportPreflight{
    static canonicalTrack(value){
      if(typeof value!=='number'&&typeof value!=='string')return null;
      const raw=typeof value==='string'?value.trim():value;
      if(raw==='')return null;
      const n=Number(raw);
      if(!Number.isFinite(n)||!Number.isInteger(n)||n<0||n>6)return null;
      return Object.is(n,-0)?0:n;
    }
    static finiteNumber(value,fallback=0){
      if(typeof value!=='number'&&typeof value!=='string')return fallback;
      const raw=typeof value==='string'?value.trim():value;
      if(raw==='')return fallback;
      const n=Number(raw);
      return Number.isFinite(n)?n:fallback;
    }
    static summarize(qa,health){
      qa=qa||{ok:false,score:0,issues:['QA no disponible'],warnings:[],metrics:{}};health=health||{ok:false,render_ready:false};
      const issues=[...(qa.issues||[])],warnings=[...(qa.warnings||[])];
      let state='ready',label='Listo para exportar';
      if(issues.length){state='blocked';label=`Exportación bloqueada · ${issues.length} error${issues.length===1?'':'es'}`}
      else if(!health.ok){state='package';label='Proyecto válido · MP4 directo inactivo'}
      else if(!health.render_ready){state='package';label='Proyecto válido · falta FFmpeg para MP4 directo'}
      else if(warnings.length){state='warning';label=`Listo con ${warnings.length} advertencia${warnings.length===1?'':'s'}`}
      return {state,label,canPackage:issues.length===0,canRender:issues.length===0&&!!health.render_ready,score:Number(qa.score)||0,issues,warnings,metrics:qa.metrics||{},health};
    }
    static audioTrackMuted(project,track){
      const canonicalTrack=value=>this.canonicalTrack(value);
      const read=(states,index)=>{
        if(!states||typeof states!=='object'||Array.isArray(states))return {};
        let state={};
        for(const [key,value] of Object.entries(states)){
          if(canonicalTrack(key)!==index||!value||typeof value!=='object'||Array.isArray(value))continue;
          const previous=state;
          state={...state,...value};
          for(const flag of ['muted','solo'])if(previous[flag]===true||value[flag]===true)state[flag]=true;
        }
        return state;
      };
      const merged=index=>{
        const legacy=read(project?.trackStates,index),modern=read(project?.trackState,index),state={...legacy,...modern};
        for(const flag of ['muted','solo'])if(legacy[flag]===true||modern[flag]===true)state[flag]=true;
        for(const key of ['_soloMutedBase','_soloAudioActive'])if(!(key in modern)&&key in legacy)state[key]=legacy[key];
        return state;
      };
      const tracks=[4,5,6],states=Object.fromEntries(tracks.map(index=>[index,merged(index)])),hasSolo=tracks.some(index=>!!states[index].solo),state=states[canonicalTrack(track)]||{};
      const baseMuted=state._soloAudioActive?!!state._soloMutedBase:!!state.muted;
      return baseMuted||(hasSolo&&!state.solo);
    }
    static narrationCoverage(qa,project){
      const next={...(qa||{}),issues:[...(qa?.issues||[])],warnings:[...(qa?.warnings||[])],metrics:{...(qa?.metrics||{})}};
      const projectDuration=this.finiteNumber(project?.duration,0),duration=Math.max(.001,projectDuration>0?projectDuration:0),clips=Array.isArray(project?.clips)?project.clips:[];
      const trackMuted=this.audioTrackMuted(project,6);
      const isNarration=c=>this.canonicalTrack(c?.track)===6;
      const clipDuration=c=>Math.max(0,this.finiteNumber(c?.duration,0));
      const clipStart=c=>Math.max(0,this.finiteNumber(c?.start,0));
      const voice=trackMuted?[]:clips.filter(c=>isNarration(c)&&c?.asset&&!c?.muted&&clipDuration(c)>0);
      const ranges=voice.map(c=>{const start=clipStart(c);return [start,Math.min(duration,start+clipDuration(c))]}).filter(r=>r[1]>r[0]).sort((a,b)=>a[0]-b[0]);
      let seconds=0;if(ranges.length){let [s,e]=ranges[0];for(const [a,b] of ranges.slice(1)){if(a<=e)e=Math.max(e,b);else{seconds+=e-s;s=a;e=b}}seconds+=e-s}
      const ratio=Math.max(0,Math.min(1,seconds/duration)),percent=+(ratio*100).toFixed(1);next.metrics.narrationCoverage=percent;
      const mode=String(project?.mode||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),automatic=mode.includes('automatic');
      if(!automatic||trackMuted)return next;
      const pending=clips.some(c=>isNarration(c)&&!c?.asset&&clipDuration(c)>0);
      if(pending&&ratio<.72)next.warnings.push(`Narración automática pendiente · cobertura actual ${percent}%. Añade o graba una voz que cubra al menos 72% del video.`);
      else if(voice.length&&ratio<.72)next.warnings.push(`Narración automática incompleta · cobertura ${percent}%. Recomendado: al menos 72% del video.`);
      else if(!voice.length)next.warnings.push('El proyecto automático no tiene narración activa. Añade o graba una voz antes del render final.');
      return next;
    }
  }
  function captureLiveState(projectValue,assetValue){
    let projectText='',assetsText='';
    try{projectText=JSON.stringify(projectValue)}catch{}
    try{assetsText=JSON.stringify(assetValue)}catch{}
    return {projectText,assetsText,assetRefs:Array.isArray(assetValue)?assetValue.slice():null};
  }
  function liveStateUnchanged(state,projectValue,assetValue){
    if(!state)return true;
    try{if(JSON.stringify(projectValue)!==state.projectText||JSON.stringify(assetValue)!==state.assetsText)return false}catch{return false}
    if(state.assetRefs){
      if(!Array.isArray(assetValue)||assetValue.length!==state.assetRefs.length)return false;
      for(let i=0;i<state.assetRefs.length;i++)if(assetValue[i]!==state.assetRefs[i])return false;
    }
    return true;
  }
  root.ProfitMenteExportPreflight=ProfitMenteExportPreflight;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteExportPreflight;
  if(typeof document==='undefined')return;
  const $=s=>document.querySelector(s),qaEngine=new ProfitMenteQAEngine(),bundleEngine=new ProfitMenteBundleEngine();
  const qaBtn=$('#qaBtn');if(!qaBtn)return;
  let btn=$('#preflightBtn');if(!btn){btn=document.createElement('button');btn.id='preflightBtn';btn.textContent='🚦 Preflight export';btn.title='Comprobar proyecto, medios y disponibilidad del render local';qaBtn.after(btn)}
  let report=$('#preflightReport');if(!report){report=document.createElement('div');report.id='preflightReport';report.className='status preflightReport';report.hidden=true;const status=$('#status');status?.after(report)}
  async function run(snapshot){
    btn.disabled=true;try{
      const hasSnapshot=!!snapshot&&typeof snapshot==='object'&&!!snapshot.project;
      if(!hasSnapshot&&typeof save==='function')save();
      const liveGuard=hasSnapshot?null:captureLiveState(project,assets);
      const qaProject=hasSnapshot?snapshot.project:project;
      const qaAssets=hasSnapshot&&Array.isArray(snapshot.assets)?snapshot.assets:assets;
      const qa=ProfitMenteExportPreflight.narrationCoverage(qaEngine.inspect(qaProject,qaAssets),qaProject),health=await bundleEngine.health();
      let r=ProfitMenteExportPreflight.summarize(qa,health);
      if(!hasSnapshot&&!liveStateUnchanged(liveGuard,project,assets)){
        const changedQa={...qa,ok:false,issues:[...(qa.issues||[]),'El proyecto cambió durante el Preflight. Inicia la exportación otra vez para validar la versión actual.']};
        r=ProfitMenteExportPreflight.summarize(changedQa,health);
      }
      report.hidden=false;report.dataset.state=r.state;
      const render=r.canRender?'MP4 directo ✓':r.canPackage?'Paquete ✓ · MP4 directo no disponible':'MP4 bloqueado';
      const metrics=r.metrics||{};
      report.innerHTML=`<b>${r.label}</b><br>QA ${r.score}/100 · ${render}<br>Visual ${metrics.visualCoverage??0}% · Captions ${metrics.captionCoverage??0}% · Voz ${metrics.narrationCoverage??0}% · ${metrics.clips??0} clips${r.issues.length?'<br>❌ '+r.issues.slice(0,3).join('<br>❌ '):r.warnings.length?'<br>⚠️ '+r.warnings.slice(0,3).join('<br>⚠️ '):'<br>Sin bloqueos detectados.'}`;
      if(typeof setStatus==='function')setStatus(r.canRender?'Preflight completo: listo para MP4':r.canPackage?'Preflight completo: proyecto exportable como paquete':'Preflight: corrige los errores antes de exportar');
      return r;
    }finally{btn.disabled=false}
  }
  btn.onclick=()=>run();root.ProfitMenteExportPreflightRun=run;
})();
