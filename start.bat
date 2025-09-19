@echo off
echo Starting RAG Document Chat Application...
echo.

echo Installing dependencies...
cd server
call npm install
cd ..\client
call npm install
cd ..

echo.
echo Starting ChromaDB (make sure it's installed and running)...
echo ChromaDB should be running on http://localhost:8000
echo.

echo Starting backend server...
start "Backend Server" cmd /k "cd server && npm run dev"

echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo Starting frontend...
start "Frontend" cmd /k "cd client && npm run dev"

echo.
echo Application started!
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
pause
