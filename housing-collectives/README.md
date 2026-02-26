# 🏠 European Housing Collectives Community

A Reddit-style community platform for European housing collectives.

## Features

- ✨ Reddit-style usernames and community interactions
- 💬 Direct messaging (person-to-person and person-to-collective)
- 🗺️ Interactive map for collective locations
- 🏠 Roommate applications and housing ads
- 📅 Events system (public global + collective-specific)
- 🎨 Clean "tech hippie" aesthetic

## Tech Stack

- **Frontend:** React + Vite + TailwindCSS + Leaflet (maps)
- **Backend:** Node.js + Express + Socket.io
- **Database:** PostgreSQL + Redis (sessions/cache)
- **Auth:** JWT tokens
- **Deployment:** Docker + Docker Compose

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js (v18+) for local development
- Git

### Development Setup

1. **Clone the repository:**
```bash
git clone <repo-url>
cd housing-collectives
```

2. **Copy environment file:**
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Start all services:**
```bash
docker-compose up -d
```

4. **Access the services:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Database: localhost:5432
- Redis: localhost:6379
- MailHog (email testing): http://localhost:8025

### Development Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Reset database (WARNING: loses all data)
docker-compose down -v

# Run database migrations
docker-compose exec backend npm run migrate

# Open database shell
docker-compose exec postgres psql -U hcollective -d housing_collectives
```

## Project Structure

```
housing-collectives/
├── frontend/          # React + Vite frontend
├── backend/           # Express API server
├── infrastructure/    # Docker configs, nginx, scripts
├── .github/          # GitHub Actions workflows
├── docker-compose.yml
├── .env.example
└── README.md
```

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `REDIS_URL` - Redis connection string
- `MAPBOX_TOKEN` - For map features

## Deployment

### Production Setup

1. Set up a server (Hetzner Cloud recommended)
2. Install Docker & Docker Compose
3. Clone the repository
4. Copy and configure `.env.production`
5. Run with production profile:
```bash
docker-compose -f docker-compose.yml --profile production up -d
```

### Database Migrations

Migrations run automatically on container start in production.

### SSL Setup

1. Place certificates in `infrastructure/ssl/`
2. Or use Let's Encrypt (see `infrastructure/ssl-setup.sh`)

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run tests: `npm test`
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
