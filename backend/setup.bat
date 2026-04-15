@echo off
echo =========================================
echo Smart Parking System - Setup Script
echo =========================================
echo.

echo [1/5] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)
echo OK - Python found

echo.
echo [2/5] Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo OK - Dependencies installed

echo.
echo [3/5] Checking MySQL connection...
echo Please enter your MySQL credentials in the .env file
echo.
echo Current .env configuration:
type .env
echo.

echo [4/5] To initialize database, run:
echo mysql -u root -p ^< database\schema.sql
echo.

echo [5/5] Starting Flask application...
echo.
echo =========================================
echo Setup complete!
echo =========================================
echo.
echo Next steps:
echo 1. Create database: mysql -u root -p ^< database\schema.sql
echo 2. Update .env with your MySQL password
echo 3. Run: python app.py
echo 4. Open: http://localhost:5000
echo.
echo Admin credentials:
echo Email: admin@parking.com
echo Password: admin123
echo.
pause
