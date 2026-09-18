#!/usr/bin/env bash
# Levanta el simulador en http://localhost:5173. Ctrl-C lo corta. Uso: ./dev.sh
#
# El nucleo Java se compila a JavaScript con TeaVM y corre dentro del navegador, asi que
# no hay servidor que levantar. Si tocas nucleo/src/main/java, regenera el motor con:
#
#     cd frontend && npm run engine
set -euo pipefail
cd "$(dirname "$0")"

# Libera el puerto por si quedo algo de una corrida anterior.
lsof -ti:5173 -sTCP:LISTEN | xargs -r kill 2>/dev/null || true

if [ ! -d frontend/node_modules ]; then
  echo "-> npm install (primera vez)"
  ( cd frontend && npm install )
fi

if [ ! -f frontend/src/engine/simulador.js ]; then
  echo "-> generando el motor desde el nucleo Java (TeaVM)"
  ( cd frontend && npm run engine )
fi

echo "-> http://localhost:5173"
cd frontend && exec npm run dev
