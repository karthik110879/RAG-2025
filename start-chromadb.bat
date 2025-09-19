@echo off
echo Starting ChromaDB...
echo.
echo ChromaDB will be available at: http://localhost:8000
echo Press Ctrl+C to stop ChromaDB
echo.

chroma run --host localhost --port 8000

pause
