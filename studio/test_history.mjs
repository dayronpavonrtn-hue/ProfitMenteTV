globalThis.window=globalThis;
await import('./history-engine.js');
const h=new ProfitMenteHistoryEngine(3);
let p={version:'1',clips:[]};
h.seed(p);
p={version:'1',clips:[{id:'a',start:0,duration:2}]};h.capture(p);
p={version:'1',clips:[{id:'a',start:1,duration:2}]};h.capture(p);
let u=h.undo(p);if(u.clips[0].start!==0)throw new Error('Undo no restauró el estado anterior');
let r=h.redo(u);if(r.clips[0].start!==1)throw new Error('Redo no restauró el estado siguiente');
h.capture(r);if(h.redoStack.length!==0)throw new Error('Una nueva edición debe limpiar redo');
for(let i=0;i<6;i++){p={version:'1',clips:[{id:'a',start:i,duration:2}]};h.capture(p)}
if(h.undoStack.length>3)throw new Error('El límite de historial no se respeta');
console.log('History engine OK');