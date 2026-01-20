# HypeHammer Backend Server

This backend server stores all HypeHammer data in JSON files for permanent storage.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will run on `http://localhost:3001`

## Data Storage

All data is stored in the `server/data/` directory:
- `app-state.json` - Current app state (page, sport, match selection)
- `sports-data.json` - All sports, matches, teams, players, and history

You can view and edit these JSON files directly to see or modify your data.

## API Endpoints

- `GET /api/state` - Get current app state
- `POST /api/state` - Save app state
- `GET /api/sports` - Get all sports data
- `POST /api/sports` - Save sports data
- `GET /api/health` - Health check

## Running Both Frontend and Backend

1. In one terminal, start the backend:
```bash
cd server
npm start
```

2. In another terminal, start the frontend:
```bash
npm run dev
```

The frontend will automatically save all changes to the JSON files via the backend API.
