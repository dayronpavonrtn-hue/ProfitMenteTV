class ProfitMenteRenderJobClient{
  constructor({fetchFn,interval=750}={}){this.fetchFn=fetchFn||globalThis.fetch?.bind(globalThis);this.interval=interval;this.jobId=null;this.cancelled=false}
  async json(url,options){const r=await this.fetchFn(url,options);let data={};try{data=await r.json()}catch{}if(!r.ok)throw new Error(data.error||`Error HTTP ${r.status}`);return data}
  async start(bundle){if(!this.fetchFn)throw new Error('Fetch no disponible');this.cancelled=false;const data=await this.json('/api/render/jobs',{method:'POST',headers:{'Content-Type':'application/x-tar'},body:bundle});if(!data.job_id)throw new Error('El servidor no devolvió un trabajo de render');this.jobId=data.job_id;return data}
  async status(){if(!this.jobId)throw new Error('No hay trabajo de render activo');return this.json(`/api/render/jobs/${encodeURIComponent(this.jobId)}`)}
  async result(){if(!this.jobId)throw new Error('No hay trabajo de render activo');const r=await this.fetchFn(`/api/render/jobs/${encodeURIComponent(this.jobId)}/result`);if(!r.ok){let data={};try{data=await r.json()}catch{}throw new Error(data.error||`Error HTTP ${r.status}`)}return r.blob()}
  async cancel(){if(!this.jobId)return {ok:true,status:'idle'};this.cancelled=true;return this.json(`/api/render/jobs/${encodeURIComponent(this.jobId)}`,{method:'DELETE'})}
  async wait(onProgress=()=>{}){if(!this.jobId)throw new Error('No hay trabajo de render activo');for(;;){const s=await this.status();onProgress(s);if(s.status==='done')return s;if(s.status==='error')throw new Error(s.error||'Falló el render');if(s.status==='cancelled'||this.cancelled)throw Object.assign(new Error('Render cancelado'),{name:'AbortError'});await new Promise(resolve=>setTimeout(resolve,this.interval))}}
  reset(){this.jobId=null;this.cancelled=false}
}
if(typeof window!=='undefined')window.ProfitMenteRenderJobClient=ProfitMenteRenderJobClient;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteRenderJobClient;
