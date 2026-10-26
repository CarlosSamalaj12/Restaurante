@echo off
title Detener SamaPos Print Agent
color 0C
echo ==============================================================
echo           DETENIENDO SAMAPOS PRINT AGENT
echo ==============================================================
echo.
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*agent.js*' -or $_.CommandLine -like '*start-agent.bat*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>nul
echo [OK] Servicio del agente detenido.
timeout /t 3 >nul
