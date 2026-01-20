// Import JSON files directly
import cricketPlayers from '../components/db/cricket/players.json';
import cricketTeams from '../components/db/cricket/teams.json';
import cricketMatches from '../components/db/cricket/matches.json';

import footballPlayers from '../components/db/football/players.json';
import footballTeams from '../components/db/football/teams.json';
import footballMatches from '../components/db/football/matches.json';

import kabaddiPlayers from '../components/db/kabaddi/players.json';
import kabaddiTeams from '../components/db/kabaddi/teams.json';
import kabaddiMatches from '../components/db/kabaddi/matches.json';

import appStateData from '../components/db/app-state.json';

// Optional API base (defaults to local dev server)
const API_BASE = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:3001';

// Local storage keys
const STORAGE_KEYS = {
  appState: 'hypehammer.appState',
  sportsData: 'hypehammer.sportsData'
};

// Safe localStorage helpers (no-op on server)
const safeGetItem = (key: string) => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    console.warn('LocalStorage get failed', err);
    return null;
  }
};

const safeSetItem = (key: string, value: string) => {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn('LocalStorage set failed', err);
    return false;
  }
};

// Fetch helper with graceful failure
const fetchFromApi = async (path: string, options?: RequestInit) => {
  if (typeof fetch === 'undefined') return null;
  try {
    const res = await fetch(`${API_BASE}${path}`, options);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    if (res.status === 204) return null;
    return await res.json();
  } catch (err) {
    console.warn('API request failed, falling back to local data', path, err);
    return null;
  }
};

export interface AppState {
  status: string;
  currentSport: string | null;
  currentMatchId: string | null;
  activeTab: string;
}

// Map of sport data
const sportDataMap: any = {
  'cricket': {
    players: cricketPlayers,
    teams: cricketTeams,
    matches: cricketMatches
  },
  'football': {
    players: footballPlayers,
    teams: footballTeams,
    matches: footballMatches
  },
  'kabaddi': {
    players: kabaddiPlayers,
    teams: kabaddiTeams,
    matches: kabaddiMatches
  }
};

console.log('📊 HypeHammer initialized with JSON data');

// App State Management
export async function loadAppState(): Promise<AppState | null> {
  // Try API first
  const apiState = await fetchFromApi('/api/state');
  if (apiState) return apiState as AppState;

  // Then localStorage
  const saved = safeGetItem(STORAGE_KEYS.appState);
  if (saved) {
    try {
      return JSON.parse(saved) as AppState;
    } catch (err) {
      console.warn('Failed to parse saved app state, falling back to seed', err);
    }
  }
  return appStateData as AppState;
}

export async function saveAppState(state: AppState): Promise<boolean> {
  // Try API
  const apiSaved = await fetchFromApi('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state)
  });
  if (apiSaved) return true;

  const ok = safeSetItem(STORAGE_KEYS.appState, JSON.stringify(state));
  if (!ok) console.warn('App state did not persist');
  return ok;
}

// Sport-Specific Players Management
export async function loadSportPlayers(sportName: string): Promise<any[] | null> {
  const safeSportName = sportName.toLowerCase().replace(/\s+/g, '-');

  const apiData = await fetchFromApi(`/api/sport/${safeSportName}/players`);
  if (apiData) return apiData;

  return sportDataMap[safeSportName]?.players || null;
}

export async function saveSportPlayers(sportName: string, players: any[]): Promise<boolean> {
  const safeSportName = sportName.toLowerCase().replace(/\s+/g, '-');
  const apiSaved = await fetchFromApi(`/api/sport/${safeSportName}/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(players)
  });
  if (apiSaved) return true;
  console.log(`💾 Players saved locally for ${sportName} (fallback)`, players);
  return safeSetItem(`${STORAGE_KEYS.sportsData}.${safeSportName}.players`, JSON.stringify(players));
}

// Sport-Specific Teams Management
export async function loadSportTeams(sportName: string): Promise<any[] | null> {
  const safeSportName = sportName.toLowerCase().replace(/\s+/g, '-');
  const apiData = await fetchFromApi(`/api/sport/${safeSportName}/teams`);
  if (apiData) return apiData;
  return sportDataMap[safeSportName]?.teams || null;
}

export async function saveSportTeams(sportName: string, teams: any[]): Promise<boolean> {
  const safeSportName = sportName.toLowerCase().replace(/\s+/g, '-');
  const apiSaved = await fetchFromApi(`/api/sport/${safeSportName}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(teams)
  });
  if (apiSaved) return true;
  console.log(`💾 Teams saved locally for ${sportName} (fallback)`, teams);
  return safeSetItem(`${STORAGE_KEYS.sportsData}.${safeSportName}.teams`, JSON.stringify(teams));
}

// Sport-Specific Matches Management
export async function loadSportMatches(sportName: string): Promise<any[] | null> {
  const safeSportName = sportName.toLowerCase().replace(/\s+/g, '-');
  const apiData = await fetchFromApi(`/api/sport/${safeSportName}/matches`);
  if (apiData) return apiData;
  return sportDataMap[safeSportName]?.matches || null;
}

export async function saveSportMatches(sportName: string, matches: any[]): Promise<boolean> {
  const safeSportName = sportName.toLowerCase().replace(/\s+/g, '-');
  const apiSaved = await fetchFromApi(`/api/sport/${safeSportName}/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(matches)
  });
  if (apiSaved) return true;
  console.log(`💾 Matches saved locally for ${sportName} (fallback)`, matches);
  return safeSetItem(`${STORAGE_KEYS.sportsData}.${safeSportName}.matches`, JSON.stringify(matches));
}

// Map sport folder names to proper sport types
const sportTypeMap: any = {
  'cricket': 'Cricket',
  'football': 'Football',
  'kabaddi': 'Kabaddi'
};

// Load complete sport data (matches with players and teams)
export async function loadCompleteSportData(sportName: string): Promise<any | null> {
  const safeSportName = sportName.toLowerCase().replace(/\s+/g, '-');
  const sportData = sportDataMap[safeSportName];
  
  if (!sportData || !sportData.matches || sportData.matches.length === 0) {
    return null;
  }

  // Combine data: add players and teams to their respective matches
  const matchesWithData = sportData.matches.map((match: any) => {
    const matchPlayers = sportData.players.filter((p: any) => p.matchId === match.id);
    const matchTeams = sportData.teams.filter((t: any) => t.matchId === match.id);
    
    return {
      ...match,
      players: matchPlayers,
      teams: matchTeams
    };
  });

  const properSportType = sportTypeMap[safeSportName] || sportName;
  return {
    sportType: properSportType,
    customSportName: properSportType,
    matches: matchesWithData
  };
}

// Load all sports from JSON files
export async function loadAllSportsFromDB(): Promise<any[]> {
  const sportsList = ['cricket', 'football', 'kabaddi'];
  const sportsData = await Promise.all(
    sportsList.map(sport => loadCompleteSportData(sport))
  );
  
  return sportsData.filter(sport => sport !== null);
}

// All Sports Data Management (for compatibility)
export async function loadSportsData(): Promise<any[] | null> {
  // Try API first (reads/assembles all sports from disk)
  const apiData = await fetchFromApi('/api/sports');
  if (apiData) return apiData;

  const stored = safeGetItem(STORAGE_KEYS.sportsData);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (err) {
      console.warn('Failed to parse stored sports data, falling back to seed', err);
    }
  }
  return loadAllSportsFromDB();
}

export async function saveSportsData(data: any[]): Promise<boolean> {
  // Try API write to real JSON files on disk via local server
  const apiSaved = await fetchFromApi('/api/sports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (apiSaved) return true;

  const ok = safeSetItem(STORAGE_KEYS.sportsData, JSON.stringify(data));
  if (!ok) console.warn('Sports data did not persist');
  return ok;
}
