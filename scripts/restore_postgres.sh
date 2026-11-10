#!/usr/bin/env bash
# Restore CareConnect Postgres from a gzipped dump.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backups/careconnect_YYYYMMDD.sql.gz>"
  exit 1
fi

DUMP="$1"
CONTAINER="${DB_CONTAINER:-careconnect-db}"
DB_USER="${POSTGRES_USER:-careconnect}"
DB_NAME="${POSTGRES_DB:-careconnect}"

echo "Restoring ${DUMP} into ${DB_NAME} on ${CONTAINER}"
gunzip -c "${DUMP}" | docker exec -i "${CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}"
echo "Restore complete."
