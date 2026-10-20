@echo off
title SamaPos Print Agent - Puente de Impresion LAN
color 0A

echo ==============================================================
echo           SAMAPOS PRINT AGENT - INICIANDO SERVICIO
echo ==============================================================
echo.

cd /d "%~dp0"

:: Verificar si Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH.
    echo Por favor descargue e instale Node.js (LTS) desde https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Verificar si node_modules existe; si no, instalar dependencias
if not exist "node_modules\" (
    echo [INSTALACION] Primera ejecucion detectada. Instalando librerias...
    call npm install --omit=dev
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Fallo la instalacion de paquetes npm.
        pause
        exit /b 1
    )
    echo [INSTALACION] Paquetes instalados correctamente.
    echo.
)

:loop
echo [INICIO] Ejecutando agente de impresion...
node agent.js
echo.
echo [AVISO] El agente se detuvo. Reiniciando en 3 segundos...
timeout /t 3 /nobreak >nul
goto loop
