@echo off
chcp 65001 >nul
title Linjie blog - swap PayPal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\swap_paypal.ps1" %*
echo.
pause
