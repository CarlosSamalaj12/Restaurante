@echo off
title SamaPos Print Agent - Puente de Impresion LAN
color 0A

echo ==============================================================
echo           SAMAPOS PRINT AGENT - INICIANDO SERVICIO
echo ==============================================================
echo.

cd /d "%~dp0"

:: 1. Verificar si Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH.
    echo Por favor descargue e instale Node.js LTS desde https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: 2. Verificar dependencias
if not exist "node_modules" (
    echo [INSTALACION] Instalando dependencias necesarias...
    call npm install --omit=dev
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Fallo la instalacion de dependencias.
        pause
        exit /b 1
    )
)

:loop
echo.
echo [INICIO] Conectando agente con el servidor SamaPos...
echo.
node agent.js
if %errorlevel% neq 0 (
    echo.
    echo [AVISO] El agente se detuvo con codigo de error %errorlevel%.
    echo Reintentando conexion en 5 segundos... (o presione Ctrl+C para salir)
    timeout /t 5
) else (
    echo.
    echo [AVISO] El proceso del agente finalizo. Reintentando en 5 segundos...
    timeout /t 5
)
goto loop
