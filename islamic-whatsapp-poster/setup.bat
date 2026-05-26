@echo off
TITLE Islamic WhatsApp Poster — One-Click Setup
COLOR 0A
echo.
echo  ============================================
echo   Islamic WhatsApp Status Auto-Poster
echo   One-Click Windows Installer
echo  ============================================
echo.

REM ── Check if Node.js is installed ────────────
node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo  [INFO] Node.js not found. Installing via winget...
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    IF %ERRORLEVEL% NEQ 0 (
        echo.
        echo  [ERROR] winget install failed.
        echo  Please install Node.js manually from https://nodejs.org
        echo  Then run this script again.
        pause
        exit /b 1
    )
    echo  [OK] Node.js installed. Please restart this script.
    pause
    exit /b 0
) ELSE (
    echo  [OK] Node.js found: 
    node --version
)

echo.
echo  [INFO] Installing npm dependencies...
call npm install
IF %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] npm install failed. Check your internet connection.
    pause
    exit /b 1
)
echo  [OK] Dependencies installed.

echo.
echo  [INFO] Checking .env file...
IF NOT EXIST ".env" (
    copy ".env.example" ".env"
    echo  [ACTION REQUIRED] .env file created from template.
    echo  Please open .env and fill in your API keys, then run start.bat
    notepad .env
    pause
    exit /b 0
) ELSE (
    echo  [OK] .env file found.
)

echo.
echo  ============================================
echo   Starting Islamic WhatsApp Poster...
echo   Scan the QR code with WhatsApp when shown.
echo  ============================================
echo.
node index.js
pause
