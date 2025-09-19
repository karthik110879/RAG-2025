@echo off
echo Starting ChromaDB with Docker...
echo.

echo Checking if Docker is installed...
docker --version
if %errorlevel% neq 0 (
    echo Docker is not installed or not running.
    echo Please install Docker Desktop and try again.
    pause
    exit /b 1
)

echo.
echo Starting ChromaDB container...
docker run -d --name chromadb -p 8000:8000 chromadb/chroma

echo.
echo ChromaDB is starting...
echo Waiting for ChromaDB to be ready...
timeout /t 10 /nobreak > nul

echo.
echo ChromaDB should now be running on http://localhost:8000
echo.
pause

