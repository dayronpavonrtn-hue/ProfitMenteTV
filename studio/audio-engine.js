class ProfitMenteAudioEngine{
 constructor(){this.ctx=null;this.master=null;this.nodes=[]}
 init(){if(this.ctx)return;this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination)}
 async buffer(blob){this.init();return await this.ctx.decodeAudioData(await blob.arrayBuffer())}
 async schedule(project,assets,from=0){this.stop();this.init();await this.ctx.resume();const now=this.ctx.currentTime+.05;for(const clip of project.clips.filter(c=>[4,5,6].includes(c.track)&&c.asset&&c.start+c.duration>from)){const a=assets.find(x=>x.id===clip.asset);if(!a||a.type!=='audio')continue;try{const src=this.ctx.createBufferSource(),gain=this.ctx.createGain(),buf=await this.buffer(a.blob);src.buffer=buf;src.connect(gain);gain.connect(this.master);let volume=clip.volume??(clip.track===5?.22:1),start=Math.max(clip.start,from),offset=Math.max(0,from-clip.start),dur=Math.min(clip.duration-offset,buf.duration-offset),at=now+(start-from);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+Math.min(.18,dur/3));gain.gain.setValueAtTime(volume,Math.max(at+.18,at+dur-.25));gain.gain.linearRampToValueAtTime(0,at+dur);src.start(at,offset,dur);this.nodes.push(src)}catch(e){console.warn('Audio omitido',a.name,e)}}}
 stop(){for(const n of this.nodes)try{n.stop()}catch{}this.nodes=[]}
 setMaster(v){this.init();this.master.gain.value=Math.max(0,Math.min(2,v))}
}
window.ProfitMenteAudioEngine=ProfitMenteAudioEngine;