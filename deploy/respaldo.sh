#!/bin/sh
# Respaldo diario de la base. Programarlo con cron en el VPS, por ejemplo:
#   0 4 * * * /ruta/a/FreeDeli/deploy/respaldo.sh
set -eu
cd "$(dirname "$0")"
mkdir -p respaldos
archivo="respaldos/freedeli-$(date +%Y%m%d-%H%M).sql.gz"
docker compose exec -T postgres pg_dump -U freedeli freedeli | gzip > "$archivo"
# Conserva los últimos 14 días.
find respaldos -name 'freedeli-*.sql.gz' -mtime +14 -delete
echo "Respaldo listo: $archivo"
