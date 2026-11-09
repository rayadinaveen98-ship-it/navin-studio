@echo off
cd /d "%~dp0local\m4-studio-dev"
start "" "http://127.0.0.1:4173/studio-backup"
node server.mjs
pause
