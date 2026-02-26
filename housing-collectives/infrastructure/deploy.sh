#!/bin/bash
set -e

# Housing Collectives Deployment Script
# Usage: ./deploy.sh [production|staging]

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🏠 Housing Collectives Deployment"
echo "=================================="
echo "Environment: $ENVIRONMENT"
echo ""

# Check prerequisites
command -v docker-compose >/dev/null 2>&1 || { echo "❌ docker-compose is required"; exit 1; }

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]; then
    echo "📄 Loading .env.$ENVIRONMENT"
    export $(grep -v '^#' "$PROJECT_ROOT/.env.$ENVIRONMENT" | xargs)
elif [ -f "$PROJECT_ROOT/.env" ]; then
    echo "📄 Loading .env"
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
else
    echo "⚠️  No environment file found, using defaults"
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p "$PROJECT_ROOT/infrastructure/ssl"
mkdir -p "$PROJECT_ROOT/infrastructure/backups"
mkdir -p "$PROJECT_ROOT/uploads"

# SSL Certificate setup (if not exists)
if [ ! -f "$PROJECT_ROOT/infrastructure/ssl/cert.pem" ]; then
    echo "🔒 Generating self-signed SSL certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$PROJECT_ROOT/infrastructure/ssl/key.pem" \
        -out "$PROJECT_ROOT/infrastructure/ssl/cert.pem" \
        -subj "/C=DE/ST=Berlin/L=Berlin/O=Housing Collectives/CN=localhost"
    echo "✅ Self-signed certificate created (use Let's Encrypt for production)"
fi

# Pull latest images
echo "🐳 Pulling latest images..."
docker-compose pull

# Run database migrations
echo "🗄️  Running database migrations..."
if docker-compose ps | grep -q backend; then
    docker-compose exec -T backend npm run migrate || echo "⚠️  Migration may have already run"
else
    echo "⚠️  Backend not running, skipping migrations"
fi

# Start services
echo "🚀 Starting services..."
if [ "$ENVIRONMENT" = "production" ]; then
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" --profile production up -d --remove-orphans
else
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" --profile dev up -d --remove-orphans
fi

# Wait for health check
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Health check
echo "🩺 Health check..."
if curl -fs http://localhost:${API_PORT:-3001}/health >/dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend health check failed"
fi

# Cleanup
echo "🧹 Cleaning up..."
docker image prune -f
docker volume prune -f

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Services:"
echo "  Frontend:  http://localhost:${FRONTEND_PORT:-3000}"
echo "  Backend:   http://localhost:${API_PORT:-3001}"
echo "  PostgreSQL: localhost:${DB_PORT:-5432}"
echo "  Redis:      localhost:${REDIS_PORT:-6379}"
if [ "$ENVIRONMENT" != "production" ]; then
    echo "  MailHog:   http://localhost:${MAILHOG_WEB_PORT:-8025}"
fi
