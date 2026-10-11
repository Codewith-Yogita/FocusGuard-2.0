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

set PYTHON_CMD=python
py -3.13 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py -3.13
    goto :found_python
)
if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" (
    set PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
    goto :found_python
)
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    goto :found_python
)
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in your PATH. Please install Python 3.9+.
    pause
    exit /b 1
)

:found_python
echo ======================================================================
echo [1/2] Registering FocusGuard Browser Shield (IDM-style integration)...
%PYTHON_CMD% -c "import sys, os; sys.path.insert(0, os.getcwd()); from ui.server import auto_register_extension_windows, launch_browser_with_extension; auto_register_extension_windows(); launch_browser_with_extension('http://127.0.0.1:8000')"

echo.
echo [2/2] Starting Focus Guard 2.0 Core REST Server on http://127.0.0.1:8000 ...
echo ======================================================================
%PYTHON_CMD% ui/server.py 8000
pause


