#!/usr/bin/env bash
set -e

echo "======================================================================"
echo "          PaperMarkdown Studio (Docker Launcher)"
echo "======================================================================"
echo ""

if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed or not in PATH."
    exit 1
fi

echo "Building and starting PaperMarkdown Studio with Docker Compose..."
docker compose up -d --build

echo ""
echo "======================================================================"
echo "[OK] PaperMarkdown Studio is running!"
echo "Open your browser at: http://localhost:5000"
echo "======================================================================"
echo ""
echo "View logs: docker compose logs -f"
echo "Stop:      docker compose down"
echo ""
