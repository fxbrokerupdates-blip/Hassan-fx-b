#!/usr/bin/env bash
# Local full-stack test environment without Docker:
# PostgreSQL 15/16 (system) + Supabase Auth (GoTrue) + PostgREST + a tiny gateway on :54321.
# Downloads binaries from GitHub releases into .stack/ (gitignored). For testing only.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
S="$ROOT/.stack"; mkdir -p "$S"; cd "$S"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)}"
[ -x postgrest ] || curl -sSL https://github.com/PostgREST/postgrest/releases/download/v12.2.3/postgrest-v12.2.3-linux-static-x64.tar.xz | tar xJ
[ -x auth ] || curl -sSL https://github.com/supabase/auth/releases/download/v2.180.0/auth-v2.180.0-x86.tar.gz | tar xz
node "$ROOT/tests/e2e/local-stack/keys.mjs" > keys.env; source keys.env
RUN=""; [ "$(id -u)" = "0" ] && RUN="runuser -u postgres --"
rm -rf pgdata; mkdir pgdata; [ -n "$RUN" ] && chown postgres pgdata
$RUN "$PGBIN/initdb" -D "$S/pgdata" -U postgres -A trust >/dev/null
$RUN "$PGBIN/pg_ctl" -D "$S/pgdata" -o "-p 55433 -k /tmp -c listen_addresses=localhost" -l "$S/pgdata/log" start >/dev/null; sleep 2
P="psql -h localhost -p 55433 -U postgres -v ON_ERROR_STOP=1 -q"
$P -c "create database app"
$P -d app <<'SQL'
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create role authenticator login password 'authpw' noinherit; grant anon, authenticated, service_role to authenticator;
create role supabase_auth_admin login password 'authadmin' createrole; create schema auth authorization supabase_auth_admin;
grant usage on schema auth to anon, authenticated, service_role; alter role supabase_auth_admin set search_path = auth;
create schema storage; create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
create publication supabase_realtime;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
SQL
export GOTRUE_DB_DRIVER=postgres DATABASE_URL="postgres://supabase_auth_admin:authadmin@localhost:55433/app?search_path=auth&sslmode=disable"
export GOTRUE_JWT_SECRET="$SECRET" GOTRUE_JWT_EXP=3600 GOTRUE_JWT_AUD=authenticated GOTRUE_JWT_ADMIN_ROLES=service_role
export API_EXTERNAL_URL=http://localhost:54321/auth/v1 GOTRUE_SITE_URL=http://localhost:3100 GOTRUE_URI_ALLOW_LIST="http://localhost:3100/**"
export GOTRUE_API_HOST=localhost PORT=9999 GOTRUE_MAILER_AUTOCONFIRM=true GOTRUE_EXTERNAL_EMAIL_ENABLED=true GOTRUE_SMTP_ADMIN_EMAIL=admin@example.com
export GOTRUE_MFA_TOTP_ENROLL_ENABLED=true GOTRUE_MFA_TOTP_VERIFY_ENABLED=true GOTRUE_RATE_LIMIT_EMAIL_SENT=1000 GOTRUE_LOG_LEVEL=warn
./auth migrate >/dev/null && (./auth serve > auth.log 2>&1 &)
for f in "$ROOT"/supabase/migrations/*.sql "$ROOT"/supabase/seed.sql; do $P -d app -f "$f" >/dev/null; done
printf 'db-uri = "postgres://authenticator:authpw@localhost:55433/app"\ndb-schemas = "public"\ndb-anon-role = "anon"\njwt-secret = "%s"\nserver-port = 3002\nserver-host = "127.0.0.1"\n' "$SECRET" > pgrst.conf
(./postgrest pgrst.conf > pgrst.log 2>&1 &); (node "$ROOT/tests/e2e/local-stack/proxy.mjs" > proxy.log 2>&1 &); sleep 3
cat > "$S/app.env" <<ENV
export NEXT_PUBLIC_SITE_URL=http://localhost:3100
export NEXT_PUBLIC_APP_ENV=production
export NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
export NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON
export SUPABASE_SERVICE_ROLE_KEY=$SERVICE
export CRON_SECRET=local-cron-secret-0123456789abcdef
ENV
echo "Stack ready. Next: source .stack/app.env && npm run build && npx next start -p 3100 & python3 tests/e2e/run.py"
