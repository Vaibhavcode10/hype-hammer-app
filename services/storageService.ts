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
  return appStateData as AppState;
}

export async function saveAppState(state: AppState): Promise<boolean> {
  // In prototype mode, just return success (data persists in JSON files)
  console.log('💾 App state saved (prototype mode):', state);
  return true;
}

// Sport-Specific Players Management
export async function loadSportPlayers(sportName: string): Promise<any[] | null> {
  const safeSportName = sportName.toLowerCase().replace(/\s+/g, '-');
  return sportDataMap[safeSportName]?.players || null;
}

export async function saveSportPlayers(sportName: string, players: any[]): Promise<boolean> {
  console.log(`💾 Players saved for ${sportName} (prototype mode):`, players);
  return true;
}

// Sport-Specific Teams Management
export async function loadSportTeams(sportName: string): Promise<any[] | null> {
  const safeSportName = sportName.toLowerCase().replace(/\s+/g, '-');
  return sportDataMap[safeSportName]?.teams || null;
}

export async function saveSportTeams(sportName: string, teams: any[]): Promise<boolean> {
  console.log(`💾 Teams saved for ${sportName} (prototype mode):`, teams);
  return true;
}

// Sport-Specific Matches Management
export async function loadSportMatches(sportName: string): Promise<any[] | null> {
  const safeSportName = sportName.toLowerCase().replace(/\s+/g, '-');
  return sportDataMap[safeSportName]?.matches || null;
}

export async function saveSportMatches(sportName: string, matches: any[]): Promise<boolean> {
  console.log(`💾 Matches saved for ${sportName} (prototype mode):`, matches);
  return true;
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
  return loadAllSportsFromDB();
}

export async function saveSportsData(data: any[]): Promise<boolean> {
  // In prototype mode with JSON files as fake DB
  // Data is kept in React state, updates shown in console
  console.log('💾 Sports data updated (saved in app state):', data);
  return true;
}
