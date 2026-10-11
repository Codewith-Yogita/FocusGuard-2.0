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
echo Registering FocusGuard Browser Shield (IDM-style integration)...
%PYTHON_CMD% -c "import sys, os; sys.path.insert(0, os.getcwd()); from ui.server import auto_register_extension_windows; auto_register_extension_windows()" >nul 2>&1

echo Starting Focus Guard 2.0 Core REST Server on http://127.0.0.1:8000 ...

set EXT_DIR=%~dp0extension
set LAUNCHED_BROWSER=0

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    echo [Browser] Auto-loading FocusGuard extension in Google Chrome...
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --load-extension="%EXT_DIR%" http://127.0.0.1:8000
    set LAUNCHED_BROWSER=1
    goto :browser_started
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    echo [Browser] Auto-loading FocusGuard extension in Google Chrome...
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --load-extension="%EXT_DIR%" http://127.0.0.1:8000
    set LAUNCHED_BROWSER=1
    goto :browser_started
)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    echo [Browser] Auto-loading FocusGuard extension in Microsoft Edge...
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --load-extension="%EXT_DIR%" http://127.0.0.1:8000
    set LAUNCHED_BROWSER=1
    goto :browser_started
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    echo [Browser] Auto-loading FocusGuard extension in Microsoft Edge...
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --load-extension="%EXT_DIR%" http://127.0.0.1:8000
    set LAUNCHED_BROWSER=1
    goto :browser_started
)

:browser_started
if %LAUNCHED_BROWSER% equ 0 (
    start "" http://127.0.0.1:8000
)

%PYTHON_CMD% ui/server.py 8000
pause

