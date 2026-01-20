# HypeHammer - Data Storage Setup

## What Changed?

Your data is now stored in **permanent JSON files** instead of browser cache (localStorage). This means:

✅ **Permanent Storage** - Data persists forever, not just in browser cache  
✅ **Viewable Data** - You can open and view the JSON files directly  
✅ **Live Updates** - Changes are saved to files in real-time  
✅ **Backup Ready** - Easy to backup by copying the JSON files

## Quick Start

### 1. Install Server Dependencies

Open PowerShell in the project root and run:

```powershell
cd server
npm install
```

### 2. Start Both Frontend and Backend

Open **TWO** PowerShell terminals:

**Terminal 1 - Backend Server:**
```powershell
cd server
npm start
```
This starts the backend server on `http://localhost:3001`

**Terminal 2 - Frontend App:**
```powershell
npm run dev
```
This starts the frontend on `http://localhost:5173`

### 3. View Your Data

All your data is stored in JSON files at:
```
server/data/app-state.json      <- Current page, sport, match selection
server/data/sports-data.json    <- All matches, teams, players, history
```

You can open these files with any text editor to see your data!

## Data Files Location

```
hype-hammer/
├── server/
│   ├── data/
│   │   ├── app-state.json      ← Current app state
│   │   └── sports-data.json    ← All your matches & data
│   ├── index.js                ← Backend server
│   └── package.json
```

## How It Works

1. Every time you make a change (create match, add team, etc.)
2. The frontend automatically sends the data to the backend
3. The backend saves it to JSON files in `server/data/`
4. When you refresh, data is loaded from these JSON files
5. **Data persists forever** - even after closing browser or restarting computer

## Benefits Over localStorage

| Feature | localStorage (Old) | JSON Files (New) |
|---------|-------------------|------------------|
| Permanent | ❌ Can be cleared | ✅ Always saved |
| Viewable | ❌ Hard to access | ✅ Open & view easily |
| Backup | ❌ Difficult | ✅ Copy JSON files |
| Share | ❌ Can't share | ✅ Send JSON files |
| Debug | ❌ Hard to inspect | ✅ Read files directly |

Enjoy your permanent, viewable data storage! 🎉
