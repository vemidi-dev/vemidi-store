@echo off
title vemidi-store dev
cd /d "%~dp0"

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [Грешка] npm.cmd не е намерен в PATH.
  echo Инсталирай Node.js LTS от https://nodejs.org и рестартирай Cursor.
  pause
  exit /b 1
)

echo Стартиране на Next.js dev server...
echo След "Ready" отвори: http://localhost:3000
echo.
call npm.cmd run dev
pause
