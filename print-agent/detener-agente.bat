@echo off
title Detener SamaPos Print Agent
color 0C
echo ==============================================================
echo           DETENIENDO SAMAPOS PRINT AGENT
echo ==============================================================
echo.
taskkill /fi "WINDOWTITLE eq SamaPos Print Agent*" /t /f >nul 2>nul
taskkill /fi "IMAGENAME eq node.exe" /fi "MEMUSAGE gt 5000" /f >nul 2>nul
echo [OK] Servicio del agente detenido.
timeout /t 3 >nul
