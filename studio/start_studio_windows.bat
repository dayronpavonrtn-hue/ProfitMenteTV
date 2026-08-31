@echo off
setlocal
cd /d "%~dp0.."

echo ========================================
echo        ProfitMente Studio - $0 Mode
echo ========================================
echo.

where py >nul 2>&1
if %errorlevel%==0 (
  set "PY=py"
) else (
  where python >nul 2>&1
  if %errorlevel%==0 (
    set "PY=python"
  ) else (
    echo [ERROR] Python 3 no esta instalado o no esta en PATH.
    echo Instala Python 3 gratis desde Microsoft Store o python.org.
    pause
    exit /b 1
  )
)

set "PORT=8080"
echo Preparando ProfitMente Studio en http://127.0.0.1:%PORT%/studio/
echo.
where ffmpeg >nul 2>&1
if %errorlevel%==0 (
  echo MP4 directo: LISTO
  echo Proxies de preview: LISTOS
) else (
  echo MP4 directo y proxies: FFmpeg no detectado. Studio seguira funcionando sin esas opciones.
  echo Para instalarlo gratis: winget install Gyan.FFmpeg
)
echo.
echo El navegador se abrira automaticamente cuando el servidor este listo.
echo El servidor quedara activo mientras esta ventana permanezca abierta.
echo Para cerrar Studio, cierra esta ventana o presiona Ctrl+C.
echo.
%PY% studio\media_proxy_server.py --port %PORT% --open-browser

if errorlevel 1 (
  echo.
  echo [ERROR] No se pudo iniciar el servidor en el puerto %PORT%.
  echo Puede que otra aplicacion ya lo este usando.
  pause
  exit /b 1
)
