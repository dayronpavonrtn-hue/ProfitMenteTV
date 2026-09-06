class ProfitMenteWaveformEngine{
  static AUDIO_TRACKS=[4,5,6]
  constructor(){this.ctx=null;this.cache=new Map();this.pending=new Map();this.blobKeys=new WeakMap();this.nextBlobKey=1}
  static canonicalTrack(value){
    if(value===null||value===undefined||typeof value==='boolean')return null;
    const raw=typeof value==='string'?value.trim():value;if(raw==='')return null;
    const n=Number(raw);return Number.isFinite(n)&&Number.isInteger(n)&&n>=0&&n<=6?(Object.is(n,-0)?0:n):null;
  }
  static canonicalId(value){
    if(value===null||value===undefined||typeof value==='boolean')return null;
    if(typeof value==='string'){
      const raw=value.trim();if(raw==='')return null;
      const numeric=Number(raw);return Number.isFinite(numeric)?String(Object.is(numeric,-0)?0:numeric):raw;
    }
    if(typeof value==='number'&&Number.isFinite(value))return String(Object.is(value,-0)?0:value);
    return null;
  }
  static sameIdentity(a,b){const left=this.canonicalId(a),right=this.canonicalId(b);return left!==null&&right!==null&&left===right}
  static findById(items=[],id){return (items||[]).find(item=>this.sameIdentity(item?.id,id))||null}
  static isAudioTrack(value){return this.AUDIO_TRACKS.includes(this.canonicalTrack(value))}
  static sourceWindow({sourceOffset=0,clipDuration=0,speed=1,sourceDuration=0}={}){
    const total=Math.max(0,Number(sourceDuration)||0),rate=Math.max(.01,Number(speed)||1),offset=Math.max(0,Number(sourceOffset)||0),start=total?Math.min(total,offset):offset,duration=Math.max(0,Number(clipDuration)||0),end=total?Math.min(total,start+duration*rate):start+duration*rate;
    return {start,end,duration:Math.max(0,end-start),speed:rate,sourceDuration:total};
  }
  static slicePeaks(peaks,{sourceOffset=0,clipDuration=0,speed=1,sourceDuration=0,bins=120}={}){
    const source=Array.from(peaks||[]),count=Math.max(8,Math.min(1024,Math.floor(Number(bins)||120))),out=new Array(count).fill(0),total=Math.max(0,Number(sourceDuration)||0);
    if(!source.length||!total)return out;
    const win=this.sourceWindow({sourceOffset,clipDuration,speed,sourceDuration:total});if(win.duration<=0)return out;
    const from=Math.max(0,Math.min(source.length,(win.start/total)*source.length)),to=Math.max(from,Math.min(source.length,(win.end/total)*source.length)),span=Math.max(1e-6,to-from),step=span/count;
    for(let bin=0;bin<count;bin++){
      const a=Math.floor(from+bin*step),b=Math.max(a+1,Math.ceil(from+(bin+1)*step));let peak=0;
      for(let i=a;i<b&&i<source.length;i++)peak=Math.max(peak,Math.max(0,Math.min(1,Number(source[i])||0)));
      out[bin]=peak;
    }
    return out;
  }
  audioContext(){if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();return this.ctx}
  blobKey(blob){if(!blob||!(typeof blob==='object'||typeof blob==='function'))return 'no-blob';if(!this.blobKeys.has(blob))this.blobKeys.set(blob,this.nextBlobKey++);return this.blobKeys.get(blob)}
  async peaks(asset,bins=2048){
    if(!asset?.blob)return null;
    const id=ProfitMenteWaveformEngine.canonicalId(asset.id)??'anonymous',count=Math.max(32,Math.min(4096,Math.floor(Number(bins)||2048))),key=`${id}:${this.blobKey(asset.blob)}:${count}`;
    if(this.cache.has(key))return this.cache.get(key);
    if(this.pending.has(key))return this.pending.get(key);
    const job=(async()=>{try{
      const raw=await asset.blob.arrayBuffer();
      const buffer=await this.audioContext().decodeAudioData(raw.slice(0));
      const channels=[];for(let c=0;c<buffer.numberOfChannels;c++)channels.push(buffer.getChannelData(c));
      const len=buffer.length,step=Math.max(1,len/count),out=[];
      for(let i=0;i<count;i++){
        const from=Math.floor(i*step),to=Math.min(len,Math.max(from+1,Math.ceil((i+1)*step)));let max=0,sampleStep=Math.max(1,Math.floor((to-from)/24));
        for(let s=from;s<to;s+=sampleStep){let sum=0;for(const ch of channels)sum+=Math.abs(ch[s]||0);max=Math.max(max,channels.length?sum/channels.length:0)}
        out.push(max);
      }
      const norm=Math.max(.001,...out),values=out.map(v=>v/norm);values.sourceDuration=Number(buffer.duration)||0;this.cache.set(key,values);return values;
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
      const clip=ProfitMenteWaveformEngine.findById(project?.clips,el.dataset.id);if(!clip||!ProfitMenteWaveformEngine.isAudioTrack(clip.track)||ProfitMenteWaveformEngine.canonicalId(clip.asset)===null)continue;
      const asset=ProfitMenteWaveformEngine.findById(assets,clip.asset);if(!asset||String(asset.type||'').toLowerCase()!=='audio'||!asset.blob)continue;
      let canvas=el.querySelector('.waveform');if(!canvas){canvas=document.createElement('canvas');canvas.className='waveform';el.prepend(canvas)}
      const bins=Math.max(28,Math.min(180,Math.round(el.clientWidth/3))),full=await this.peaks(asset,2048);if(!full||!el.isConnected)continue;
      const sourceDuration=Math.max(0,Number(asset.duration)||Number(full.sourceDuration)||0),visible=ProfitMenteWaveformEngine.slicePeaks(full,{sourceOffset:clip.sourceOffset,clipDuration:clip.duration,speed:clip.speed,sourceDuration,bins});this.draw(canvas,visible);
    }
  }
}
if(typeof window!=='undefined'){
  window.ProfitMenteWaveformEngine=ProfitMenteWaveformEngine;
  (()=>{
    const css=document.createElement('style');css.textContent='.clip{isolation:isolate}.clip .waveform{position:absolute;inset:1px 7px 1px 2px;width:calc(100% - 9px);height:calc(100% - 2px);opacity:.52;pointer-events:none;z-index:-1}.clip[data-waveform="1"]{background:#202b3b}';document.head.appendChild(css);
    const engine=new ProfitMenteWaveformEngine();window.profitMenteWaveform=engine;
    const install=()=>{if(typeof window.drawTimeline!=='function')return false;const original=window.drawTimeline;if(original.__waveformPatched)return true;function patched(){const result=original.apply(this,arguments);requestAnimationFrame(()=>engine.decorate(project,assets).catch(console.warn));return result}patched.__waveformPatched=true;window.drawTimeline=patched;requestAnimationFrame(()=>engine.decorate(project,assets).catch(console.warn));return true};
    if(!install())window.addEventListener('DOMContentLoaded',install,{once:true});
  })();
}
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteWaveformEngine;
