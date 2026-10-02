@echo off
title Focus Guard 2.0 - Adaptive Digital Wellbeing Assistant
color 0B

echo ======================================================================
echo              FOCUS GUARD 2.0 - DIGITAL WELLBEING CONTROL PLANE        
echo ======================================================================
echo.
echo "Don't simply block distraction. Understand it, intervene intelligently,
echo  and help the user regain control of their attention."
echo.
echo Checking Python environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in your PATH. Please install Python 3.9+.
    pause
    exit /b 1
)

echo Starting Focus Guard 2.0 Core REST Server on http://127.0.0.1:8000 ...
start "" http://127.0.0.1:8000

python ui/server.py 8000
pause
