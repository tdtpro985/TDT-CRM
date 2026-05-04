@echo off
echo ========================================
echo  TDT-CRM: Add More Deals for Pagination
echo ========================================
echo.
echo This will add 50 more deals (10 per stage)
echo so you can test the pagination feature.
echo.
echo Current: 2 deals per stage (no pagination)
echo After:   12 deals per stage (pagination shows!)
echo.
echo ========================================
echo.

cd backend
python add_more_deals.py

echo.
pause
