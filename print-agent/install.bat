@echo off
title SamaPos Print Agent - Instalador de Dependencias
color 0B

echo ==============================================================
echo        SAMAPOS PRINT AGENT - INSTALACION DE DEPENDENCIAS
echo ==============================================================
echo.

cd /d "%~dp0"

echo Instalando modulos escpos, escpos-network y socket.io-client...
call npm install --omit=dev

if %errorlevel% equ 0 (
    color 0A
    echo.
    echo ==============================================================
    echo    INSTALACION COMPLETADA CON EXITO.
    echo    Ya puedes iniciar el agente con "start-agent.bat".
    echo ==============================================================
) else (
    color 0C
    echo.
    echo [ERROR] Ocurrio un problema al instalar las dependencias.
)

echo.
pause
