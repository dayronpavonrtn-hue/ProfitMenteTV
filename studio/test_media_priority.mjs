import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);

const {ProfitMenteMediaPriorityEngine:Priority}=require('./media-priority-engine.js');
const plain={id:'a',name:'mercado vertical.mp4',type:'video'};
assert.equal(Priority.isPreferred(plain),false);
assert.equal(Priority.toggle(plain),true);
assert.equal(Priority.bonus(plain),5);
assert.equal(Priority.toggle(plain),false);
assert.equal(Priority.bonus(plain),0);
const preferred={id:'b',name:'favorito.mp4',type:'video',preferred:true};
assert.deepEqual(Priority.preferred([plain,preferred]).map(a=>a.id),['b']);
assert.equal(Priority.sort([plain,preferred])[0].id,'b');

const integration=fs.readFileSync(new URL('./media-priority-integration.js',import.meta.url),'utf8');
assert.ok(integration.includes('ProfitMenteGeneratorEngine.prototype.scoreAsset=function'));
assert.ok(integration.includes('+engine.bonus(asset)'));
assert.ok(integration.includes('meta.preferred=engine.isPreferred(asset)'));

const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
assert.ok(bootstrap.indexOf("media-priority-engine.js")<bootstrap.indexOf("media-priority-integration.js"));
assert.ok(bootstrap.includes("'ProfitMenteMediaPriority'"));
console.log('media priority regression: ok');
