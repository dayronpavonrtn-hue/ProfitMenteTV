(function(root){
  const QA=root?.ProfitMenteQAEngine;
  const integrity=root?.ProfitMenteMediaIntegrityEngine;
  if(!QA||!integrity||QA.prototype.__profitMenteMediaIntegrityIntegration)return;

  const originalInspect=QA.prototype.inspect;
  QA.prototype.inspect=function(project,assets){
    const result=originalInspect.call(this,project,assets);
    const media=integrity.inspectProject(project,assets);
    if(media.ok)return {...result,metrics:{...(result.metrics||{}),mediaIntegrityIssues:0}};

    const issues=Array.isArray(result.issues)?result.issues.slice():[];
    for(const issue of media.issues){
      const message=issue.code==='missing_media'
        ?`Medio faltante en timeline: ${String(issue.mediaId)}`
        :`Medio inválido (${issue.code}): ${String(issue.assetId??issue.mediaId??'desconocido')}`;
      if(!issues.includes(message))issues.push(message);
    }
    return {
      ...result,
      ok:false,
      issues,
      score:Math.max(0,Number(result.score||0)-media.issues.length*25),
      metrics:{...(result.metrics||{}),mediaIntegrityIssues:media.issues.length}
    };
  };

  QA.prototype.__profitMenteMediaIntegrityIntegration=true;
  root.ProfitMenteQAMediaIntegrityIntegration={installed:true};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.ProfitMenteQAMediaIntegrityIntegration;
})(typeof window!=='undefined'?window:globalThis);
