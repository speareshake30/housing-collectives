# Architecture Documentation

## System Overview

The European Housing Collectives Community is a modern web application built with a microservices-inspired architecture using Docker containers.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Web App   │  │    Mobile   │  │    Admin    │             │
│  │   (React)   │  │   (Future)  │  │   Panel     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │    Nginx Proxy    │
                    │    (SSL/TLS)      │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                    Application Layer                            │
│  ┌───────────────┐          │          ┌───────────────┐       │
│  │    Frontend   │          │          │    Backend    │       │
│  │  (React/Vite) │          │          │  (Node/Express)│      │
│  │   Port: 3000  │          │          │   Port: 3001  │       │
│  └───────────────┘          │          └───────┬───────┘       │
│                             │                  │               │
│                             │                  │               │
│  ┌───────────────┐          │          ┌───────┴───────┐       │
│  │  Socket.io    │◄─────────┴─────────►│  REST API     │       │
│  │  (Real-time)  │                     │  (HTTP/WebSocket)     │
│  └───────────────┘                     └───────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Services Layer  │
└─────────────────────────────────────────────────────────────────┘
│  ┌────────────┐    ┌────────────┐    ┌────────────┐            │
│  │ PostgreSQL │    │   Redis    │    │ Object     │            │
│  │  Port 5432 │    │  Port 6379 │    │   Store    │            │
│  │ (Primary)  │    │ (Cache/    │    │  (S3/MinIO)│            │
│  │            │    │  PubSub)   │    │            │            │
│  └────────────┘    └────────────┘    └────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Frontend (React/Vite)

**Responsibilities:**
- User interface rendering
- Client-side routing
- State management (Zustand/Redux Toolkit)
- Map integration (Leaflet)
- Real-time updates (Socket.io client)

**Key Libraries:**
- React 18 with TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- React Query (server state)
- Socket.io-client (real-time)
- Leaflet (maps)

**Environment Configuration:**
- `VITE_API_URL` - Backend API endpoint
- `VITE_WS_URL` - WebSocket endpoint

### 2. Backend API (Node.js/Express)

**Responsibilities:**
- REST API endpoints
- Authentication & authorization (JWT)
- Business logic
- Database operations
- Real-time messaging (Socket.io)
- File uploads

**Key Modules:**
- Express.js web framework
- Sequelize ORM (PostgreSQL)
- Socket.io (WebSocket server)
- JWT authentication
- Multer (file uploads)
- Rate limiting

**API Structure:**
```
/api/v1/
├── /auth           # Authentication (login, register, refresh)
├── /users          # User management
├── /collectives    # Housing collectives CRUD
├── /messages       # Direct messaging
├── /events         # Events management
├── /listings       # Roommate ads/applications
├── /maps           # Geographic data
└── /uploads        # File handling
```

### 3. PostgreSQL Database

**Purpose:** Primary data store

**Core Tables:**
- `users` - User accounts and profiles
- `collectives` - Housing collective groups
- `collective_members` - Many-to-many relationship
- `messages` - DM conversations
- `events` - Events and RSVPs
- `listings` - Roommate applications
- `locations` - Geographic coordinates for map
- `files` - Uploaded files metadata

**Key Features:**
- UUID primary keys
- Full-text search (for listings)
- PostGIS extension (for location queries)
- JSONB fields (flexible metadata)

### 4. Redis

**Purpose:**
- Session store
- Rate limiting counters
- Real-time presence tracking
- Cache layer (optional)

**Data Structures:**
- Hash: `user:{id}:sessions`
- Set: `online_users`
- String: `rate_limit:{ip}`
- Pub/Sub: `notifications:{user_id}`

### 5. Nginx (Reverse Proxy)

**Responsibilities:**
- SSL/TLS termination
- Request routing
- Static file serving
- Rate limiting
- Load balancing (future)

## Data Flow

### Authentication Flow
```
1. User submits credentials
2. Backend validates against PostgreSQL
3. JWT token generated
4. Token stored in Redis (optional refresh)
5. Token returned to client
6. Client stores in localStorage/cookie
7. Subsequent requests include JWT
```

### Real-time Messaging Flow
```
1. User A sends message
2. Backend validates and stores in PostgreSQL
3. Socket.io emits to User B's socket
4. Redis tracks online status
5. If offline, Redis queue for push notification
```

### Map Data Flow
```
1. Frontend requests map bounds
2. Backend queries PostgreSQL with PostGIS
3. Spatial index query for performance
4. JSON response with geo features
5. Frontend renders with Leaflet
```

## Security Architecture

### Authentication
- JWT tokens with 24h access / 7d refresh
- Passwords hashed with bcrypt (cost 12)
- Rate limiting on auth endpoints
- CSRF protection for cookies

### Authorization
- Role-based access control (RBAC)
- Middleware for route protection
- Resource ownership checks

### Data Protection
- SSL/TLS for all traffic
- Prepared statements (SQL injection prevention)
- Input validation (Zod schemas)
- XSS protection headers
- File upload restrictions (type/size)

## Scalability Considerations

### Horizontal Scaling
- Stateless backend (session in Redis)
- Database read replicas
- CDN for static assets (future)

### Performance
- Database indexing (especially geo)
- Connection pooling (pg-pool)
- Redis caching for hot data
- WebSocket rooms for targeted updates

### Monitoring
- Application logs (structured JSON)
- Health check endpoints
- Metrics (Prometheus/Grafana - future)
- Error tracking (Sentry - future)

## Deployment Architecture

### Production Setup (Docker)
```
Host Server
├── Docker Compose
│   ├── nginx (reverse proxy, SSL)
│   ├── frontend (static served by nginx)
│   ├── backend (Node.js, multiple replicas possible)
│   ├── postgres (volume mounted)
│   └── redis
├── Persistent Volumes
│   ├── postgres_data
│   ├── redis_data
│   └── uploads
└── SSL Certificates (Let's Encrypt)
```

### CI/CD Pipeline
1. GitHub Actions runs tests
2. Docker images built and pushed
3. SSH deployment to server
4. Database migrations applied
5. Rolling update of containers

## Technology Decisions

| Decision | Rationale |
|----------|-----------|
| PostgreSQL | Mature, ACID, PostGIS for geo |
| Redis | Fast in-memory, pub/sub for real-time |
| Socket.io | Widely adopted, fallback support |
| Docker | Consistent environments, easy deployment |
| Traefik (alt) | Could replace Nginx for auto SSL |

## Future Enhancements

- Kubernetes for orchestration
- CDN integration (CloudFlare/AWS)
- Microservices split (auth service)
- GraphQL API alongside REST
- Mobile app (React Native/Flutter)
