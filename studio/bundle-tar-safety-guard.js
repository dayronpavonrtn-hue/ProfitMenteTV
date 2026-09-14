(function(g){
  const Bundle=g.ProfitMenteBundleEngine;
  if(!Bundle||Bundle.prototype.__profitmenteTarSafetyGuard)return;

  function isZeroBlock(bytes,start){
    if(start<0||start+512>bytes.length)return false;
    for(let i=start;i<start+512;i++)if(bytes[i]!==0)return false;
    return true;
  }

  function readTarSize(engine,header){
    const raw=engine.readString(header,124,12);
    const size=parseInt(raw||'0',8);
    if(!Number.isSafeInteger(size)||size<0)throw new Error('Paquete TAR inválido');
    return size;
  }

  async function validateTarFraming(engine,blob){
    if(!blob||typeof blob.arrayBuffer!=='function')throw new Error('Paquete TAR inválido');
    const bytes=new Uint8Array(await blob.arrayBuffer());
    let offset=0;
    let terminated=false;

    while(offset+512<=bytes.length){
      if(isZeroBlock(bytes,offset)){
        if(offset+1024>bytes.length)throw new Error('Paquete TAR truncado: falta terminador completo');
        if(!isZeroBlock(bytes,offset+512))throw new Error('Paquete TAR con terminador inválido');
        for(let i=offset+1024;i<bytes.length;i++)if(bytes[i]!==0)throw new Error('Paquete TAR contiene datos después del terminador');
        terminated=true;
        break;
      }

      const header=bytes.slice(offset,offset+512);
      const name=engine.readString(header,0,100);
      engine.assertTarHeaderChecksum(header,name||'entrada');
      if(!name)throw new Error('Paquete TAR inválido');
      const size=readTarSize(engine,header);
      offset+=512;
      const padded=Math.ceil(size/512)*512;
      if(offset+padded>bytes.length)throw new Error('Paquete TAR truncado');
      offset+=padded;
    }

    if(!terminated)throw new Error('Paquete TAR sin terminador válido');
    return true;
  }

  function validateManifestIntegrity(engine,project){
    if(!project||typeof project!=='object'||Array.isArray(project))throw new Error('Proyecto inválido en paquete');
    if(!Array.isArray(project.assets))throw new Error('Proyecto sin biblioteca de medios válida');
    if(!Array.isArray(project.clips))throw new Error('Proyecto sin clips válidos');

    const mediaIds=new Set();
    for(const meta of project.assets){
      if(!meta||typeof meta!=='object'||Array.isArray(meta))throw new Error('Entrada de medio inválida en paquete');
      const id=engine.canonicalMediaId(meta.id);
      if(!id)throw new Error('Medio sin identificador válido en paquete');
      if(mediaIds.has(id))throw new Error(`Identificador de medio duplicado en paquete: ${id}`);
      mediaIds.add(id);
    }

    for(const clip of project.clips){
      if(!clip||clip.asset===null||clip.asset===undefined)continue;
      const id=engine.canonicalMediaId(clip.asset);
      if(!id)throw new Error(`Clip con identificador de medio inválido: ${clip.id||'sin id'}`);
      if(!mediaIds.has(id))throw new Error(`Clip referencia un medio inexistente en paquete: ${id}`);
    }
    return true;
  }

  const originalParse=Bundle.prototype.parse;
  Bundle.prototype.parse=async function(blob){
    await validateTarFraming(this,blob);
    const restored=await originalParse.call(this,blob);
    validateManifestIntegrity(this,restored?.project);
    return restored;
  };
  Bundle.prototype.__profitmenteTarSafetyGuard=true;

  g.ProfitMenteBundleTarSafetyGuard={validateTarFraming,validateManifestIntegrity,readTarSize,isZeroBlock};
})(globalThis);