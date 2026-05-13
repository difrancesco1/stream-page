#!/usr/bin/env bash
# Pull a fresh copy of the Railway production DB into the local Docker Postgres.
#
# Usage:
#   RAILWAY_DATABASE_URL="postgresql://postgres:...@shinkansen.proxy.rlwy.net:22281/railway" \
#     ./backend/scripts/sync_from_railway.sh
#
# If RAILWAY_DATABASE_URL is unset, falls back to `railway variables --json`
# and reads DATABASE_PUBLIC_URL (requires the Railway CLI to be linked).
set -euo pipefail

LOCAL_URL="${LOCAL_DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/streampage}"
ADMIN_URL="${LOCAL_ADMIN_URL:-postgresql://postgres:postgres@localhost:5432/postgres}"
DUMP_FILE="${DUMP_FILE:-/tmp/railway_dump.dump}"

if [[ -z "${RAILWAY_DATABASE_URL:-}" ]]; then
  if command -v railway >/dev/null 2>&1; then
    echo "RAILWAY_DATABASE_URL not set; reading DATABASE_PUBLIC_URL from \`railway variables\`..."
    RAILWAY_DATABASE_URL="$(railway variables --json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["DATABASE_PUBLIC_URL"])')"
  else
    echo "ERROR: set RAILWAY_DATABASE_URL or install/link the Railway CLI." >&2
    exit 1
  fi
fi

echo "==> Dumping Railway DB to ${DUMP_FILE}"
pg_dump --no-owner --no-acl --format=custom --file="${DUMP_FILE}" "${RAILWAY_DATABASE_URL}"

echo "==> Recreating local database (${LOCAL_URL})"
psql "${ADMIN_URL}" -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'streampage' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS streampage;
CREATE DATABASE streampage;
SQL

echo "==> Installing pgvector extension"
psql "${LOCAL_URL}" -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS vector;"

echo "==> Restoring dump"
pg_restore --no-owner --no-acl --dbname="${LOCAL_URL}" "${DUMP_FILE}"

echo "==> Done. Local tables:"
psql "${LOCAL_URL}" -c "\dt"
psql "${LOCAL_URL}" -c "SELECT version_num FROM alembic_version;"
