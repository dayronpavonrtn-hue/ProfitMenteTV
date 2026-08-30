class ProfitMenteWebMRenderEngine{
  constructor(){this._session=null;this._seq=0}
  static normalizeDuration(value){const n=Number(value);return Number.isFinite(n)&&n>0?n:0}
  static normalizeFps(value){const n=Math.round(Number(value)||30);return Math.max(1,Math.min(60,n))}
  static framePlan(duration,fps=30){
    duration=this.normalizeDuration(duration);fps=this.normalizeFps(fps);
    const totalFrames=Math.max(1,Math.ceil(duration*fps));
    return {duration,fps,totalFrames,frameDuration:1/fps,timeAt(index){return Math.min(duration,Math.max(0,Number(index)||0)/fps)}};
  }
  static mimeType(MediaRecorderCtor=globalThis.MediaRecorder){
    const candidates=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
    if(!MediaRecorderCtor)return '';
    if(typeof MediaRecorderCtor.isTypeSupported!=='function')return 'video/webm';
    return candidates.find(type=>MediaRecorderCtor.isTypeSupported(type))||'';
  }
  get active(){return !!this._session&&!this._session.done}
  get cancelled(){return !!this._session?.cancelled}
  begin(meta={}){
    if(this.active)throw new Error('Ya hay un render WebM activo');
    const session={id:++this._seq,cancelled:false,done:false,startedAt:Date.now(),...meta};this._session=session;return session;
  }
  cancel(){if(!this.active)return false;this._session.cancelled=true;return true}
  assert(session){
    if(!session||session!==this._session||session.done)throw new DOMException('La sesión de render ya no está activa','AbortError');
    if(session.cancelled)throw new DOMException('Render WebM cancelado','AbortError');
    return true;
  }
  finish(session){if(session&&session===this._session){session.done=true;return true}return false}
  reset(){if(this._session)this._session.done=true;this._session=null}
}
if(typeof window!=='undefined')window.ProfitMenteWebMRenderEngine=ProfitMenteWebMRenderEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteWebMRenderEngine;
