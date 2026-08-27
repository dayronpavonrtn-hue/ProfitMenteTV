@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if "%~1"=="" (
  echo.
  echo ProfitMente Studio - Render MP4 $0
  echo Arrastra un archivo .profitmente.tar encima de este .bat
  echo o ejecuta:
  echo   render_bundle_windows.bat "C:\ruta\video.profitmente.tar"
  echo.
  pause
  exit /b 2
)

set "BUNDLE=%~f1"
if not exist "%BUNDLE%" (
  echo ERROR: No existe el paquete: %BUNDLE%
  pause
  exit /b 3
)

where python >nul 2>nul
if errorlevel 1 (
  where py >nul 2>nul
  if errorlevel 1 (
    echo ERROR: Python no esta instalado o no esta en PATH.
    echo Instala Python 3 y vuelve a ejecutar este archivo.
    pause
    exit /b 4
  )
  set "PY=py -3"
) else (
  set "PY=python"
)

where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo ERROR: FFmpeg no esta instalado o no esta en PATH.
  echo Puedes instalarlo gratis con: winget install Gyan.FFmpeg
  echo Luego cierra y vuelve a abrir esta ventana.
  pause
  exit /b 5
)

for %%F in ("%BUNDLE%") do (
  set "OUT=%%~dpnF.mp4"
)

echo.
echo Renderizando paquete ProfitMente...
echo Entrada: %BUNDLE%
echo Salida : %OUT%
echo.

%PY% "%~dp0render_bundle.py" "%BUNDLE%" "%OUT%"
if errorlevel 1 (
  echo.
  echo ERROR: El render fallo. Revisa los mensajes anteriores.
  pause
  exit /b 6
)

echo.
echo ==============================================
echo MP4 LISTO
 echo %OUT%
echo ==============================================
start "" explorer.exe /select,"%OUT%"
pause
exit /b 0
