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
echo Membuka browser Anda di: http://localhost:5000 ...
echo ======================================================================
start http://localhost:5000
echo.
echo Folder hasil konversi: %~dp0output_markdown
echo.
echo.
echo Untuk melihat log server: docker compose logs -f
echo Untuk menghentikan server: docker compose down
echo.
pause
