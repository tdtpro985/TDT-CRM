@echo off
color 0A
echo.
echo ========================================
echo   TDT-CRM Quick Start
echo ========================================
echo.
echo This will open 2 terminal windows:
echo   1. Backend (Flask API)
echo   2. Frontend (React + Vite)
echo.
echo After both start, open your browser to:
echo   http://localhost:5173
echo.
echo Login credentials:
echo   Admin: admin.tdtpowersteel / TDTpowersteel2024
echo   Branch: manila.tdtpowersteel / TDTpowersteel2024
echo.
pause

echo.
echo Starting backend...
start "TDT-CRM Backend" cmd /k start-backend.bat

timeout /t 3 /nobreak >nul

echo Starting frontend...
start "TDT-CRM Frontend" cmd /k start-frontend.bat

echo.
echo ========================================
echo Both servers are starting...
echo Check the 2 new terminal windows.
echo ========================================
echo.
echo Press any key to exit this window.
pause >nul
