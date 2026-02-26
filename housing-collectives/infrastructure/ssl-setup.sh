#!/bin/bash
set -e

# Let's Encrypt SSL Certificate Setup
# Run this on your production server

DOMAIN=${1:-$DOMAIN}
EMAIL=${2:-$SSL_EMAIL}

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: $0 <domain> <email>"
    echo "Or set DOMAIN and SSL_EMAIL environment variables"
    exit 1
fi

echo "🔒 Setting up SSL for $DOMAIN"

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Stop nginx temporarily
# echo "🛑 Stopping nginx..."
# docker-compose stop nginx

# Obtain certificate
echo "📜 Obtaining certificate..."
certbot certonly --standalone \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --agree-tos \
    -m "$EMAIL" \
    -n \
    --keep

# Copy certificates to infrastructure directory
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
INFRA_DIR="$(dirname "$0")"

echo "📋 Copying certificates..."
cp "$CERT_DIR/fullchain.pem" "$INFRA_DIR/ssl/cert.pem"
cp "$CERT_DIR/privkey.pem" "$INFRA_DIR/ssl/key.pem"

# Set up auto-renewal
echo "🔄 Setting up auto-renewal..."
CRON_JOB="0 3 * * * certbot renew --quiet --deploy-hook 'cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $INFRA_DIR/ssl/cert.pem && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $INFRA_DIR/ssl/key.pem && docker-compose -f $INFRA_DIR/../docker-compose.yml restart nginx'"

# Remove existing cron job for this domain
(crontab -l 2>/dev/null | grep -v "$DOMAIN" || true) | crontab -

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ SSL setup complete!"
echo "📅 Auto-renewal configured for 3 AM daily"
echo "📁 Certificates copied to: $INFRA_DIR/ssl/"
