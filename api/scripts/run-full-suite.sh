#!/usr/bin/env bash
set -u
ROOT=/home/ethan/.automaton/workspace/01M2E8VWQM4NBY2TF3CW0QBGCK
cd "$ROOT/openao/api" || exit 1
PQLIB="$(dirname "$(find node_modules/.pnpm -name 'libpq.so.5*' 2>/dev/null | head -1)")"
export LD_LIBRARY_PATH="$ROOT/pg-libs:${PQLIB}:${LD_LIBRARY_PATH:-}"
rm -rf .testpg
node scripts/test-db.mjs > /tmp/testdb.log 2>&1 &
DBPID=$!
for i in $(seq 1 90); do grep -q DB_READY /tmp/testdb.log 2>/dev/null && break; sleep 1; done
if ! grep -q DB_READY /tmp/testdb.log; then
  echo "DB_FAILED"; head -20 /tmp/testdb.log
  BIN="$(find node_modules/.pnpm -path '*linux-x64*' -name initdb | head -1)"
  echo "--- ldd ---"; ldd "$BIN" 2>/dev/null | grep "not found" || echo "loader: all resolved"
  kill $DBPID 2>/dev/null; exit 1
fi
echo "DB_UP"
export DATABASE_URL="postgres://openao:openao@127.0.0.1:5434/openao" TOKEN_AUTH="test-secret" JWT_SECRET="jwt-secret" NODE_ENV=test
if [ -f src/migrate.ts ]; then
  pnpm tsx src/migrate.ts > /tmp/migrate.log 2>&1; echo "MIGRATE_EXIT=$?"; tail -3 /tmp/migrate.log
else echo "no migrate entrypoint"; fi
pnpm tsx src/server.ts > /tmp/api.log 2>&1 &
APIPID=$!
UP=0
for i in $(seq 1 120); do curl -s -o /dev/null http://127.0.0.1:3001/ && UP=1 && break; sleep 1; done
if [ "$UP" = "1" ]; then echo "API_UP"; else
  echo "API_FAILED"; tail -25 /tmp/api.log; kill $DBPID 2>/dev/null; exit 1; fi
pnpm vitest run > /tmp/suite-final.txt 2>&1; echo "VITEST_EXIT=$?"
tail -50 /tmp/suite-final.txt
kill $APIPID $DBPID 2>/dev/null
echo "COMPLETE"
