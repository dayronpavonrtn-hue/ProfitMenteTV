import fs from 'node:fs';
import assert from 'node:assert/strict';

const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
const mediaImport=fs.readFileSync(new URL('./media-import-engine.js',import.meta.url),'utf8');
const autoFill=fs.readFileSync(new URL('./generator-autofill.js',import.meta.url),'utf8');
const generator=fs.readFileSync(new URL('./generator-engine.js',import.meta.url),'utf8');

assert.ok(mediaImport.includes("new CustomEvent('profitmente:media-imported'"),'el importador debe emitir el evento de medios importados');
assert.ok(mediaImport.includes('assetIds:addedIds'),'el evento debe identificar solo los medios realmente añadidos');
assert.ok(autoFill.includes("document.addEventListener('profitmente:media-imported'"),'auto-fill debe escuchar el evento del importador');
assert.ok(autoFill.includes("project?.mode!=='Automático'"),'auto-fill debe quedar limitado al modo Automático');
assert.ok(autoFill.includes("a?.type==='video'||a?.type==='image'"),'las importaciones visuales deben poder completar escenas vacías');
assert.ok(autoFill.includes("a=>a?.type==='audio'"),'las importaciones de audio deben poder completar roles automáticos pendientes');
assert.ok(autoFill.includes('this.engine.assignNarration?.(project,allAssets)'),'audio importado después de generar debe poder conectar narración');
assert.ok(autoFill.includes('this.engine.assignSoundtrack?.(project,allAssets)'),'audio importado después de generar debe poder conectar música');
assert.ok(autoFill.includes('this.engine.assignTransitionSfx?.(project,allAssets)'),'audio importado después de generar debe poder conectar SFX');
assert.ok(autoFill.includes('if(!result.changed)return'),'no debe guardar ni redibujar cuando el proyecto no cambia');
assert.ok(autoFill.includes('save?.()'),'un relleno efectivo debe persistir y refrescar el proyecto');
assert.ok(generator.includes("project.clips.filter(c=>Number(c.track)===0&&!c.asset&&!this.clipLocked(project,c))"),'el generador debe limitar la asignación a escenas visuales vacías y editables');
assert.ok(generator.includes('!brollLocked&&c.duration>=4'),'B-roll automático debe respetar el bloqueo de su pista');
assert.ok(generator.includes('if(this.trackLocked(project,6))return 0'),'narración automática debe respetar el bloqueo de pista');
assert.ok(generator.includes('if(this.trackLocked(project,5)'),'música automática debe respetar el bloqueo de pista');
assert.ok(generator.includes('if(this.trackLocked(project,4)'),'SFX automáticos deben respetar el bloqueo de pista');
assert.ok(bootstrap.indexOf("'media-import-engine.js'")<bootstrap.indexOf("'generator-autofill.js'"),'el listener de auto-fill debe instalarse después del importador');

console.log('Generator autofill wiring regression OK');
