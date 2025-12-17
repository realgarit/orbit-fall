# Orbit Fall - DarkOrbit Clone

A 2D space shooter game clone built with modern web technologies.

## Tech Stack

- **Frontend**: React + PixiJS + Vite + TypeScript
- **Backend**: Node.js + Express + Socket.IO + PostgreSQL + TypeScript

## Project Structure

```
orbit-fall/
├── packages/
│   ├── frontend/     # React + Vite + PixiJS frontend
│   ├── backend/      # Node.js + Express + Socket.IO backend
│   └── shared/       # Shared types and utilities
```

## Getting Started

### Prerequisites

- Node.js 20.x LTS
- PostgreSQL (for backend)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Copy `packages/backend/.env.example` to `packages/backend/.env`
   - Configure your PostgreSQL connection

3. Run the development servers:
```bash
npm run dev
```

Or run them separately:
```bash
npm run dev:frontend  # Frontend on http://localhost:5173
npm run dev:backend   # Backend on http://localhost:3000
```

## Development

- `npm run dev` - Run both frontend and backend
- `npm run dev:frontend` - Run frontend only
- `npm run dev:backend` - Run backend only
- `npm run build` - Build all packages
- `npm run build:frontend` - Build frontend
- `npm run build:backend` - Build backend

## License

MIT

