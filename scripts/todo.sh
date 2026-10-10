#!/usr/bin/env bash
# Regenera todo: PDF -> borrador -> contenido curado -> verificación -> web
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/extraer.py > /dev/null
python3 scripts/curar.py
python3 scripts/recortar.py > /dev/null
python3 scripts/verificar.py contenido sindicato-uso-manual-electoral-2022-2026-w.pdf --resumen
node --test web/pruebas/calculadoras.test.js 2>&1 | grep -E "^# (pass|fail)"
python3 scripts/construir.py
