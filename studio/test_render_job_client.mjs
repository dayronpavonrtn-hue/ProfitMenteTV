import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const Client=require('./render-job-client.js');

const mp4Bytes=new Uint8Array([0,0,0,24,0x66,0x74,0x79,0x70,0x69,0x73,0x6f,0x6d,0,0,2,0,0x69,0x73,0x6f,0x6d,0x69,0x73,0x6f,0x32,0,0,0,8,0x66,0x72,0x65,0x65]);
const calls=[];let polls=0;
const fetchFn=async(url,options={})=>{
  calls.push([url,options.method||'GET']);
  if(url==='/api/render/jobs')return new Response(JSON.stringify({ok:true,job_id:'job1',status:'queued',progress:10}),{status:202,headers:{'content-type':'application/json'}});
  if(url==='/api/render/jobs/job1'&&(!options.method||options.method==='GET')){polls++;const data=polls<2?{ok:true,job_id:'job1',status:'rendering',progress:35,elapsed:1}:{ok:true,job_id:'job1',status:'done',progress:100,elapsed:2,qc:{ok:true,score:100}};return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}})}
  if(url==='/api/render/jobs/job1/result')return new Response(new Blob([mp4Bytes],{type:'video/mp4'}),{status:200,headers:{'content-type':'video/mp4'}});
  if(url==='/api/render/jobs/job1'&&options.method==='DELETE')return new Response(JSON.stringify({ok:true,job_id:'job1',status:'cancelled'}),{status:200,headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify({error:'missing'}),{status:404,headers:{'content-type':'application/json'}});
};
const client=new Client({fetchFn,interval:1});
const started=await client.start(new Blob(['bundle']));assert.equal(started.job_id,'job1');
const seen=[];const done=await client.wait(s=>seen.push(s.status));assert.equal(done.status,'done');assert.deepEqual(seen,['rendering','done']);
const result=await client.result();assert.equal(result.type,'video/mp4');assert.equal(result.size,mp4Bytes.length);
assert.ok(calls.some(([u,m])=>u==='/api/render/jobs'&&m==='POST'));
client.reset();await client.start(new Blob(['bundle']));const cancelled=await client.cancel();assert.equal(cancelled.status,'cancelled');assert.equal(client.cancelled,true);

polls=1;
const resumed=new Client({fetchFn,interval:1});
assert.equal(resumed.attach('job1'),'job1');
const resumedState=await resumed.status();assert.equal(resumedState.status,'done');assert.equal(resumed.jobId,'job1');
assert.throws(()=>resumed.attach('   '),/inválido/i);

let flakyPolls=0;
const flakyFetch=async(url)=>{
  if(url!=='/api/render/jobs/flaky')return new Response('{}',{status:404,headers:{'content-type':'application/json'}});
  flakyPolls++;
  if(flakyPolls===1)throw new TypeError('network temporarily unavailable');
  if(flakyPolls===2)return new Response(JSON.stringify({error:'temporary server problem'}),{status:503,headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify({ok:true,job_id:'flaky',status:'done',progress:100,qc:{ok:true,score:100}}),{status:200,headers:{'content-type':'application/json'}});
};
const flaky=new Client({fetchFn:flakyFetch,interval:1,maxRetryDelay:2,maxConsecutiveErrors:3});flaky.attach('flaky');
const reconnect=[];const recovered=await flaky.wait(s=>reconnect.push(s.status));
assert.equal(recovered.status,'done');assert.deepEqual(reconnect,['reconnecting','reconnecting','done']);assert.equal(flakyPolls,3);

let stallPolls=0;
const stallFetch=async(url)=>{
  if(url!=='/api/render/jobs/stall')return new Response('{}',{status:404,headers:{'content-type':'application/json'}});
  stallPolls++;
  const data=stallPolls<4?{ok:true,job_id:'stall',status:'rendering',progress:48,phase:'Componiendo video',elapsed:stallPolls}:{ok:true,job_id:'stall',status:'done',progress:100,phase:'Completado',qc:{ok:true,score:100}};
  return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});
};
const stalled=new Client({fetchFn:stallFetch,interval:2,staleProgressMs:1});stalled.attach('stall');
const stalledStates=[];const stalledDone=await stalled.wait(s=>stalledStates.push(s));
assert.equal(stalledDone.status,'done');
assert.ok(stalledStates.some(s=>s.status==='rendering'&&s.progress_stale===true),'unchanged render progress should surface a non-fatal stale warning');
assert.ok(stalledStates.some(s=>Number(s.progress_stale_seconds)>=1),'stale warning should include an age');

const missing=new Client({fetchFn:async()=>new Response(JSON.stringify({error:'Trabajo de render no encontrado.'}),{status:404,headers:{'content-type':'application/json'}}),interval:1});missing.attach('missing');
await assert.rejects(()=>missing.wait(),/no encontrado/i);
console.log('render job client ok');
