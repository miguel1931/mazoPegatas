@echo off
echo.
echo  ========================================
echo   mazoPegatas - Instalacion del servidor
echo  ========================================
echo.
echo  Instalando dependencias (Node.js)...
echo.
call npm install
echo.
echo  Creando carpeta de fotos...
if not exist "fotos" mkdir fotos
if not exist "thumbs" mkdir thumbs
echo.
echo  ✅ Instalacion completada!
echo.
echo  Para arrancar el servidor, ejecuta:
echo     start.bat
echo.
echo  O desde terminal:
echo     npm start
echo.
pause
