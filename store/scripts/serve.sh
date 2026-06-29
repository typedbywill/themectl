#!/usr/bin/env bash
# Servidor HTTP local para testar a store do repositório.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8765}"

echo "Themectl Dev Store — http://127.0.0.1:${PORT}/"
echo "  index:  http://127.0.0.1:${PORT}/index.json"
echo ""
echo "Para adicionar ao themectl:"
echo "  themectl source add http://127.0.0.1:${PORT}/index.json --name dev"
echo ""
echo "Pressione Ctrl+C para encerrar."
cd "$ROOT"
python3 -m http.server "$PORT"
