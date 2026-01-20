import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const DATA_DIR = path.join(__dirname, '..', 'components', 'db');
const APP_STATE_FILE = path.join(DATA_DIR, 'app-state.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Ensure sport directory exists
async function ensureSportDir(sportName) {
  const sportDir = path.join(DATA_DIR, sportName.toLowerCase().replace(/\s+/g, '-'));
  try {
    await fs.access(sportDir);
  } catch {
    await fs.mkdir(sportDir, { recursive: true });
  }
  return sportDir;
}

// Read JSON file
async function readJSONFile(filePath, defaultValue = null) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return defaultValue;
    }
    throw error;
  }
}

// Write JSON file
async function writeJSONFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Get app state
app.get('/api/state', async (req, res) => {
  try {
    const state = await readJSONFile(APP_STATE_FILE);
    res.json(state);
  } catch (error) {
    console.error('Error reading app state:', error);
    res.status(500).json({ error: 'Failed to read app state' });
  }
});

// Save app state
app.post('/api/state', async (req, res) => {
  try {
    await ensureDataDir();
    await writeJSONFile(APP_STATE_FILE, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving app state:', error);
    res.status(500).json({ error: 'Failed to save app state' });
  }
});

// Get players for a specific sport
app.get('/api/sport/:sportName/players', async (req, res) => {
  try {
    const sportName = req.params.sportName;
    const sportDir = await ensureSportDir(sportName);
    const playersFile = path.join(sportDir, 'players.json');
    const players = await readJSONFile(playersFile, []);
    res.json(players);
  } catch (error) {
    console.error('Error reading players:', error);
    res.status(500).json({ error: 'Failed to read players' });
  }
});

// Save players for a specific sport
app.post('/api/sport/:sportName/players', async (req, res) => {
  try {
    const sportName = req.params.sportName;
    const sportDir = await ensureSportDir(sportName);
    const playersFile = path.join(sportDir, 'players.json');
    await writeJSONFile(playersFile, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving players:', error);
    res.status(500).json({ error: 'Failed to save players' });
  }
});

// Get teams for a specific sport
app.get('/api/sport/:sportName/teams', async (req, res) => {
  try {
    const sportName = req.params.sportName;
    const sportDir = await ensureSportDir(sportName);
    const teamsFile = path.join(sportDir, 'teams.json');
    const teams = await readJSONFile(teamsFile, []);
    res.json(teams);
  } catch (error) {
    console.error('Error reading teams:', error);
    res.status(500).json({ error: 'Failed to read teams' });
  }
});

// Save teams for a specific sport
app.post('/api/sport/:sportName/teams', async (req, res) => {
  try {
    const sportName = req.params.sportName;
    const sportDir = await ensureSportDir(sportName);
    const teamsFile = path.join(sportDir, 'teams.json');
    await writeJSONFile(teamsFile, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving teams:', error);
    res.status(500).json({ error: 'Failed to save teams' });
  }
});

// Get matches for a specific sport
app.get('/api/sport/:sportName/matches', async (req, res) => {
  try {
    const sportName = req.params.sportName;
    const sportDir = await ensureSportDir(sportName);
    const matchesFile = path.join(sportDir, 'matches.json');
    const matches = await readJSONFile(matchesFile, []);
    res.json(matches);
  } catch (error) {
    console.error('Error reading matches:', error);
    res.status(500).json({ error: 'Failed to read matches' });
  }
});

// Save matches for a specific sport
app.post('/api/sport/:sportName/matches', async (req, res) => {
  try {
    const sportName = req.params.sportName;
    const sportDir = await ensureSportDir(sportName);
    const matchesFile = path.join(sportDir, 'matches.json');
    await writeJSONFile(matchesFile, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving matches:', error);
    res.status(500).json({ error: 'Failed to save matches' });
  }
});

// Get all sports data (matches structure)
app.get('/api/sports', async (req, res) => {
  try {
    // Read all sport directories and compile data
    const dirs = await fs.readdir(DATA_DIR, { withFileTypes: true });
    const sportDirs = dirs.filter(dirent => dirent.isDirectory());
    
    const allSportsData = [];
    
    for (const dir of sportDirs) {
      const sportName = dir.name;
      const sportDir = path.join(DATA_DIR, sportName);
      const playersFile = path.join(sportDir, 'players.json');
      const teamsFile = path.join(sportDir, 'teams.json');
      const matchesFile = path.join(sportDir, 'matches.json');
      
      const players = await readJSONFile(playersFile, []);
      const teams = await readJSONFile(teamsFile, []);
      const matches = await readJSONFile(matchesFile, []);
      
      // Reconstruct sport data structure
      if (matches.length > 0) {
        allSportsData.push({
          sportType: matches[0].sportType || sportName,
          customSportName: matches[0].customSportName,
          matches: matches.map(match => ({
            ...match,
            players: players.filter(p => p.matchId === match.id),
            teams: teams.filter(t => t.matchId === match.id)
          }))
        });
      }
    }
    
    res.json(allSportsData);
  } catch (error) {
    console.error('Error reading sports data:', error);
    res.status(500).json({ error: 'Failed to read sports data' });
  }
});

// Save all sports data
app.post('/api/sports', async (req, res) => {
  try {
    await ensureDataDir();
    const sportsData = req.body;
    
    for (const sport of sportsData) {
      const sportName = sport.customSportName || sport.sportType;
      const sportDir = await ensureSportDir(sportName);
      
      // Extract all players and teams from all matches
      const allPlayers = [];
      const allTeams = [];
      const matches = [];
      
      for (const match of sport.matches) {
        // Add sport info to each player and team
        const matchPlayers = match.players.map(p => ({
          ...p,
          sport: sport.sportType,
          customSportName: sport.customSportName,
          matchId: match.id
        }));
        
        const matchTeams = match.teams.map(t => ({
          ...t,
          sport: sport.sportType,
          customSportName: sport.customSportName,
          matchId: match.id
        }));
        
        allPlayers.push(...matchPlayers);
        allTeams.push(...matchTeams);
        
        // Store match without nested players/teams
        matches.push({
          ...match,
          sportType: sport.sportType,
          customSportName: sport.customSportName,
          players: undefined,
          teams: undefined,
          history: match.history
        });
      }
      
      // Save to separate files
      await writeJSONFile(path.join(sportDir, 'players.json'), allPlayers);
      await writeJSONFile(path.join(sportDir, 'teams.json'), allTeams);
      await writeJSONFile(path.join(sportDir, 'matches.json'), matches);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving sports data:', error);
    res.status(500).json({ error: 'Failed to save sports data' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 HypeHammer API Server running on http://localhost:${PORT}`);
  ensureDataDir();
});
