@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo   ProfitMente Studio - Verificacion completa local $0
echo ============================================================
echo.

where py >nul 2>nul
if %errorlevel%==0 (
  set "PYTHON=py"
) else (
  where python >nul 2>nul
  if errorlevel 1 goto :missing_python
  set "PYTHON=python"
)

where node >nul 2>nul
if errorlevel 1 goto :missing_node
where ffmpeg >nul 2>nul
if errorlevel 1 goto :missing_ffmpeg
where ffprobe >nul 2>nul
if errorlevel 1 goto :missing_ffprobe

%PYTHON% verify_zero_cost_release_full.py
set "RC=%errorlevel%"
echo.
if not "%RC%"=="0" (
  echo [FALLO] La verificacion completa encontro un problema.
  echo Revisa el primer bloque [QA:FULL] que aparezca como FALLO.
  pause
  exit /b %RC%
)

echo [OK] ProfitMente Studio paso el gate completo local de costo $0.
echo Servicios de pago: NO ^| Publicacion social: NO
pause
exit /b 0

:missing_python
echo [FALTA REQUISITO] Python 3 no esta disponible en PATH.
goto :requirements_failed
:missing_node
echo [FALTA REQUISITO] Node.js no esta disponible en PATH.
goto :requirements_failed
:missing_ffmpeg
echo [FALTA REQUISITO] FFmpeg no esta disponible en PATH.
goto :requirements_failed
:missing_ffprobe
echo [FALTA REQUISITO] ffprobe no esta disponible en PATH.
goto :requirements_failed
:requirements_failed
echo Instala el requisito indicado y vuelve a ejecutar este archivo.
pause
exit /b 2
