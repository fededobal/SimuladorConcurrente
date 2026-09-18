#!/usr/bin/env bash
# Levanta backend (Spring Boot, :8080) y frontend (Vite, :5173) juntos.
# Ctrl-C corta los dos. Uso: ./dev.sh
set -euo pipefail
cd "$(dirname "$0")"

# El mvn del sistema corre sobre un JDK mas nuevo; el proyecto compila con 21.
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"

# Libera los puertos por si quedo algo de una corrida anterior.
for port in 8080 5173; do
  lsof -ti:"$port" -sTCP:LISTEN | xargs -r kill 2>/dev/null || true
done

pids=()
cleanup() {
  echo ""
  echo "-> deteniendo..."
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
  for port in 8080 5173; do
    lsof -ti:"$port" -sTCP:LISTEN | xargs -r kill 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

echo "-> backend  http://localhost:8080"
( cd backend && mvn -q spring-boot:run ) &
pids+=($!)

if [ ! -d frontend/node_modules ]; then
  echo "-> npm install (primera vez)"
  ( cd frontend && npm install )
fi

echo "-> frontend http://localhost:5173"
( cd frontend && npm run dev ) &
pids+=($!)

wait
