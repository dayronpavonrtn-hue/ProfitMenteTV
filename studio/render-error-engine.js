class ProfitMenteRenderErrorEngine{
  static diagnose(error){
    const raw=String(error?.message||error||'Error desconocido').trim();
    const text=raw.toLowerCase();
    const result={code:'render_failed',title:'El render MP4 falló',message:raw,action:'Revisa el proyecto y vuelve a intentar el render.',retryable:false};
    if(/ffmpeg|ffprobe/.test(text)&&/(not available|no está|not found|no se reconoce|enoent|missing)/.test(text))return {...result,code:'ffmpeg_missing',title:'FFmpeg no está disponible',action:'Instala FFmpeg gratis y vuelve a abrir Studio con start_studio_windows.bat.'};
    if(/no space left|disk full|espacio.*disco|not enough space/.test(text))return {...result,code:'disk_full',title:'No hay espacio suficiente en disco',action:'Libera espacio en la unidad temporal o de descargas y vuelve a renderizar.'};
    if(/missing media|medio.*falt|archivo.*falt|no such file|cannot find.*file/.test(text))return {...result,code:'missing_media',title:'Falta un archivo multimedia',action:'Usa Reconectar medios, confirma que ningún clip esté marcado como faltante y vuelve a renderizar.'};
    if(/invalid data|decode|decoder|corrupt|moov atom|could not find codec parameters/.test(text))return {...result,code:'media_decode',title:'Hay un medio que FFmpeg no puede decodificar',action:'Revisa los archivos usados recientemente. Reemplaza o convierte el medio dañado/incompatible y vuelve a intentar.'};
    if(/filter.*error|error.*filter|fontsize overflow|failed to configure output pad|conversion failed/.test(text))return {...result,code:'filter_graph',title:'Falló el procesamiento de una capa o efecto',action:'Ejecuta Control de calidad. Si persiste, desactiva temporalmente el último efecto, caption o transformación modificada y vuelve a probar.'};
    if(/fetch failed|failed to fetch|networkerror|network error|connection|econnreset|temporarily unavailable|http 5\d\d/.test(text))return {...result,code:'local_connection',title:'Se perdió temporalmente la conexión con el render local',action:'Mantén abierta la ventana del servidor local. Studio puede volver a intentar cuando el servidor responda.',retryable:true};
    if(/qa post-render|control de calidad post-render|sin superar/.test(text))return {...result,code:'post_render_qa',title:'El MP4 terminó pero no superó el control de calidad',action:'Abre el informe QA, corrige el problema señalado y renderiza nuevamente.'};
    return result;
  }
  static format(error){const d=this.diagnose(error);return `${d.title}: ${d.action}`}
}
if(typeof window!=='undefined')window.ProfitMenteRenderErrorEngine=ProfitMenteRenderErrorEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteRenderErrorEngine;
