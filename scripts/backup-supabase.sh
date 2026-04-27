#!/bin/bash
# =============================================================================
# AirBallistiK — Sauvegarde automatique de la base Supabase (PostgreSQL)
# À déployer dans le crontab de la VM : 
#   0 3 * * * /home/airadmin/airballistik/scripts/backup-supabase.sh
# =============================================================================

BACKUP_DIR="/home/airadmin/backups"
CONTAINER="supabase-db"
DB_USER="postgres"
DB_NAME="postgres"
RETENTION_DAYS=7
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/airballistik_${TIMESTAMP}.sql.gz"

# Créer le dossier si inexistant
mkdir -p "$BACKUP_DIR"

echo "=== [$(date)] Démarrage backup Supabase ==="

# Dump compressé via pg_dump dans le conteneur Docker
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl \
  | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup réussi : $BACKUP_FILE ($SIZE)"
else
    echo "❌ Erreur lors du backup !"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Rotation : supprimer les backups de plus de N jours
DELETED=$(find "$BACKUP_DIR" -name "airballistik_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
    echo "🗑️  $DELETED ancien(s) backup(s) supprimé(s) (> ${RETENTION_DAYS} jours)"
fi

echo "=== Backup terminé ==="
