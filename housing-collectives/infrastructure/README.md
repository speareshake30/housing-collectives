# Infrastructure Guide

This directory contains all infrastructure configuration for the Housing Collectives project.

## Directory Structure

```
infrastructure/
├── README.md           # This file
├── architecture.md     # System architecture documentation
├── docker-compose.monitoring.yml  # Monitoring stack
├── nginx.conf          # Nginx reverse proxy config
├── init.sql           # PostgreSQL initialization
├── ssl/               # SSL certificates (gitignored)
├── backups/           # Database backups (gitignored)
├── deploy.sh          # Deployment script
├── backup.sh          # Database backup script
└── ssl-setup.sh       # Let's Encrypt SSL setup
```

## Scripts

### Deploy (`deploy.sh`)

Main deployment script for production and development environments.

```bash
# Deploy to production
./infrastructure/deploy.sh production

# Deploy with dev profile (includes MailHog)
./infrastructure/deploy.sh development
```

### Backup (`backup.sh`)

Automated database backup with S3 upload support.

```bash
# Manual backup
./infrastructure/backup.sh

# Setup cron for daily backups
0 2 * * * /opt/housing-collectives/infrastructure/backup.sh
```

### SSL Setup (`ssl-setup.sh`)

Sets up Let's Encrypt SSL certificates with auto-renewal.

```bash
./infrastructure/ssl-setup.sh example.com admin@example.com
```

## Monitoring

The monitoring stack includes:
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **Loki**: Log aggregation
- **Promtail**: Log shipping
- **cAdvisor**: Container metrics
- **Node Exporter**: System metrics

### Starting Monitoring

```bash
cd infrastructure/monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

### Accessing Dashboards

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3003 (admin/admin or custom credentials)

## SSL Certificates

### Development
Self-signed certificates are auto-generated on first deploy.

### Production
Use Let's Encrypt via the ssl-setup.sh script or provide your own certificates in `infrastructure/ssl/`:
- `cert.pem` - Full certificate chain
- `key.pem` - Private key

## Environment Configuration

Copy `.env.example` to `.env` and configure:
- Database credentials
- JWT secret
- Redis connection
- Domain and SSL settings
- Cloud provider tokens

## Database

### Initialization
The `init.sql` file runs when PostgreSQL starts for the first time. It:
- Enables PostGIS extension for geometric data
- Sets up UUID generation
- Creates the application schema

### Migrations
Run migrations manually:
```bash
docker-compose exec backend npm run migrate
```

Or they run automatically on startup in production.

## Backup Strategy

Local backups are kept for 30 days. Configure S3 for offsite storage:
```bash
export S3_BACKUP_BUCKET=your-bucket-name
./infrastructure/backup.sh
```

## Troubleshooting

### Services Won't Start
```bash
# Check logs
docker-compose logs -f

# Reset everything (WARNING: data loss)
docker-compose down -v
```

### Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready

# Connect to database
docker-compose exec postgres psql -U hcollective -d housing_collectives
```

### SSL Errors
```bash
# Regenerate self-signed certs
rm -f infrastructure/ssl/*
./infrastructure/deploy.sh

# Or setup Let's Encrypt
./infrastructure/ssl-setup.sh yourdomain.com your@email.com
```

## Security Notes

- Never commit `.env` files or SSL certificates
- Change default passwords in production
- Use strong JWT secrets (min 32 chars)
- Enable firewall rules for ports 80/443 only
- Keep Docker images updated
