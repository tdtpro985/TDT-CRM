@echo off
echo ========================================
echo  TDT-CRM: Add Sample Pipeline Data
echo ========================================
echo.
echo This will add sample deals to your database:
echo   - 5 companies
echo   - 5 contacts  
echo   - 10 deals (across all pipeline stages)
echo.
echo ========================================
echo.

cd backend
python add_sample_data_simple.py

echo.
pause
