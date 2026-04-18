#!/usr/bin/env bash

set -euo pipefail

MIGRATION_RETRIES="${MIGRATION_RETRIES:-10}"
MIGRATION_RETRY_DELAY_SECONDS="${MIGRATION_RETRY_DELAY_SECONDS:-3}"

echo "[entrypoint] starting database migration bootstrap"

for attempt in $(seq 1 "$MIGRATION_RETRIES"); do
  if bun "apps/api/src/db/deploy.ts"; then
    echo "[entrypoint] migrations applied successfully"
    exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
  fi

  if [ "$attempt" -ge "$MIGRATION_RETRIES" ]; then
    echo "[entrypoint] migrations failed after ${MIGRATION_RETRIES} attempts"
    exit 1
  fi

  echo "[entrypoint] migration attempt ${attempt}/${MIGRATION_RETRIES} failed; retrying in ${MIGRATION_RETRY_DELAY_SECONDS}s"
  sleep "$MIGRATION_RETRY_DELAY_SECONDS"
done

echo "[entrypoint] reached unexpected state"
exit 1
