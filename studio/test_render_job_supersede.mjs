import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Client=require('./render-job-client.js');

const mp4Bytes=new Uint8Array([0,0,0,24,0x66,0x74,0x79,0x70,0x69,0x73,0x6f,0x6d,0,0,2,0,0x69,0x73,0x6f,0x6d,0x69,0x73,0x6f,0x32,0,0,0,8,0x66,0x72,0x65,0x65]);
const deferred=()=>{let resolve,reject;const promise=new Promise((res,rej)=>{resolve=res;reject=rej});return {promise,resolve,reject}};

// A wait that started for job A must never begin polling job B after attach(B).
{
  const firstStatus=deferred();
  const urls=[];
  const fetchFn=async(url)=>{
    urls.push(url);
    if(url==='/api/render/jobs/job-a')return firstStatus.promise;
    if(url==='/api/render/jobs/job-b')return new Response(JSON.stringify({ok:true,job_id:'job-b',status:'done',progress:100}),{status:200,headers:{'content-type':'application/json'}});
    return new Response('{}',{status:404,headers:{'content-type':'application/json'}});
  };
  const client=new Client({fetchFn,interval:1,requestTimeoutMs:100});
  client.attach('job-a');
  const oldWait=client.wait();
  await new Promise(resolve=>setTimeout(resolve,0));
  client.attach('job-b');
  firstStatus.resolve(new Response(JSON.stringify({ok:true,job_id:'job-a',status:'rendering',progress:20}),{status:200,headers:{'content-type':'application/json'}}));
  await assert.rejects(oldWait,error=>error?.name==='AbortError'&&error?.code==='RENDER_JOB_SUPERSEDED');
  assert.equal(client.jobId,'job-b');
  assert.equal(client.cancelled,false);
  assert.equal(urls.filter(url=>url==='/api/render/jobs/job-b').length,0,'the superseded wait must not poll the replacement job');
  const current=await client.wait();
  assert.equal(current.status,'done');
}

// A result retry for job A must not switch its download URL to job B.
{
  const urls=[];
  let aAttempts=0;
  const fetchFn=async(url)=>{
    urls.push(url);
    if(url==='/api/render/jobs/job-a/result'){
      aAttempts+=1;
      return new Response(JSON.stringify({error:'temporary'}),{status:503,headers:{'content-type':'application/json'}});
    }
    if(url==='/api/render/jobs/job-b/result')return new Response(new Blob([mp4Bytes],{type:'video/mp4'}),{status:200,headers:{'content-type':'video/mp4'}});
    return new Response('{}',{status:404,headers:{'content-type':'application/json'}});
  };
  const client=new Client({fetchFn,interval:10,maxRetryDelay:10,resultMaxAttempts:2});
  client.attach('job-a');
  const oldResult=client.result({onRetry:()=>client.attach('job-b')});
  await assert.rejects(oldResult,error=>error?.name==='AbortError'&&error?.code==='RENDER_JOB_SUPERSEDED');
  assert.equal(aAttempts,1,'superseding the job should stop retries for the old result');
  assert.equal(urls.filter(url=>url==='/api/render/jobs/job-b/result').length,0,'old result must never download the replacement job');
}

// A late cancellation response for job A must not mark replacement job B as cancelled.
{
  const deletion=deferred();
  const fetchFn=async(url,options={})=>{
    if(url==='/api/render/jobs/job-a'&&options.method==='DELETE')return deletion.promise;
    if(url==='/api/render/jobs/job-b')return new Response(JSON.stringify({ok:true,job_id:'job-b',status:'done',progress:100}),{status:200,headers:{'content-type':'application/json'}});
    return new Response('{}',{status:404,headers:{'content-type':'application/json'}});
  };
  const client=new Client({fetchFn,interval:1,requestTimeoutMs:100});
  client.attach('job-a');
  const oldCancel=client.cancel();
  await new Promise(resolve=>setTimeout(resolve,0));
  client.attach('job-b');
  deletion.resolve(new Response(JSON.stringify({ok:true,job_id:'job-a',status:'cancelled'}),{status:200,headers:{'content-type':'application/json'}}));
  const cancelled=await oldCancel;
  assert.equal(cancelled.status,'cancelled');
  assert.equal(client.jobId,'job-b');
  assert.equal(client.cancelled,false,'late cancellation of job A must not poison job B');
  const current=await client.wait();
  assert.equal(current.status,'done');
}

// Reset invalidates in-flight work instead of letting it resume against a future job.
{
  const status=deferred();
  const client=new Client({fetchFn:async()=>status.promise,interval:1,requestTimeoutMs:100});
  client.attach('job-a');
  const waiting=client.wait();
  await new Promise(resolve=>setTimeout(resolve,0));
  client.reset();
  status.resolve(new Response(JSON.stringify({ok:true,job_id:'job-a',status:'rendering',progress:50}),{status:200,headers:{'content-type':'application/json'}}));
  await assert.rejects(waiting,error=>error?.name==='AbortError'&&error?.code==='RENDER_JOB_SUPERSEDED');
  assert.equal(client.jobId,null);
}

console.log('render job supersede isolation ok');
