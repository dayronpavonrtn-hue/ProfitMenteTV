import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const Client=require('./render-job-client.js');

const calls=[];let polls=0;
const fetchFn=async(url,options={})=>{
  calls.push([url,options.method||'GET']);
  if(url==='/api/render/jobs')return new Response(JSON.stringify({ok:true,job_id:'job1',status:'queued',progress:10}),{status:202,headers:{'content-type':'application/json'}});
  if(url==='/api/render/jobs/job1'&&(!options.method||options.method==='GET')){polls++;const data=polls<2?{ok:true,job_id:'job1',status:'rendering',progress:35,elapsed:1}:{ok:true,job_id:'job1',status:'done',progress:100,elapsed:2};return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}})}
  if(url==='/api/render/jobs/job1/result')return new Response(new Blob(['mp4']),{status:200,headers:{'content-type':'video/mp4'}});
  if(url==='/api/render/jobs/job1'&&options.method==='DELETE')return new Response(JSON.stringify({ok:true,job_id:'job1',status:'cancelled'}),{status:200,headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify({error:'missing'}),{status:404,headers:{'content-type':'application/json'}});
};
const client=new Client({fetchFn,interval:1});
const started=await client.start(new Blob(['bundle']));assert.equal(started.job_id,'job1');
const seen=[];const done=await client.wait(s=>seen.push(s.status));assert.equal(done.status,'done');assert.deepEqual(seen,['rendering','done']);
const result=await client.result();assert.equal(await result.text(),'mp4');
assert.ok(calls.some(([u,m])=>u==='/api/render/jobs'&&m==='POST'));
client.reset();await client.start(new Blob(['bundle']));const cancelled=await client.cancel();assert.equal(cancelled.status,'cancelled');assert.equal(client.cancelled,true);
console.log('render job client ok');
