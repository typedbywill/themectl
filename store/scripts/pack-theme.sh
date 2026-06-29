#!/usr/bin/env bash
# Empacota um diretório de tema em arquivo .theme (formato THEMECTL).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
THEME_DIR="${1:-$ROOT/store/themes/nexus-desktop}"
THEME_NAME="$(basename "$THEME_DIR")"
OUTPUT="${2:-$ROOT/store/themes/${THEME_NAME}.theme}"

if [[ ! -f "$THEME_DIR/theme.yaml" ]]; then
  echo "Erro: theme.yaml não encontrado em $THEME_DIR" >&2
  exit 1
fi

TMP_TAR="$(mktemp)"
trap 'rm -f "$TMP_TAR"' EXIT

tar -C "$(dirname "$THEME_DIR")" -czf "$TMP_TAR" "$THEME_NAME"
{
  printf 'THEMECTL\nversion: 1\n'
  cat "$TMP_TAR"
} > "$OUTPUT"

echo "✓ Empacotado: $OUTPUT ($(stat -c '%s' "$OUTPUT") bytes)"
