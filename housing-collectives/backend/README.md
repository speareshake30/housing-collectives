# European Housing Collectives API

Backend API for the European Housing Collectives community platform.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 15+ with PostGIS
- **Auth**: JWT with refresh token rotation
- **Validation**: Joi

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Set Up Database

```bash
# Create PostgreSQL database
createdb housing_collectives

# Enable PostGIS
psql housing_collectives -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql housing_collectives -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# Run schema (from schema.sql)
psql housing_collectives < ../backend/schema.sql
```

### 4. Start Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/logout-all` - Logout all devices
- `GET /api/v1/auth/me` - Get current user

### Users
- `GET /api/v1/users/me` - Get current user profile
- `PATCH /api/v1/users/me` - Update profile
- `GET /api/v1/users/:username` - Get public profile

### Collectives
- `GET /api/v1/collectives` - List collectives
- `POST /api/v1/collectives` - Create collective
- `GET /api/v1/collectives/:slug` - Get collective details
- `PATCH /api/v1/collectives/:slug` - Update collective
- `GET /api/v1/collectives/:slug/members` - List members
- `POST /api/v1/collectives/:slug/join` - Join collective
- `POST /api/v1/collectives/:slug/leave` - Leave collective
- `POST /api/v1/collectives/:slug/members/:user_id/role` - Update member role

## Authentication

API uses JWT tokens:
- **Access Token**: Short-lived (1 hour), sent in `Authorization: Bearer <token>` header
- **Refresh Token**: Long-lived (30 days), stored in HttpOnly cookie

## Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Route handlers
├── middleware/       # Auth, error handling, etc.
├── models/           # Database models
├── routes/           # Route definitions
├── services/         # Business logic (to be added)
├── utils/            # Utilities (to be added)
├── db.js            # Database connection
└── server.js        # Entry point
```

## Status

- [x] Basic Express server setup
- [x] Database connection and models
- [x] User model with auth
- [x] JWT authentication with refresh tokens
- [x] Collective model and CRUD
- [x] Error handling middleware
- [ ] Roommate ads (TODO)
- [ ] Events system (TODO)
- [ ] Messaging system (TODO)
- [ ] File uploads (TODO)
- [ ] WebSocket events (TODO)
- [ ] Notifications (TODO)

## Testing

```bash
# Register a user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123","display_name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username_or_email":"testuser","password":"password123"}'

# Get current user (use token from login)
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```
