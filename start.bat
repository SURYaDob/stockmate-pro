@echo off
title StockMate Pro - Setup & Launch
chcp 65001 >nul

echo ╔══════════════════════════════════════════════╗
echo ║         StockMate Pro — Setup ^& Launch       ║
echo ╚══════════════════════════════════════════════╝
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [✗] Node.js is not installed.
    echo     Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [✓] Node.js %NODE_VER%

:: Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [✗] npm is not found.
    pause
    exit /b 1
)

:: Create .env from template if not exists
if not exist backend\.env (
    echo.
    echo [i] Creating backend\.env from template...
    copy backend\.env.example backend\.env >nul
    echo [!] Please edit backend\.env with your database settings.
    echo     Then run start.bat again.
    echo.
    echo     Default MySQL connection:
    echo     DATABASE_URL=mysql://root:password@localhost:3306/stockmate_pro
    echo.
    start notepad backend\.env
    pause
    exit /b 0
)
echo [✓] Backend configuration found

:: Install backend dependencies
echo.
echo [~] Installing backend dependencies...
cd backend
call npm install --loglevel=error
if %ERRORLEVEL% NEQ 0 (
    echo [✗] Backend install failed
    pause
    exit /b 1
)
echo [✓] Backend dependencies installed
cd ..

:: Install frontend dependencies
echo.
echo [~] Installing frontend dependencies...
cd frontend
call npm install --loglevel=error
if %ERRORLEVEL% NEQ 0 (
    echo [✗] Frontend install failed
    pause
    exit /b 1
)
echo [✓] Frontend dependencies installed
cd ..

:: Generate Prisma client
echo.
echo [~] Generating Prisma client...
cd backend
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo [✗] Prisma generate failed
    pause
    exit /b 1
)
echo [✓] Prisma client generated

:: Run migrations
echo.
echo [~] Running database migrations...
call npx prisma migrate deploy 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] First-time setup — creating migrations...
    call npx prisma migrate dev --name init 2>nul
)
echo [✓] Database migrations applied
cd ..

:: Seed database
echo.
echo [~] Seeding database with sample data...
cd backend
node prisma/seed.js
if %ERRORLEVEL% NEQ 0 (
    echo [!] Seed may have partially completed (expected on re-seed)
)
echo [✓] Database seeded
cd ..

:: Build frontend
echo.
echo [~] Building frontend for production...
cd frontend
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [✗] Frontend build failed
    pause
    exit /b 1
)
echo [✓] Frontend built
cd ..

:: Start servers
echo.
echo ╔══════════════════════════════════════════════╗
echo ║         Starting StockMate Pro                ║
echo ╠══════════════════════════════════════════════╣
echo ║  Frontend:  http://localhost:3000             ║
echo ║  Backend:   http://localhost:5000             ║
echo ║  API Docs:  http://localhost:5000/api/health  ║
echo ╚══════════════════════════════════════════════╝
echo.
echo   Login Credentials:
echo   ─────────────────────────────────────────────
echo   Admin:        admin@stockmate.com / Admin@123
echo   Store Manager: manager@stockmate.com / Manager@123
echo   Staff:        staff@stockmate.com / Staff@123
echo   Accountant:   accountant@stockmate.com / Accountant@123
echo.
echo   Close this window to stop all servers.
echo.

:: Start backend
start "StockMate Backend" /MIN cmd /c "cd /d %CD%\backend && npm run dev"

:: Wait for backend to start (with timeout)
echo [~] Waiting for backend to start...
setlocal enabledelayedexpansion
set WAIT_COUNT=0
:waitloop
if !WAIT_COUNT! geq 30 (
    echo [!] Backend may not be ready yet. Check http://localhost:5000/api/health
    goto :continue_after_wait
)
timeout /t 2 /nobreak >nul
>nul 2>&1 powershell -Command "try { (Invoke-WebRequest -Uri 'http://localhost:5000/api/health' -UseBasicParsing).StatusCode -eq 200 } catch { $false }" && goto :backend_ready
set /a WAIT_COUNT+=1
goto waitloop
:backend_ready
endlocal
echo [✓] Backend is running
:continue_after_wait
set WAIT_COUNT=

:: Start frontend
start "StockMate Frontend" /MIN cmd /c "cd /d %CD%\frontend && npm run preview -- --port 3000"

echo [✓] Frontend is starting...
echo.
start http://localhost:3000
echo.
echo   Press any key to stop all servers...
pause >nul

:: Cleanup
echo [~] Shutting down...
taskkill /f /t /fi "WINDOWTITLE eq StockMate Backend" >nul 2>nul
taskkill /f /t /fi "WINDOWTITLE eq StockMate Frontend" >nul 2>nul
echo [✓] Servers stopped.
pause
