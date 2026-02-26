#!/bin/bash
set -e

# Housing Collectives Database Backup Script
# Run via cron: 0 2 * * * /opt/housing-collectives/infrastructure/backup.sh

BACKUP_DIR="/opt/backups/housing-collectives"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="hc_backup_${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "🗄️  Starting database backup: $BACKUP_FILE"

# Create backup
docker-compose exec -T postgres pg_dump -U hcollective housing_collectives | gzip > "$BACKUP_DIR/$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_DIR/$BACKUP_FILE" ] && [ -s "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo "✅ Database backup created: $BACKUP_FILE"
    ls -lh "$BACKUP_DIR/$BACKUP_FILE"
else
    echo "❌ Backup failed"
    exit 1
fi

# Upload to S3 if configured
if [ -n "$S3_BUCKET" ]; then
    echo "☁️  Uploading to S3..."
    aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://$S3_BUCKET/backups/"
    echo "✅ Uploaded to S3"
fi

# Cleanup old backups
echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "hc_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "✅ Cleanup complete"

# Backup Redis (optional)
echo "💾 Backing up Redis..."
docker-compose exec -T redis redis-cli BGSAVE || echo "⚠️  Redis backup skipped"

echo "✅ All backups complete"
