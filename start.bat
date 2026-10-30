@echo off
title PaperMarkdown Studio
echo ======================================================================
echo           PaperMarkdown Studio (Docker Launcher)
echo ======================================================================
echo.
echo Memeriksa Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker tidak terdeteksi. Pastikan Docker Desktop telah diinstal dan berjalan.
    pause
    exit /b 1
)

echo Menjalankan PaperMarkdown Studio dengan Docker Compose...
docker compose up -d --build

echo.
echo ======================================================================
echo [OK] PaperMarkdown Studio aktif!
echo Buka browser Anda di: http://localhost:5000
echo ======================================================================
echo.
echo Untuk melihat log server: docker compose logs -f
echo Untuk menghentikan server: docker compose down
echo.
pause
