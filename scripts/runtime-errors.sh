#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HOURS="${1:-24}"
LIMIT="${2:-20}"
if ! [[ "$HOURS" =~ ^[0-9]+$ ]] || ! [[ "$LIMIT" =~ ^[0-9]+$ ]]; then
  echo "Usage: $0 [hours] [limit]" >&2
  exit 2
fi

DB_ID="$(awk '
  /binding = "RUNTIME_DB"/ { found=1; next }
  found && /database_id =/ {
    gsub(/.*database_id = "/, "");
    gsub(/".*/, "");
    print;
    exit
  }
' wrangler.toml)"

if [[ -z "$DB_ID" ]]; then
  echo "Could not find RUNTIME_DB database_id in wrangler.toml" >&2
  exit 1
fi

SQL="SELECT occurred_at,event,app_version,platform,install_mode,error_kind,error_message,source,line,col FROM runtime_events WHERE event IN ('window_error','unhandled_rejection','resource_error') AND julianday(occurred_at)>=julianday('now','-${HOURS} hours') ORDER BY julianday(occurred_at) DESC LIMIT ${LIMIT};"

exec npx --yes wrangler@latest d1 execute "$DB_ID" --remote --json --command "$SQL"
