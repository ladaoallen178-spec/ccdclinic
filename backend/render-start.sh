#!/bin/sh
set -eu

echo "Render container starting..."
echo "PORT=${PORT:-not set}"
echo "Working directory: $(pwd)"

if [ ! -x /usr/local/bin/backend ]; then
  echo "ERROR: /usr/local/bin/backend is missing or not executable"
  ls -la /usr/local/bin || true
  exit 1
fi

if [ ! -f /app/public/index.html ]; then
  echo "ERROR: /app/public/index.html is missing"
  ls -la /app || true
  ls -la /app/public || true
  exit 1
fi

echo "Starting backend binary..."
exec /usr/local/bin/backend
