@echo off
echo ========================================
echo TDT-CRM Backend Startup
echo ========================================
echo.

cd backend

echo Checking Python...
python --version 2>nul
if errorlevel 1 (
    echo Python not found in PATH. Using full path...
    set PYTHON_PATH=C:\Users\kramzu\AppData\Local\Programs\Python\Python312\python.exe
) else (
    set PYTHON_PATH=python
)

echo.
echo Starting Flask backend on port 5001...
echo.
echo Backend will be available at: http://localhost:5001
echo Press Ctrl+C to stop
echo.

set FLASK_PORT=5001
%PYTHON_PATH% app.py

pause
