(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteRenderClock{
    constructor({fps=30,now=()=>performance.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
      this.fps=Number.isFinite(Number(fps))&&Number(fps)>0?Number(fps):30;
      this.now=now;
      this.sleep=sleep;
      this.frameMs=1000/this.fps;
    }
    time(startedAt,duration){
      const d=Number(duration);
      if(!Number.isFinite(d)||d<=0)return 0;
      return Math.max(0,Math.min(d,(this.now()-startedAt)/1000));
    }
    async wait(frameStartedAt){
      const remaining=this.frameMs-(this.now()-frameStartedAt);
      if(remaining>0)await this.sleep(remaining);
    }
    async run(duration,renderFrame){
      const d=Number(duration);
      if(!Number.isFinite(d)||d<=0)throw new Error('Duración de render inválida');
      if(typeof renderFrame!=='function')throw new Error('Renderizador de frame no disponible');
      const startedAt=this.now();
      let frames=0;
      while(true){
        const t=this.time(startedAt,d);
        if(t>=d)break;
        const frameStartedAt=this.now();
        await renderFrame(t);
        frames++;
        await this.wait(frameStartedAt);
      }
      await renderFrame(d);
      return {duration:d,frames,elapsed:(this.now()-startedAt)/1000};
    }
  }
  root.ProfitMenteRenderClock=ProfitMenteRenderClock;
})();
