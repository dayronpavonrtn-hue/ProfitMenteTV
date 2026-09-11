const assert=require('node:assert/strict');
const ProfitMenteSplitEditEngine=require('./split-edit-engine.js');

function split(clip,time){return ProfitMenteSplitEditEngine.split(clip,time,{idFactory:()=> 'right'});}

{
  const result=split({id:'cap',track:3,name:'ONE CROSS TWO',start:10,duration:6,wordTimingMode:'relative',wordTimings:[
    {word:'ONE',start:0.2,end:1.2,duration:1},
    {word:'CROSS',start:2.5,end:3.5,duration:1},
    {word:'TWO',start:4,end:5,duration:1}
  ]},13);
  assert.equal(result.ok,true);
  assert.equal(result.left.wordTimingMode,'relative');
  assert.equal(result.right.wordTimingMode,'relative');
  assert.deepEqual(result.left.wordTimings.map(w=>[w.word,w.start,w.end]),[['ONE',0.2,1.2],['CROSS',2.5,3]]);
  assert.deepEqual(result.right.wordTimings.map(w=>[w.word,w.start,w.end]),[['CROSS',0,0.5],['TWO',1,2]]);
  assert.equal(result.left.name,'ONE CROSS');
  assert.equal(result.right.name,'CROSS TWO');
}

{
  const result=split({id:'legacy',track:3,name:'LEGACY MODE',start:20,duration:5,wordTimings:[
    {word:'LEGACY',start:0,end:1.5},
    {word:'MODE',start:2.5,end:4.5}
  ]},22);
  assert.equal(result.ok,true);
  assert.equal(result.left.wordTimingMode,'relative');
  assert.equal(result.right.wordTimingMode,'relative');
  assert.deepEqual(result.left.wordTimings.map(w=>[w.word,w.start,w.end]),[['LEGACY',0,1.5]]);
  assert.deepEqual(result.right.wordTimings.map(w=>[w.word,w.start,w.end]),[['MODE',0.5,2.5]]);
}

{
  const result=split({id:'absolute',track:3,name:'ABSOLUTE',start:10,duration:4,wordTimingMode:'absolute',wordTimings:[
    {word:'ABS',start:10.5,end:11.5},
    {word:'TIME',start:12.5,end:13.5}
  ]},12);
  assert.equal(result.ok,true);
  assert.equal(result.left.wordTimingMode,'absolute');
  assert.equal(result.right.wordTimingMode,'absolute');
  assert.deepEqual(result.left.wordTimings.map(w=>[w.word,w.start,w.end]),[['ABS',10.5,11.5]]);
  assert.deepEqual(result.right.wordTimings.map(w=>[w.word,w.start,w.end]),[['TIME',12.5,13.5]]);
}

console.log('Split edit relative word timing regression: OK');
