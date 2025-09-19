@echo off
echo ========================================
echo    RAG Document Chat - Complete Setup
echo ========================================
echo.

echo Step 1: Checking Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running or not installed
    echo Please start Docker Desktop and try again
    pause
    exit /b 1
)
echo ✅ Docker is running

echo.
echo Step 2: Starting ChromaDB...
docker ps | findstr chromadb >nul
if %errorlevel% equ 0 (
    echo ✅ ChromaDB is already running
) else (
    echo Starting ChromaDB container...
    docker run -d --name chromadb --restart unless-stopped -p 8000:8000 -v chromadb_data:/chroma/chroma chromadb/chroma:latest
    echo Waiting for ChromaDB to start...
    timeout /t 5 /nobreak >nul
)

echo.
echo Step 3: Testing ChromaDB connection...
curl -s http://localhost:8000/api/v2/version >nul
if %errorlevel% equ 0 (
    echo ✅ ChromaDB is ready
) else (
    echo ⚠️  ChromaDB is starting up, please wait...
)

echo.
echo Step 4: Starting Express Server...
start "Express Server" cmd /k "cd server && npm run dev"

echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo.
echo Step 5: Testing Express Server...
curl -s http://localhost:3001/health >nul
if %errorlevel% equ 0 (
    echo ✅ Express Server is ready
) else (
    echo ⚠️  Express Server is starting up...
)

echo.
echo Step 6: Starting React Client...
start "React Client" cmd /k "cd client && npm run dev"

echo.
echo ========================================
echo    🎉 All Services Started!
echo ========================================
echo.
echo ChromaDB:    http://localhost:8000
echo Express:     http://localhost:3001
echo React App:   http://localhost:3000
echo.
echo Open http://localhost:3000 in your browser
echo to start using the RAG application!
echo.
pause
