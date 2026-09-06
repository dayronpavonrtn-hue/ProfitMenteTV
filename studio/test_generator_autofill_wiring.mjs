import fs from 'node:fs';
import assert from 'node:assert/strict';

const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
const mediaImport=fs.readFileSync(new URL('./media-import-engine.js',import.meta.url),'utf8');
const autoFill=fs.readFileSync(new URL('./generator-autofill.js',import.meta.url),'utf8');
const generator=fs.readFileSync(new URL('./generator-engine.js',import.meta.url),'utf8');
const integration=fs.readFileSync(new URL('./generator-integration.js',import.meta.url),'utf8');

assert.ok(mediaImport.includes("new CustomEvent('profitmente:media-imported'"),'el importador debe emitir el evento de medios importados');
assert.ok(mediaImport.includes('assetIds:addedIds'),'el evento debe identificar solo los medios realmente añadidos');
assert.ok(autoFill.includes("document.addEventListener('profitmente:media-imported'"),'auto-fill debe escuchar el evento del importador');
assert.ok(autoFill.includes("project?.mode!=='Automático'"),'auto-fill debe quedar limitado al modo Automático');
assert.ok(autoFill.includes("a?.type==='video'||a?.type==='image'"),'las importaciones visuales deben poder completar escenas vacías');
assert.ok(autoFill.includes("a=>a?.type==='audio'"),'las importaciones de audio deben poder completar roles automáticos pendientes');
assert.ok(autoFill.includes('asset.mediaReadable===false'),'auto-fill debe rechazar medios marcados como no decodificables');
assert.ok(autoFill.includes('this.engine.assignNarration?.(project,usable)'),'audio importado después de generar debe conectar narración solo con medios utilizables');
assert.ok(autoFill.includes('this.engine.assignSoundtrack?.(project,usable)'),'audio importado después de generar debe conectar música solo con medios utilizables');
assert.ok(autoFill.includes('this.engine.assignTransitionSfx?.(project,usable)'),'audio importado después de generar debe conectar SFX solo con medios utilizables');
assert.ok(integration.includes('const usableAssets=()'),'la generación inicial debe filtrar la biblioteca antes de asignar medios');
assert.ok(integration.includes('engine.assignAssets(project,usableAssets())'),'la generación inicial no debe entregar medios offline al motor');
assert.ok(autoFill.includes('if(!result.changed)return'),'no debe guardar ni redibujar cuando el proyecto no cambia');
assert.ok(autoFill.includes('save?.()'),'un relleno efectivo debe persistir y refrescar el proyecto');
assert.ok(generator.includes('mediaKey(value)'),'el generador debe normalizar identidad de medios antes de decidir si un clip ya está asignado');
assert.ok(generator.includes('hasAsset(clip)'),'el generador debe centralizar la comprobación de medios asignados');
assert.ok(generator.includes("clips.filter(c=>this.canonicalTrack(c?.track)==='0'&&!this.hasAsset(c)&&!this.clipLocked(project,c))"),'el generador debe limitar la asignación a escenas visuales vacías y editables usando identidad canónica');
assert.ok(generator.includes('!brollLocked&&c.duration>=4'),'B-roll automático debe respetar el bloqueo de su pista');
assert.ok(generator.includes('if(this.trackLocked(project,6))return 0'),'narración automática debe respetar el bloqueo de pista');
assert.ok(generator.includes('if(this.trackLocked(project,5)'),'música automática debe respetar el bloqueo de pista');
assert.ok(generator.includes('if(this.trackLocked(project,4)'),'SFX automáticos deben respetar el bloqueo de pista');
assert.ok(bootstrap.indexOf("'media-import-engine.js'")<bootstrap.indexOf("'generator-autofill.js'"),'el listener de auto-fill debe instalarse después del importador');

console.log('Generator autofill wiring regression OK');
