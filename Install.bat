@echo off
:: ColorMatch Photoshop Installer
:: This batch file bypasses execution policies to run the PowerShell GUI

echo Starting ColorMatch Installer...
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0Install.ps1"
