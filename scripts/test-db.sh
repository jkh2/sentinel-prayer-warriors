#!/usr/bin/env bash
# Applies the migrations to a throwaway local Postgres database and runs the policy tests.
# Needs a local Postgres you can reach with psql (PG* env vars work). Usage: npm run test:db
set -euo pipefail
cd "$(dirname "$0")/.."
DB="spw_test_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/stub_supabase.sql
for f in supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/policies_test.sql
