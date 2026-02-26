# Collective - European Housing Collectives Platform

A React-based frontend for connecting housing collectives across Europe.

## Design System

- **Primary**: #8B9A7D (sage green)
- **Background**: #FAF7F2 (cream)
- **Text**: #2D3436 (charcoal)
- **Font**: Inter, sans-serif

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── Layout/          # Header, footer wrapper
│   └── Navigation/      # Navigation links
├── context/
│   └── AuthContext.jsx  # JWT auth state
├── pages/
│   ├── HomePage/        # Landing page
│   ├── LoginPage/       # User login
│   ├── RegisterPage/    # User registration
│   ├── CollectivesPage/ # List collectives
│   ├── CollectiveDetailPage/ # Single collective
│   ├── EventsPage/      # Events listing
│   └── ProfilePage/     # User profile
├── services/
│   └── api.js           # Axios with JWT interceptor
├── styles/
│   └── global.css       # Design system & globals
├── App.jsx              # Router setup
└── main.jsx             # Entry point
```

## Routes

- `/` - Home
- `/collectives` - Browse collectives
- `/collectives/:slug` - Collective detail
- `/events` - Events
- `/login` - Login
- `/register` - Register
- `/profile/:username` - User profile
