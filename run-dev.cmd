@echo off
cd /d "%~dp0"
where node >nul 2>&1 || (
  echo Node.js bulunamadi. Kur: https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo Bagimliliklari yukleniyor...
  call npm install
  if errorlevel 1 pause & exit /b 1
)
echo Sunucu: http://localhost:3000
call npm run dev
pause
