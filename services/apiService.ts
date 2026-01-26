/**
 * API Service Layer
 * Maps frontend operations to Flask/Firebase backend endpoints
 * 
 * Base URL: http://localhost:5000/api
 */

const API_BASE = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:5000';
const API_ENDPOINT = `${API_BASE}/api`;

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiCall<T = any>(
  path: string,
  method: string = 'GET',
  body?: any
): Promise<T | null> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_ENDPOINT}${path}`, options);
    
    if (!response.ok) {
      console.warn(`API Error: ${method} ${path} - Status ${response.status}`);
      const error: any = new Error(`API Error: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) {
      return null;
    }

    const data: ApiResponse<T> = await response.json();
    
    if (!data.success) {
      console.warn(`API Error: ${data.error || 'Unknown error'}`);
      return null;
    }

    return data.data || null;
  } catch (error) {
    console.error(`API Call Failed: ${method} ${path}`, error);
    return null;
  }
}

/**
 * Generic GET request
 */
async function get<T = any>(path: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_ENDPOINT}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data: ApiResponse<T> = await response.json();
    return data;
  } catch (error) {
    console.error(`GET ${path} failed:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Generic POST request
 */
async function post<T = any>(path: string, body?: any): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_ENDPOINT}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const data: ApiResponse<T> = await response.json();
    return data;
  } catch (error) {
    console.error(`POST ${path} failed:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Generic PUT request
 */
async function put<T = any>(path: string, body?: any): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_ENDPOINT}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const data: ApiResponse<T> = await response.json();
    return data;
  } catch (error) {
    console.error(`PUT ${path} failed:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Generic DELETE request
 */
async function del<T = any>(path: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_ENDPOINT}${path}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data: ApiResponse<T> = await response.json();
    return data;
  } catch (error) {
    console.error(`DELETE ${path} failed:`, error);
    return { success: false, error: String(error) };
  }
}

// ========================
// STATE MANAGEMENT
// ========================

export async function getAppState() {
  return apiCall('/state');
}

export async function saveAppState(state: any) {
  return apiCall('/state', 'POST', state);
}

// ========================
// USER MANAGEMENT
// ========================

export async function getAllUsers() {
  return apiCall('/users');
}

export async function getUserById(userId: string) {
  return apiCall(`/users/${userId}`);
}

export async function getUserByEmail(email: string) {
  return apiCall(`/users/email/${email}`);
}

export async function createUser(userData: any) {
  return apiCall('/users', 'POST', userData);
}

export async function updateUser(userId: string, userData: any) {
  return apiCall(`/users/${userId}`, 'PUT', userData);
}

export async function deleteUser(userId: string) {
  return apiCall(`/users/${userId}`, 'DELETE');
}

// ========================
// REGISTRATION
// ========================

export async function registerAuctioneer(auctioneerData: any) {
  return apiCall('/register/auctioneer', 'POST', auctioneerData);
}

export async function registerTeam(teamData: any) {
  return apiCall('/register/team', 'POST', teamData);
}

export async function registerPlayer(playerData: any) {
  return apiCall('/register/player', 'POST', playerData);
}

export async function registerGuest(guestData: any) {
  return apiCall('/register/guest', 'POST', guestData);
}

// ========================
// PLAYER MANAGEMENT
// ========================

export async function getAllPlayers(filters?: { sport?: string; status?: string; auctionId?: string }) {
  let query = '';
  if (filters) {
    const params = new URLSearchParams();
    if (filters.sport) params.append('sport', filters.sport);
    if (filters.status) params.append('status', filters.status);
    if (filters.auctionId) params.append('auctionId', filters.auctionId);
    query = params.toString() ? `?${params.toString()}` : '';
  }
  return apiCall(`/players${query}`);
}

export async function getPlayerById(playerId: string) {
  return apiCall(`/players/${playerId}`);
}

export async function createPlayer(playerData: any) {
  return apiCall('/players', 'POST', playerData);
}

export async function updatePlayer(playerId: string, playerData: any) {
  return apiCall(`/players/${playerId}`, 'PUT', playerData);
}

export async function deletePlayer(playerId: string) {
  return apiCall(`/players/${playerId}`, 'DELETE');
}

export async function sellPlayer(playerId: string, teamId: string, soldPrice: number) {
  return apiCall(`/players/${playerId}/sell`, 'POST', { teamId, soldPrice });
}

// ========================
// TEAM MANAGEMENT
// ========================

export async function getAllTeams() {
  return apiCall('/teams');
}

export async function getTeamById(teamId: string) {
  return apiCall(`/teams/${teamId}`);
}

export async function createTeam(teamData: any) {
  return apiCall('/teams', 'POST', teamData);
}

export async function updateTeam(teamId: string, teamData: any) {
  return apiCall(`/teams/${teamId}`, 'PUT', teamData);
}

export async function deleteTeam(teamId: string) {
  return apiCall(`/teams/${teamId}`, 'DELETE');
}

export async function updateTeamBudget(teamId: string, amount: number) {
  return apiCall(`/teams/${teamId}/budget`, 'PUT', { amount });
}

// ========================
// AUCTION MANAGEMENT
// ========================

export async function getAllAuctions(filters?: { sport?: string; status?: string }) {
  let query = '';
  if (filters) {
    const params = new URLSearchParams();
    if (filters.sport) params.append('sport', filters.sport);
    if (filters.status) params.append('status', filters.status);
    query = params.toString() ? `?${params.toString()}` : '';
  }
  return apiCall(`/auctions${query}`);
}

export async function getAuctionById(auctionId: string) {
  return apiCall(`/auctions/${auctionId}`);
}

export async function createAuction(auctionData: any) {
  return apiCall('/auctions', 'POST', auctionData);
}

export async function updateAuction(auctionId: string, auctionData: any) {
  return apiCall(`/auctions/${auctionId}`, 'PUT', auctionData);
}

export async function updateAuctionStatus(auctionId: string, status: string) {
  return apiCall(`/auctions/${auctionId}/status`, 'PUT', { status });
}

export async function deleteAuction(auctionId: string) {
  return apiCall(`/auctions/${auctionId}`, 'DELETE');
}

// ========================
// BID MANAGEMENT
// ========================

export async function getAllBids(filters?: { auctionId?: string; teamId?: string; playerId?: string }) {
  let query = '';
  if (filters) {
    const params = new URLSearchParams();
    if (filters.auctionId) params.append('auctionId', filters.auctionId);
    if (filters.teamId) params.append('teamId', filters.teamId);
    if (filters.playerId) params.append('playerId', filters.playerId);
    query = params.toString() ? `?${params.toString()}` : '';
  }
  return apiCall(`/bids${query}`);
}

export async function getBidById(bidId: string) {
  return apiCall(`/bids/${bidId}`);
}

export async function createBid(bidData: any) {
  return apiCall('/bids', 'POST', bidData);
}

export async function getHighestBid(auctionId: string, playerId: string) {
  return apiCall(`/bids/${auctionId}/highest/${playerId}`);
}

export async function getBidHistory(auctionId: string, playerId: string) {
  return apiCall(`/bids/${auctionId}/player/${playerId}/history`);
}

// ========================
// MATCH MANAGEMENT
// ========================

export async function getAllMatches(filters?: { sport?: string; status?: string }) {
  let query = '';
  if (filters) {
    const params = new URLSearchParams();
    if (filters.sport) params.append('sport', filters.sport);
    if (filters.status) params.append('status', filters.status);
    query = params.toString() ? `?${params.toString()}` : '';
  }
  return apiCall(`/matches${query}`);
}

export async function getMatchById(matchId: string) {
  return apiCall(`/matches/${matchId}`);
}

export async function createMatch(matchData: any) {
  return apiCall('/matches', 'POST', matchData);
}

export async function updateMatch(matchId: string, matchData: any) {
  return apiCall(`/matches/${matchId}`, 'PUT', matchData);
}

export async function updateMatchStatus(matchId: string) {
  return apiCall(`/matches/${matchId}/status`, 'PUT');
}

export async function deleteMatch(matchId: string) {
  return apiCall(`/matches/${matchId}`, 'DELETE');
}

// ========================
// AUDIT LOGS
// ========================

export async function getAuditLogs(filters?: { userId?: string; action?: string; limit?: number }) {
  let query = '';
  if (filters) {
    const params = new URLSearchParams();
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.action) params.append('action', filters.action);
    if (filters.limit) params.append('limit', filters.limit.toString());
    query = params.toString() ? `?${params.toString()}` : '';
  }
  return apiCall(`/logs${query}`);
}

export async function createAuditLog(logData: any) {
  return apiCall('/logs', 'POST', logData);
}

// ========================
// BATCH OPERATIONS
// ========================

export async function createAuctionWithPlayers(auctionData: any, playersData: any[]) {
  return apiCall('/batch/auction-with-players', 'POST', {
    auction: auctionData,
    players: playersData,
  });
}

// ========================
// HEALTH & INFO
// ========================

export async function healthCheck() {
  return apiCall('/health');
}

export async function getApiInfo() {
  try {
    const response = await fetch(`${API_ENDPOINT}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to get API info', error);
    return null;
  }
}

// ========================
// LEGACY SUPPORT
// ========================

/**
 * Backward compatibility functions for old storageService API
 * These map old calls to new backend endpoints
 */

export async function loadPlayersFromBackend(sportName: string) {
  return getAllPlayers({ sport: sportName });
}

export async function loadTeamsFromBackend(sportName: string) {
  return getAllTeams();
}

export async function loadMatchesFromBackend(sportName: string) {
  return getAllMatches({ sport: sportName });
}

export async function savePlayersToBackend(sportName: string, players: any) {
  // Batch create players
  const results = await Promise.all(
    players.map((player: any) => createPlayer({ ...player, sport: sportName }))
  );
  return results;
}

export async function saveTeamsToBackend(sportName: string, teams: any) {
  // Batch create teams
  const results = await Promise.all(
    teams.map((team: any) => createTeam(team))
  );
  return results;
}

export async function saveMatchesToBackend(sportName: string, matches: any) {
  // Batch create matches
  const results = await Promise.all(
    matches.map((match: any) => createMatch({ ...match, sport: sportName }))
  );
  return results;
}

export default {
  // Generic HTTP methods
  get,
  post,
  put,
  delete: del,
  
  // State
  getAppState,
  saveAppState,
  
  // Users
  getAllUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  
  // Players
  getAllPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer,
  sellPlayer,
  
  // Teams
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  updateTeamBudget,
  
  // Auctions
  getAllAuctions,
  getAuctionById,
  createAuction,
  updateAuction,
  updateAuctionStatus,
  deleteAuction,
  
  // Bids
  getAllBids,
  getBidById,
  createBid,
  getHighestBid,
  getBidHistory,
  
  // Matches
  getAllMatches,
  getMatchById,
  createMatch,
  updateMatch,
  updateMatchStatus,
  deleteMatch,
  
  // Logs
  getAuditLogs,
  createAuditLog,
  
  // Batch
  createAuctionWithPlayers,
  
  // Health
  healthCheck,
  getApiInfo,
};
