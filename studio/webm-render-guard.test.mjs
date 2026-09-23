import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('./webm-render-guard.js',import.meta.url),'utf8');

const required=[
  "if(activeJob){cancelActive();return}",
  "event.key==='Escape'&&activeJob",
  "Render WebM bloqueado: duración de proyecto inválida",
  "report?.issues?.length",
  "withTimeout(audio.schedule(project,assets,0,false),10000",
  "withTimeout(renderAt(t),maxFrameMs",
  "if(job.cancelled)throw new Error('Render cancelado por el usuario')",
  "if(job.recorder.state!=='recording')throw new Error('MediaRecorder se detuvo antes de completar el proyecto')",
  "await withTimeout(finished,10000",
  "if(!blob.size)throw new Error('El render produjo un archivo vacío')",
  "safeStop(job.mixed);safeStop(job.videoStream)",
  "if(activeJob===job)activeJob=null"
];

for(const fragment of required){
  assert.ok(source.includes(fragment),`Falta protección WebM: ${fragment}`);
}

const start=source.indexOf('job.recorder.start(1000)');
const stop=source.indexOf('job.recorder.stop()',start);
const finish=source.indexOf('await withTimeout(finished,10000',stop);
const blob=source.indexOf('const blob=new Blob',finish);
assert.ok(start>=0&&stop>start&&finish>stop&&blob>finish,'El orden seguro de finalización MediaRecorder cambió');

const cleanup=source.indexOf('safeStop(job.mixed);safeStop(job.videoStream)');
const reset=source.indexOf('if(activeJob===job)activeJob=null',cleanup);
assert.ok(cleanup>=0&&reset>cleanup,'La limpieza debe ocurrir antes de liberar el trabajo activo');

console.log('WebM render guard regression: OK');
