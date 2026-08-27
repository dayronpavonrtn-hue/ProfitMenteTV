# ProfitMente Studio

Editor web local-first para videos verticales. Funciona sin API premium.

## Ya funciona
- Modo automático y manual.
- Biblioteca local de video, imagen y audio usando IndexedDB.
- Timeline de 7 pistas.
- Añadir medios al timeline.
- Preview 9:16 en canvas.
- Playhead y reproducción de preview.
- Subtítulos y B-roll manuales.
- Guardar proyecto en navegador.
- Importar/exportar proyecto JSON.
- Render de preview WebM en navegador.

## Ejecutar localmente
Desde la raíz del repositorio:

```bash
python -m http.server 8080
```

Abrir `http://localhost:8080/studio/`.

## Próximos bloques
1. Drag/drop y trim visual en timeline.
2. Mezcla real de audio en render.
3. Captions palabra por palabra.
4. Render MP4 mediante backend FFmpeg/GitHub Actions.
5. Automatización tema → guion → assets → edición → revisión.
