import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const tools=fs.readFileSync(path.join(root,'media-library-tools.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

if(!/createElement\(['"]button['"]\)[\s\S]{0,160}className=['"]mediaCard['"]/.test(app)){
  throw new Error('app.js no marca los medios renderizados con la clase mediaCard requerida por las herramientas de biblioteca');
}
if(!tools.includes("querySelectorAll(':scope > .mediaCard')")){
  throw new Error('media-library-tools.js ya no consume el contrato .mediaCard esperado por la prueba');
}
for(const token of ['mediaRow','mediaDelete','mediaProxyActions','applyFilter()']){
  if(!tools.includes(token))throw new Error('Herramienta de biblioteca no conectada: '+token);
}
const appPos=html.indexOf('src="app.js"');
const toolsPos=html.indexOf('src="media-library-tools.js"');
const deleteGuardPos=html.indexOf('src="media-library-delete-guard.js"');
if(appPos<0||toolsPos<0||deleteGuardPos<0||!(appPos<toolsPos&&toolsPos<deleteGuardPos)){
  throw new Error('Orden de carga inválido: app.js debe cargar antes de media-library-tools.js y del guard de borrado');
}

console.log('ProfitMente media library card wiring regression: OK');
