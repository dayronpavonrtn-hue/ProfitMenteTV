class ProfitMenteWebMRenderEngine{
  constructor(){this._session=null;this._seq=0}
  static finiteNumber(value,fallback=NaN){
    if(typeof value==='boolean'||typeof value==='symbol'||value===null||value===undefined)return fallback;
    if(typeof value!=='number'&&typeof value!=='string')return fallback;
    if(typeof value==='string'&&!value.trim())return fallback;
    const n=Number(value);return Number.isFinite(n)?n:fallback;
  }
  static normalizeDuration(value){const n=this.finiteNumber(value,0);return n>0?n:0}
  static normalizeFps(value){const n=Math.round(this.finiteNumber(value,30));return Math.max(1,Math.min(60,n))}
  static framePlan(duration,fps=30){
    duration=this.normalizeDuration(duration);fps=this.normalizeFps(fps);
    const totalFrames=Math.max(1,Math.ceil(duration*fps));
    return {duration,fps,totalFrames,frameDuration:1/fps,timeAt(index){const n=ProfitMenteWebMRenderEngine.finiteNumber(index,0);return Math.min(duration,Math.max(0,n)/fps)}};
  }
  static mimeType(MediaRecorderCtor=globalThis.MediaRecorder){
    const candidates=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
    if(!MediaRecorderCtor)return '';
    if(typeof MediaRecorderCtor.isTypeSupported!=='function')return 'video/webm';
    return candidates.find(type=>MediaRecorderCtor.isTypeSupported(type))||'';
  }
  static normalizeQuality(value='high'){
    const key=String(value||'high').trim().toLowerCase();
    return ['draft','standard','high'].includes(key)?key:'high';
  }
  static recorderOptions({mimeType='',quality='high',width=1080,height=1920,fps=30}={}){
    quality=this.normalizeQuality(quality);fps=this.normalizeFps(fps);
    width=Math.max(1,Math.round(this.finiteNumber(width,1080)));height=Math.max(1,Math.round(this.finiteNumber(height,1920)));
    const preset={draft:{video:3000000,audio:128000},standard:{video:6000000,audio:160000},high:{video:10000000,audio:192000}}[quality];
    const scale=Math.max(.35,Math.min(2,(width*height)/(1080*1920)*(fps/30)));
    const videoBitsPerSecond=Math.round(Math.max(1000000,Math.min(20000000,preset.video*scale)));
    return {mimeType,videoBitsPerSecond,audioBitsPerSecond:preset.audio};
  }
  static shouldBlockEditEvent({active=false,type='',key='',targetId='',withinEditor=true}={}){
    if(!active||!withinEditor)return false;
    if(String(targetId||'')==='cancelWebmBtn')return false;
    const event=String(type||'').toLowerCase();
    if(event==='keydown')return String(key||'').toLowerCase()!=='escape';
    return ['click','dblclick','pointerdown','input','change','paste','drop','submit'].includes(event);
  }
  static shouldWarnBeforeUnload({active=false,locked=false}={}){return !!active&&!!locked}
  static _assetDescriptor(asset){
    const blob=asset?.blob;
    return {
      id:asset?.id??null,
      name:asset?.name??'',
      type:asset?.type??'',
      mime:asset?.mime??blob?.type??'',
      size:this.finiteNumber(blob?.size??asset?.size,0),
      lastModified:this.finiteNumber(blob?.lastModified??asset?.sourceLastModified,0),
      duration:this.finiteNumber(asset?.duration,0),
      width:this.finiteNumber(asset?.width,0),
      height:this.finiteNumber(asset?.height,0),
      mediaReadable:asset?.mediaReadable===false?false:true,
      metadataVersion:this.finiteNumber(asset?.metadataVersion,0),
      sourceFingerprint:String(asset?.sourceFingerprint||''),
      sourceContentHash:String(asset?.sourceContentHash||''),
      sourceLegacyContentHash:String(asset?.sourceLegacyContentHash||''),
      sourceHashVersion:String(asset?.sourceHashVersion||'')
    };
  }
  static stateSignature(project,assets=[]){
    const safeAssets=Array.isArray(assets)?assets.map(asset=>this._assetDescriptor(asset)).sort((a,b)=>String(a.id).localeCompare(String(b.id))):[];
    try{return JSON.stringify({project,assets:safeAssets})}
    catch{return ''}
  }
  static captureState(project,assets=[]){
    return {projectRef:project,signature:this.stateSignature(project,assets)};
  }
  static assertState(snapshot,project,assets=[]){
    const changed=!snapshot||snapshot.projectRef!==project||!snapshot.signature||snapshot.signature!==this.stateSignature(project,assets);
    if(changed){
      const error=new Error('El proyecto o sus medios cambiaron durante el render');
      error.name='InvalidStateError';error.code='WEBM_STATE_CHANGED';throw error;
    }
    return true;
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