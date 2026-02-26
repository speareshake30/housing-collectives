# European Housing Collectives - Community Website

## Vision
A community platform connecting European housing collectives with people seeking communal living opportunities. Think "Reddit meets Airbnb meets Couchsurfing" but specifically for intentional communities and housing collectives.

## Core Philosophy
- **Community-first**: Built by and for collectives
- **Privacy-respecting**: Users control their data
- **Open and welcoming**: Inclusive to all types of collective living
- **Visually rich**: High-end photography celebrates collective spaces
- **Tech-hippie aesthetic**: Clean, modern, yet organic and spaced-out

---

## Key Features

### 1. Collective Profiles (Rich)
Each housing collective gets a detailed profile page:
- **Photos**: Gallery with high-res imagery of spaces, people, events
- **Location**: Map integration with approximate location (privacy-aware)
- **About**: Description, values, house rules, culture
- **Amenities**: Room types, common spaces, garden, etc.
- **Current residents**: Number, demographics, backgrounds
- **Application process**: How to join, waiting list, requirements
- **Contact**: DM the collective
- **Events**: Collective-specific event listings

### 2. User Profiles (Light)
- **Username**: Self-chosen (Reddit-style), unique
- **Avatar**: Profile photo
- **Bio**: Short description
- **Interests**: Tags (gardening, cooking, music, etc.)
- **Status**: Looking for collective / Just browsing / Member of [collective]
- **Collectives**: Linked membership(s)

### 3. Direct Messaging
- **Person-to-Person**: Private DMs between users
- **Person-to-Collective**: Message a collective (routed to admins)
- **Real-time**: WebSocket-based chat
- **Notifications**: Email/push for new messages

### 4. Map Feature
- **Interactive map** showing collectives across Europe
- **Filters**: By country, size, type (urban/rural), open spots
- **Privacy**: Exact addresses hidden, approximate location shown
- **Clustering**: Group nearby collectives at zoomed-out levels

### 5. Roommate Finder
- **Applications**: Users can apply to join collectives
- **Ads**: Collectives can post "roommate wanted" listings
- **Filters**: By location, rent range, move-in date
- **Status tracking**: Application progress indicator

### 6. Events System
- **Public Events**: Open to anyone (workshops, open houses, festivals)
- **Collective Events**: Internal events for members/friends
- **Calendar view**: Monthly/weekly/list views
- **RSVP**: Attendance tracking
- **Reminders**: Email notifications

---

## Design Direction: "Tech Hippie"

### Visual Language
- **Colors**: Earth tones (sage, terracotta, sand) + neon accents (electric blue, hot pink)
- **Typography**: Clean sans-serif for readability, decorative serif for headers
- **Spacing**: Generous whitespace, "breathing room"
- **Shapes**: Organic curves mixed with sharp geometric accents
- **Imagery**: Full-bleed photos, no harsh borders

### Vibe Words
- Cosmic
- Grounded
- Intentional
- Warm
- Modern-bohemian
- Clean-but-weird (in a good way)

---

## Technical Stack (TBD by team)

### Backend
- Database: PostgreSQL
- API: REST + WebSocket
- Auth: JWT
- File storage: S3-compatible
- Maps: Mapbox/Leaflet

### Frontend
- Framework: React/Vue/Svelte
- Styling: Tailwind/custom CSS
- Maps: Mapbox GL JS
- Images: Lazy loading, optimization

### Infrastructure
- Docker containers
- CI/CD: GitHub Actions
- Hosting: Hetzner/DigitalOcean/AWS
- CDN: Cloudflare

---

## Team Roles

- **CL2 (Backend)**: Database schema, API design, auth, WebSockets
- **CL4 (Frontend)**: UI/UX, design system, component library
- **CL5 (DevOps)**: Infrastructure, Docker, deployment, CI/CD
- **CL3 (Coordinator)**: Requirements, docs, integration, user liaison

---

## Milestones

### Phase 1: Foundation (Today)
- [ ] Project structure
- [ ] Database schema
- [ ] Design system
- [ ] Docker setup

### Phase 2: Core Features (Week 1)
- [ ] User auth
- [ ] Collective profiles
- [ ] Basic map
- [ ] Photo uploads

### Phase 3: Social Features (Week 2)
- [ ] DMs
- [ ] Events
- [ ] Roommate finder

### Phase 4: Polish (Week 3)
- [ ] i18n setup
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Launch prep

---

## Open Questions

1. Domain name? (collective.house? commune.zone?)
2. Moderation approach for content?
3. Verification process for collectives?
4. Cost/ monetization model?
