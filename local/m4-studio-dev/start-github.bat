@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required. Install it from https://nodejs.org/
  pause
  exit /b 1
)
start "NAVIN STUDIO local" cmd /k "node server.mjs --github"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:4173/studio-home"
pause
