# ProfitMente Studio

Editor de video local-first para ProfitMente TV. El objetivo actual es mantener el flujo principal en costo $0, sin APIs premium obligatorias.

## Estado funcional
- Modo manual y automático.
- Generación local de estructura, guion/escenas y captions desde un tema.
- Biblioteca persistente de video, imagen y audio con IndexedDB.
- Timeline de 7 pistas: video, overlays, motion, captions, SFX, música y voz.
- Arrastrar clips, trim visual, cortar, duplicar y borrar.
- Deshacer/rehacer.
- Preview en canvas con playhead.
- Mezcla de música, voz y SFX con volumen y fades.
- Persistencia del proyecto en el navegador.
- Importar/exportar proyecto JSON.
- Control de calidad antes del render.
- Render WebM local con audio.
- Exportación de paquete autocontenido `.profitmente.tar` con proyecto + medios.
- Render MP4 H.264/AAC con FFmpeg y validación automática con ffprobe.
- QA de render en GitHub Actions.

## Abrir el editor
Desde la raíz del repositorio:

```bash
python -m http.server 8080
```

Luego abre:

`http://localhost:8080/studio/`

## Flujo recomendado para MP4 final
1. Crea o edita el video en Studio.
2. Pulsa **Control de calidad** y corrige errores importantes.
3. Pulsa **Paquete MP4**. Se descargará un `.profitmente.tar` con el proyecto y sus medios.
4. En Windows, arrastra ese archivo encima de `studio/render_bundle_windows.bat`.
5. El script valida el paquete, ejecuta FFmpeg y crea el MP4 junto al paquete original.

### Requisitos para render MP4 en Windows
- Python 3.
- FFmpeg disponible en PATH.

Si FFmpeg no está instalado, Windows normalmente permite instalarlo gratis con:

```powershell
winget install Gyan.FFmpeg
```

El `.bat` verifica ambos requisitos antes de renderizar y no instala ni activa servicios de pago.

## Render manual
También puedes ejecutar:

```bash
python studio/render_bundle.py "video.profitmente.tar" "video.mp4"
```

## Siguiente prioridad
- Mejorar captions animados palabra por palabra.
- Añadir más transiciones/keyframes al render final.
- Simplificar todavía más el paso editor → MP4.
- Pruebas visuales y de regresión del editor.
