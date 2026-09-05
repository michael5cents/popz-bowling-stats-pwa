#!/bin/sh
cd "$(dirname "$0")"
exec python3 -m http.server "${PORT:-8080}"
