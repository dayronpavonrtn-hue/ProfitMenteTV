# ProfitMente Studio

Editor de video local-first para ProfitMente TV. El objetivo actual es mantener el flujo principal en costo $0, sin APIs premium obligatorias.

## Estado funcional
- Modo manual y automático.
- Generación local de estructura, guion/escenas y captions desde un tema.
- Biblioteca persistente de video, imagen y audio con IndexedDB.
- Timeline de 7 pistas: video, overlays, motion, captions, SFX, música y voz.
- Arrastrar clips, trim visual, cortar, duplicar y borrar.
- Deshacer/rehacer.
- Preview en canvas con sourceOffset, velocidad, overlays, captions y transiciones.
- Mezcla de música, voz y SFX con volumen y fades.
- Persistencia de múltiples proyectos en el navegador.
- Importar/exportar proyecto JSON.
- Reconexión automática asistida de medios faltantes al abrir proyectos JSON.
- Control de calidad antes del render.
- Render WebM local con audio.
- Exportación de paquete autocontenido `.profitmente.tar` con proyecto + medios.
- Importación de paquete completo con proyecto + medios.
- Render MP4 H.264/AAC con FFmpeg y validación automática con ffprobe.
- Render MP4 directo desde el botón del Studio cuando se abre con el servidor local incluido.
- QA de render en GitHub Actions.
- Lanzador de Windows con doble clic para abrir Studio sin escribir comandos.

## Abrir el editor en Windows
La forma más simple es hacer doble clic en:

`studio/start_studio_windows.bat`

El lanzador busca `py` o `python`, inicia el servidor local de ProfitMente Studio, abre automáticamente el navegador y mantiene el servidor activo mientras la ventana esté abierta. No expone el servidor a la red: escucha únicamente en `127.0.0.1`.

## Flujo recomendado para MP4 final
1. Abre Studio con `studio/start_studio_windows.bat`.
2. Crea o edita el video.
3. Pulsa **Control de calidad** y corrige errores importantes.
4. Pulsa **🎬 Render MP4** para generar y descargar el MP4 final directamente con FFmpeg local.

Como respaldo, puedes usar **📦 Paquete MP4** para descargar un `.profitmente.tar` autocontenido y renderizarlo después con `render_bundle_windows.bat`.

## Proyectos JSON y medios faltantes
Un JSON de proyecto no contiene los archivos multimedia binarios. Si abres un JSON y faltan videos, imágenes o audios, Studio marca esos clips y muestra **🔗 Reconectar medios**. Selecciona los archivos originales; el motor intenta emparejarlos por nombre, tipo y tamaño y conserva los IDs del proyecto.

Para mover un proyecto completo entre computadoras, usa preferiblemente **📦 Paquete MP4**, porque incluye proyecto y medios juntos.

## Requisitos para render MP4 en Windows
- Python 3.
- FFmpeg disponible en PATH.

Si FFmpeg no está instalado, Windows normalmente permite instalarlo gratis con:

```powershell
winget install Gyan.FFmpeg
```

No se instala ni activa ningún servicio de pago.

## Render manual
También puedes ejecutar:

```bash
python studio/render_bundle.py "video.profitmente.tar" "video.mp4"
```

## Siguiente prioridad
- Pruebas visuales y de regresión del preview/editor.
- Mejorar aún más captions y transiciones del render final.
- Pulir la experiencia de proyecto nuevo, recuperación y errores de render.
