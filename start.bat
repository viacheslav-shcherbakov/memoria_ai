@echo off
echo Starting Memoria AI with local server...
echo.
echo IMPORTANT: Open your browser and navigate to:
echo http://localhost:8000
echo.
echo Do NOT open index.html directly from file:// - it will not work!
echo.
echo Press Ctrl+C to stop the server
echo.
python -m http.server 8000
