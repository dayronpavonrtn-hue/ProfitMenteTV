(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteTransitionPreviewEngine||window.ProfitMenteTransitionPreview)return;
  const Engine=window.ProfitMenteTransitionPreviewEngine,canvas=document.querySelector('#previewCanvas');
  const original=window.renderAt;if(typeof original!=='function'||!canvas)return;
  const ctx=canvas.getContext('2d'),buffer=document.createElement('canvas'),bctx=buffer.getContext('2d');
  async function renderWithTransition(time){
    await original(time);
    const state=Engine.state(project,time);if(!state)return;
    if(buffer.width!==canvas.width||buffer.height!==canvas.height){buffer.width=canvas.width;buffer.height=canvas.height}
    bctx.clearRect(0,0,buffer.width,buffer.height);bctx.drawImage(canvas,0,0);
    const tr=Engine.transform(state,canvas.width,canvas.height);
    ctx.save();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#090b10';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalAlpha=tr.alpha;
    const dw=canvas.width*tr.scale,dh=canvas.height*tr.scale;ctx.drawImage(buffer,tr.x,tr.y,dw,dh);ctx.restore();
  }
  window.renderAt=renderWithTransition;
  window.ProfitMenteTransitionPreview={state:(t)=>Engine.state(project,t),renderAt:renderWithTransition};
})();