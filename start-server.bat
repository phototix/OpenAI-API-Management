@echo off
echo ========================================
echo   API Key Dashboard with Proxy Server
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [1/2] Installing dependencies...
    call npm install
    echo.
) else (
    echo [✓] Dependencies already installed
    echo.
)

echo [2/2] Starting proxy server...
echo.
echo The server will:
echo   - Serve the dashboard on http://localhost:3000
echo   - Provide CORS proxy at http://localhost:3000/proxy_api
echo   - Auto-configure proxy for API requests
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

node proxy-server.js
