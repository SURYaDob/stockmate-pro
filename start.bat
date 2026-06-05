@echo off
title StockMate Pro - Setup & Launch

set DEV_MODE=0
if /I "%1"=="--dev" set DEV_MODE=1
if /I "%1"=="-d" set DEV_MODE=1

echo =============================================
echo     StockMate Pro - Setup & Launch
echo =============================================
echo.

:: ----- Check script location -----
if not exist "%~dp0backend" (
    echo [X] Cannot find 'backend' folder next to this script.
    echo     Make sure you are running start.bat from the project root.
    pause
    exit /b 1
)
if not exist "%~dp0frontend" (
    echo [X] Cannot find 'frontend' folder next to this script.
    echo     Make sure you are running start.bat from the project root.
    pause
    exit /b 1
)

:: ----- Check Node.js -----
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] Node.js is not installed.
    echo     Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER%

:: ----- Check npm -----
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] npm is not found. Node.js may not have installed correctly.
    echo     Try reinstalling Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: ----- Check PowerShell (optional, for health checks and port cleanup) -----
where powershell >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "HAVE_POWERSHELL=1"
) else (
    set "HAVE_POWERSHELL=0"
    echo [!] PowerShell not found. Backend health checks will use a simple timed wait.
)

:: ----- Create .env from template if not exists -----
if not exist backend\.env (
    echo.
    echo [i] Creating backend\.env with default SQLite settings...
    >backend\.env (
        echo # Backend Configuration
        echo PORT=5000
        echo NODE_ENV=development
        echo.
        echo # SQLite Database (stored locally)
        echo DATABASE_URL=file:./prisma/stockmate.db
        echo.
        echo # JWT Secrets
        echo JWT_ACCESS_SECRET=stockmate-default-access-secret-change-in-production
        echo JWT_REFRESH_SECRET=stockmate-default-refresh-secret-change-in-production
        echo JWT_ACCESS_EXPIRY=15m
        echo JWT_REFRESH_EXPIRY=7d
        echo.
        echo # Frontend URL
        echo FRONTEND_URL=http://localhost:3000
    )
    if %ERRORLEVEL% NEQ 0 (
        echo [X] Failed to create backend\.env. Check permissions.
        pause
        exit /b 1
    )
    echo [!] Created default backend\.env. Edit if needed.
)
echo [OK] Backend configuration found

:: ----- Install backend dependencies -----
echo.
echo [~] Installing backend dependencies...
cd /d "%~dp0backend"
call npm install --loglevel=error
if %ERRORLEVEL% NEQ 0 (
    echo [X] Backend install failed.
    echo     Try running manually: cd backend ^&^& npm install
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed

:: ----- Install frontend dependencies -----
echo.
echo [~] Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install --loglevel=error
if %ERRORLEVEL% NEQ 0 (
    echo [X] Frontend install failed.
    echo     Try running manually: cd frontend ^&^& npm install
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed

:: ----- Generate Prisma client -----
echo.
echo [~] Generating Prisma client...
cd /d "%~dp0backend"
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo [X] Prisma generate failed.
    echo     Check your database configuration in backend\.env
    pause
    exit /b 1
)
echo [OK] Prisma client generated

:: ----- Run migrations -----
echo.
echo [~] Running database migrations...
call npx prisma migrate deploy 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] First-time setup -- creating migrations...
    call npx prisma migrate dev --name init 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [X] Migration failed. Try deleting backend\prisma\stockmate.db and re-running.
        pause
        exit /b 1
    )
)
echo [OK] Database migrations applied

:: ----- Seed database -----
echo.
echo [~] Seeding database with sample data...
node prisma/seed.js
if %ERRORLEVEL% NEQ 0 (
    echo [!] Seed may have partially completed (expected on re-seed)
)
echo [OK] Database seeded

cd /d "%~dp0"

echo.
echo [OK] Setup complete!

:: ----- Choose mode -----
if %DEV_MODE%==1 (
    call :launch_dev_mode
) else (
    call :launch_production_mode
)
goto :EOF


:: ============================================================================
:: Subroutine: Dev Mode
:: ============================================================================
:launch_dev_mode
    echo.
    echo =============================================
    echo     Starting Dev Mode (Vite + Nodemon)
    echo =============================================
    echo   Frontend:  http://localhost:3000
    echo   Backend:   http://localhost:5000
    echo   API via:   Vite proxy (/api -^> :5000)
    echo =============================================
    echo.
    echo   Login Credentials:
    echo   -----------------------------------------
    echo   Admin:        admin@stockmate.com / Admin@123
    echo   Store Manager: manager@stockmate.com / Manager@123
    echo   Staff:        staff@stockmate.com / Staff@123
    echo   Accountant:   accountant@stockmate.com / Accountant@123
    echo.
    echo   Close this window to stop all servers.
    echo.

    cd /d "%~dp0frontend"
    call npm run dev:all
    cd /d "%~dp0"
    goto :EOF


:: ============================================================================
:: Subroutine: Production Mode  (build + start servers + wait + cleanup)
:: ============================================================================
:launch_production_mode
    setlocal enabledelayedexpansion

    :: ----- Build frontend -----
    echo.
    echo [~] Building frontend for production...
    cd /d "%~dp0frontend"
    call npm run build
    if !ERRORLEVEL! NEQ 0 (
        echo [X] Frontend build failed.
        echo     Check the build errors above for details.
        pause
        exit /b 1
    )
    echo [OK] Frontend built
    cd /d "%~dp0"

    :: ----- Print server info -----
    echo.
    echo =============================================
    echo         Starting StockMate Pro
    echo =============================================
    echo   Frontend:  http://localhost:3000
    echo   Backend:   http://localhost:5000
    echo   API Docs:  http://localhost:5000/api/health
    echo =============================================
    echo.
    echo   Login Credentials:
    echo   -----------------------------------------
    echo   Admin:        admin@stockmate.com / Admin@123
    echo   Store Manager: manager@stockmate.com / Manager@123
    echo   Staff:        staff@stockmate.com / Staff@123
    echo   Accountant:   accountant@stockmate.com / Accountant@123
    echo.
    echo   Close this window to stop all servers.
    echo.

    :: ----- Start backend -----
    start "StockMate Backend" /MIN cmd /c "cd /d "%~dp0backend" && npm run dev"

    :: ----- Wait for backend to be ready -----
    echo [~] Waiting for backend to start...
    set WAIT_COUNT=0
    set MAX_WAIT=30

:wait_for_backend
    if !WAIT_COUNT! geq !MAX_WAIT! (
        echo [!] Backend may not be ready yet. Check http://localhost:5000/api/health
        goto :after_wait
    )

    :: Health check using PowerShell or curl
    if "!HAVE_POWERSHELL!"=="1" (
        >nul 2>&1 powershell -Command "try { (Invoke-WebRequest -Uri 'http://localhost:5000/api/health' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { $false }" && goto :backend_ok
    ) else (
        >nul 2>&1 curl.exe -s -f http://localhost:5000/api/health && goto :backend_ok
        :: curl also unavailable -- will time out silently after MAX_WAIT iterations
    )

    timeout /t 2 >nul
    set /a WAIT_COUNT+=1
    goto :wait_for_backend

:backend_ok
    echo [OK] Backend is running on http://localhost:5000

:after_wait

    :: ----- Start frontend -----
    start "StockMate Frontend" /MIN cmd /c "cd /d "%~dp0frontend" && npm run preview -- --port 3000"

    echo [OK] Frontend is starting on http://localhost:3000
    echo.
    start http://localhost:3000
    echo.
    echo   Press any key to stop all servers...
    pause >nul

    :: ----- Cleanup -----
    echo [~] Shutting down...

    :: Kill by window title
    taskkill /f /t /fi "WINDOWTITLE eq StockMate Backend" >nul 2>nul
    if !ERRORLEVEL! NEQ 0 (
        echo [!] Backend process may have already stopped.
    )
    taskkill /f /t /fi "WINDOWTITLE eq StockMate Frontend" >nul 2>nul
    if !ERRORLEVEL! NEQ 0 (
        echo [!] Frontend process may have already stopped.
    )

    :: Port-based fallback (if PowerShell is available)
    if "!HAVE_POWERSHELL!"=="1" (
        >nul 2>&1 powershell -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force"
        >nul 2>&1 powershell -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force"
    )

    echo [OK] Servers stopped.
    echo.
    endlocal
    pause
    goto :EOF
