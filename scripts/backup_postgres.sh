#!/usr/bin/env bash
# Postgres backup for CareConnect (Docker Compose).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${ROOT}/backups"
mkdir -p "${OUT_DIR}"

CONTAINER="${DB_CONTAINER:-careconnect-db}"
DB_USER="${POSTGRES_USER:-careconnect}"
DB_NAME="${POSTGRES_DB:-careconnect}"
FILE="${OUT_DIR}/careconnect_${STAMP}.sql.gz"

echo "Backing up ${DB_NAME} from ${CONTAINER} -> ${FILE}"
docker exec -t "${CONTAINER}" pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${FILE}"
echo "Done. Size: $(du -h "${FILE}" | cut -f1)"

# Keep last 14 backups
ls -1t "${OUT_DIR}"/careconnect_*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
