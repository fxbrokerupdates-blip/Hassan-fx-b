#!/usr/bin/env bash
# Validates all migrations, the seed and RLS/analytics behaviour on a throwaway
# local PostgreSQL 15+/16 cluster (no Docker needed). Usage: npm run test:db
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
DATA="$(mktemp -d)"
PORT="${PGPORT_TEST:-55432}"
cleanup() { $RUN "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
RUN=""
trap cleanup EXIT
if [ "$(id -u)" = "0" ]; then
  chown -R postgres "$DATA"; RUN="runuser -u postgres --"
else RUN=""; fi
$RUN "$PGBIN/initdb" -D "$DATA" -U postgres -A trust >/dev/null
$RUN "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp" -l "$DATA/log" start >/dev/null
sleep 2
PSQL="psql -h /tmp -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -c "create database fxbu"
$PSQL -d fxbu -f "$ROOT/tests/db/supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "migrate: $(basename "$f")"
  $PSQL -d fxbu -f "$f"
done
echo "seed: seed.sql"
$PSQL -d fxbu -f "$ROOT/supabase/seed.sql"
echo "tests: rls_and_analytics.sql"
$PSQL -d fxbu -f "$ROOT/tests/db/rls_and_analytics.sql"
echo "ALL DATABASE TESTS PASSED"
