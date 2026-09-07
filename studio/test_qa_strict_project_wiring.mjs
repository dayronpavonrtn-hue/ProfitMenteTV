import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
const guard='qa-strict-project-guard.js';
const guardCount=scripts.filter(s=>s===guard).length;
if(guardCount!==1) throw new Error(`Strict project guard must be loaded exactly once, found ${guardCount}`);
const qaIndex=scripts.indexOf('qa-engine.js');
const guardIndex=scripts.indexOf(guard);
const mediaGuardIndex=scripts.indexOf('qa-media-identity-guard.js');
if(qaIndex<0||guardIndex<=qaIndex) throw new Error('Strict project guard must load after qa-engine.js');
if(mediaGuardIndex<0||guardIndex>=mediaGuardIndex) throw new Error('Strict project guard must load before qa-media-identity-guard.js');
if(!html.includes('const qa=new ProfitMenteQAEngine()')) throw new Error('Studio QA runtime instance not found');
if(!html.includes("document.querySelector('#renderMp4Btn').onclick")) throw new Error('Studio MP4 render action not found');
console.log('Strict project QA wiring OK: browser QA and MP4 path load the guard before runtime use');
