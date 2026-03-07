/**
 * Match Data Service
 * Fetches and caches match configuration including purse per team
 * Single source of truth for budget calculations
 */

import { firestore } from './firebaseConfig';
import { doc, getDoc, DocumentData } from 'firebase/firestore';

interface MatchSettings {
  pursePerTeam?: number;
  baseBudgetPerTeam?: number;
  maxPlayersPerTeam?: number;
  [key: string]: any;
}

interface MatchData {
  id: string;
  name: string;
  matchSettings?: MatchSettings;
  baseBudgetPerTeam?: number;
  [key: string]: any;
}

// Cache for match data to avoid repeated fetches
const matchDataCache = new Map<string, { data: MatchData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch match data from Firestore
 * Uses caching to minimize database calls
 */
export async function fetchMatchData(matchId: string): Promise<MatchData | null> {
  if (!matchId) return null;

  try {
    // Check cache first
    const cached = matchDataCache.get(matchId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // Fetch from Firestore
    const matchRef = doc(firestore, 'matches', matchId);
    const matchSnap = await getDoc(matchRef);

    if (!matchSnap.exists()) {
      console.warn(`Match not found: ${matchId}`);
      return null;
    }

    const data = matchSnap.data() as MatchData;
    data.id = matchSnap.id;

    // Update cache
    matchDataCache.set(matchId, { data, timestamp: Date.now() });

    return data;
  } catch (error) {
    console.error('Error fetching match data:', error);
    return null;
  }
}

/**
 * Get purse per team from match settings
 * @param matchData The match document data
 * @returns Purse amount in rupees
 */
export function getPursePerTeam(matchData: MatchData | null): number {
  if (!matchData) return 0; // No fallback - must come from backend
  
  return (
    matchData.matchSettings?.pursePerTeam ||
    matchData.baseBudgetPerTeam ||
    0 // No fallback - must come from backend
  );
}

/**
 * Calculate remaining budget for a team
 * @param basePurse The purse per team from match settings
 * @param totalSpent Total amount spent by the team
 * @returns Remaining budget
 */
export function calculateRemainingBudget(basePurse: number, totalSpent: number): number {
  return Math.max(0, basePurse - totalSpent);
}

/**
 * Calculate budget utilization percentage
 */
export function calculateBudgetPercentage(basePurse: number, totalSpent: number): number {
  if (basePurse <= 0) return 0;
  return Math.round((totalSpent / basePurse) * 100);
}

/**
 * Clear cache for a specific match or entire cache
 */
export function clearMatchDataCache(matchId?: string): void {
  if (matchId) {
    matchDataCache.delete(matchId);
  } else {
    matchDataCache.clear();
  }
}

/**
 * Prefetch match data to avoid flicker
 */
export async function prefetchMatchData(matchId: string): Promise<void> {
  await fetchMatchData(matchId);
}
