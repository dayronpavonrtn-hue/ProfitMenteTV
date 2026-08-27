class ProfitMenteWaveformEngine{
  constructor(){this.ctx=null;this.cache=new Map();this.pending=new Map()}
  audioContext(){if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();return this.ctx}
  async peaks(asset,bins=120){
    if(!asset?.blob)return null;
    const key=`${asset.id}:${bins}`;
    if(this.cache.has(key))return this.cache.get(key);
    if(this.pending.has(key))return this.pending.get(key);
    const job=(async()=>{try{
      const raw=await asset.blob.arrayBuffer();
      const buffer=await this.audioContext().decodeAudioData(raw.slice(0));
      const channels=[];for(let c=0;c<buffer.numberOfChannels;c++)channels.push(buffer.getChannelData(c));
      const len=buffer.length,step=Math.max(1,Math.floor(len/bins)),out=[];
      for(let i=0;i<bins;i++){
        const from=i*step,to=Math.min(len,from+step);let max=0;
        for(let s=from;s<to;s+=Math.max(1,Math.floor(step/24))){let sum=0;for(const ch of channels)sum+=Math.abs(ch[s]||0);max=Math.max(max,sum/channels.length)}
        out.push(max);
      }
      const norm=Math.max(.001,...out),peaks=out.map(v=>v/norm);this.cache.set(key,peaks);return peaks;
    }catch(err){console.warn('Waveform omitido',asset.name,err);return null}finally{this.pending.delete(key)}})();
    this.pending.set(key,job);return job;
  }
  draw(canvas,peaks){
    if(!canvas||!peaks?.length)return;const dpr=Math.min(2,window.devicePixelRatio||1),rect=canvas.getBoundingClientRect();
    canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='rgba(225,235,255,.78)';
    const mid=canvas.height/2,bw=canvas.width/peaks.length;
    peaks.forEach((p,i)=>{const h=Math.max(1,p*canvas.height*.82);ctx.fillRect(i*bw,mid-h/2,Math.max(1,bw*.58),h)});
  }
  async decorate(project,assets,root=document){
    const clips=[...root.querySelectorAll('.clip[data-id]')];
    for(const el of clips){
      const clip=project.clips.find(c=>c.id===el.dataset.id);if(!clip||![4,5,6].includes(clip.track)||!clip.asset)continue;
      const asset=assets.find(a=>a.id===clip.asset);if(!asset||asset.type!=='audio')continue;
      let canvas=el.querySelector('.waveform');if(!canvas){canvas=document.createElement('canvas');canvas.className='waveform';el.prepend(canvas)}
      const bins=Math.max(28,Math.min(180,Math.round(el.clientWidth/3)));const peaks=await this.peaks(asset,bins);if(peaks&&el.isConnected)this.draw(canvas,peaks);
    }
  }
}
window.ProfitMenteWaveformEngine=ProfitMenteWaveformEngine;

(()=>{
  const css=document.createElement('style');css.textContent='.clip{isolation:isolate}.clip .waveform{position:absolute;inset:1px 7px 1px 2px;width:calc(100% - 9px);height:calc(100% - 2px);opacity:.52;pointer-events:none;z-index:-1}.clip[data-waveform="1"]{background:#202b3b}';document.head.appendChild(css);
  const engine=new ProfitMenteWaveformEngine();window.profitMenteWaveform=engine;
  const install=()=>{if(typeof window.drawTimeline!=='function')return false;const original=window.drawTimeline;if(original.__waveformPatched)return true;function patched(){const result=original.apply(this,arguments);requestAnimationFrame(()=>engine.decorate(project,assets).catch(console.warn));return result}patched.__waveformPatched=true;window.drawTimeline=patched;requestAnimationFrame(()=>engine.decorate(project,assets).catch(console.warn));return true};
  if(!install())window.addEventListener('DOMContentLoaded',install,{once:true});
})();