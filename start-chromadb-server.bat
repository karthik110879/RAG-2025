@echo off
echo ========================================
echo    Starting RAG Application
echo ========================================
echo.

echo Step 1: Starting ChromaDB...
start "ChromaDB Server" cmd /k "python -m chromadb run --host localhost --port 8000"

echo Waiting for ChromaDB to start...
timeout /t 5 /nobreak > nul

echo Step 2: Starting Express Server...
start "Express Server" cmd /k "cd server && npm run dev"

echo.
echo ========================================
echo    Services Started!
echo ========================================
echo.
echo ChromaDB: http://localhost:8000
echo Express Server: http://localhost:3001
echo.
echo Next: Start the React frontend with:
echo cd client && npm run dev
echo.
pause
