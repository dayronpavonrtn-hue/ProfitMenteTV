(function(g){
  'use strict';
  if(typeof document==='undefined'||g.ProfitMenteRenderProgress)return;
  const Engine=g.ProfitMenteRenderProgressEngine;
  if(!Engine)return;

  let panel=null,bar=null,fill=null,title=null,meta=null;

  function ensure(){
    if(panel?.isConnected)return panel;
    const status=document.querySelector('#status');
    if(!status)return null;
    panel=document.createElement('div');
    panel.id='renderProgressPanel';
    panel.hidden=true;
    panel.style.cssText='margin-top:8px;padding:9px 10px;border:1px solid rgba(255,255,255,.14);border-radius:8px;background:rgba(0,0,0,.18)';
    title=document.createElement('div');
    title.id='renderProgressTitle';
    title.style.cssText='font-size:12px;font-weight:700;margin-bottom:6px';
    bar=document.createElement('div');
    bar.id='renderProgressBar';
    bar.setAttribute('role','progressbar');
    bar.setAttribute('aria-label','Progreso del render MP4');
    bar.setAttribute('aria-valuemin','0');
    bar.setAttribute('aria-valuemax','100');
    bar.style.cssText='height:7px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.12)';
    fill=document.createElement('div');
    fill.id='renderProgressFill';
    fill.style.cssText='height:100%;width:0%;background:currentColor;transition:width .22s ease;opacity:.9';
    bar.appendChild(fill);
    meta=document.createElement('div');
    meta.id='renderProgressMeta';
    meta.setAttribute('aria-live','polite');
    meta.style.cssText='margin-top:5px;font-size:11px;opacity:.78';
    panel.append(title,bar,meta);
    status.insertAdjacentElement('afterend',panel);
    return panel;
  }

  function render(raw){
    if(!ensure())return null;
    const state=Engine.normalize(raw);
    panel.hidden=state.stage==='idle';
    panel.dataset.stage=state.stage;
    title.textContent=state.message;
    const pieces=[];
    if(state.progress!=null)pieces.push(`${Math.round(state.progress)}%`);
    if(state.elapsed!=null)pieces.push(`transcurrido ${Engine.formatSeconds(state.elapsed)}`);
    if(state.eta!=null&&state.stage==='rendering')pieces.push(`restante aprox. ${Engine.formatSeconds(state.eta)}`);
    if(state.stale)pieces.push('progreso temporalmente sin cambios');
    meta.textContent=pieces.join(' · ')||(state.indeterminate?'Procesando…':'');
    if(state.progress==null){
      bar.removeAttribute('aria-valuenow');
      bar.setAttribute('aria-valuetext',state.message);
      fill.style.width=state.stage==='done'?'100%':'22%';
      fill.style.opacity='.55';
    }else{
      bar.setAttribute('aria-valuenow',String(Math.round(state.progress)));
      bar.setAttribute('aria-valuetext',`${state.message} · ${Math.round(state.progress)}%`);
      fill.style.width=`${state.progress}%`;
      fill.style.opacity='.9';
    }
    if(state.stage==='done'){fill.style.width='100%';bar.setAttribute('aria-valuenow','100')}
    return state;
  }

  function reset(){render({stage:'idle'})}
  document.addEventListener('profitmente:render-progress',e=>render(e.detail||{}));
  g.ProfitMenteRenderProgress={render,reset,ensure};
})(globalThis);
