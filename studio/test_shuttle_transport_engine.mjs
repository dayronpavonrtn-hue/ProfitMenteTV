import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(path.join(here,'shuttle-transport-engine.js'),'utf8');
const context={module:{exports:{}},exports:{},console};
vm.createContext(context);vm.runInContext(source,context,{filename:'shuttle-transport-engine.js'});
const E=context.module.exports;

for(const [value,expected] of [[30,30],['30',30],[' 24.0 ',24],['-0',-0]]){
  const actual=E.scalarNumber(value);
  if(!Object.is(actual,expected))throw new Error(`numeric scalar mismatch for ${String(value)}`);
}
for(const value of [false,true,[30],{valueOf(){return 30}},new Number(30),Symbol('30'),'30fps','']){
  if(E.scalarNumber(value)!==null)throw new Error('coercible/non-scalar numeric input must be rejected');
}

let rate=0;
rate=E.nextRate(rate,'L');if(rate!==1)throw new Error('L must start forward playback at 1x');
rate=E.nextRate(rate,'L');if(rate!==2)throw new Error('repeated L must advance to 2x');
rate=E.nextRate(rate,'L');if(rate!==4)throw new Error('repeated L must advance to 4x');
rate=E.nextRate(rate,'J');if(rate!==-1)throw new Error('J must reverse direction at 1x');
rate=E.nextRate(rate,'J');if(rate!==-2)throw new Error('repeated J must advance reverse shuttle to 2x');
rate=E.nextRate(rate,'K');if(rate!==0)throw new Error('K must stop shuttle playback');

let moved=E.advance(5,.5,2,10);
if(moved.time!==6||moved.ended)throw new Error('2x forward shuttle timing is incorrect');
moved=E.advance(1,1,-2,10);
if(moved.time!==0||!moved.ended)throw new Error('reverse shuttle must clamp and stop at project start');
moved=E.advance(9,1,4,10);
if(moved.time!==10||!moved.ended)throw new Error('forward shuttle must clamp and stop at project end');
moved=E.advance(5,[1],2,10);
if(moved.time!==5||moved.ended)throw new Error('invalid elapsed values must not move playback');
moved=E.advance(5,1,new Number(2),10);
if(moved.time!==5||moved.ended)throw new Error('invalid shuttle rates must normalize to stop');

console.log('ProfitMente Studio JKL shuttle transport regression OK');
