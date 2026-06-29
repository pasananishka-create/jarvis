@echo off
title J.A.R.V.I.S. Backend
cd /d "%~dp0"
echo Installing/updating dependencies...
pip install -r backend\requirements.txt > nul 2>&1
echo Starting J.A.R.V.I.S. API on port 8000...
echo.
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
pause
