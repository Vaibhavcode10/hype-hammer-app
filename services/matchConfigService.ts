/**
 * Match Configuration Service
 * Handles real-time Firebase sync for match configuration
 */

import { getFirestore, doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { app } from './firebaseConfig';

const db = getFirestore(app);

export interface MatchConfig {
  baseTeamBudget: number;
  bidIncrement: number;
  maxTeams: number;
  minSquad: number;
  maxSquad: number;
}

export interface ValidationResult {
  valid: boolean;
  registeredTeams: number;
  maxTeams: number;
  teamsExceeded: boolean;
  squadViolations: Array<{
    teamId: string;
    teamName: string;
    squadSize: number;
    issue: string;
  }>;
  warnings: string[];
  errors: string[];
  config: {
    maxTeams: number;
    minSquad: number;
    maxSquad: number;
  };
}

/**
 * Subscribe to real-time match config updates
 */
export const subscribeToMatchConfig = (
  matchId: string,
  onConfigUpdate: (config: MatchConfig) => void,
  onError?: (error: Error) => void
): (() => void) => {
  try {
    const matchRef = doc(db, 'matches', matchId);
    
    const unsubscribe = onSnapshot(
      matchRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const matchData = docSnapshot.data();
          const configData = matchData.config || {};
          
          // Extract config with fallbacks
          const config: MatchConfig = {
            baseTeamBudget: configData.baseTeamBudget || matchData.baseBudgetPerTeam || configData.totalBudget || 10000000,
            bidIncrement: configData.bidIncrement || configData.minBidIncrement || 100000,
            maxTeams: configData.maxTeams || matchData.maxTeams || 8,
            minSquad: configData.minSquad || (configData.squadSize?.min) || 11,
            maxSquad: configData.maxSquad || (configData.squadSize?.max) || matchData.maxPlayersPerTeam || 25,
          };
          
          console.log('🔄 Match config updated:', config);
          onConfigUpdate(config);
        }
      },
      (error) => {
        console.error('❌ Error subscribing to match config:', error);
        if (onError) onError(error);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Failed to subscribe to match config:', error);
    if (onError) onError(error as Error);
    return () => {};
  }
};

/**
 * Get match config (one-time fetch)
 */
export const getMatchConfig = async (matchId: string): Promise<MatchConfig> => {
  try {
    const matchRef = doc(db, 'matches', matchId);
    const docSnapshot = await getDoc(matchRef);
    
    if (!docSnapshot.exists()) {
      throw new Error('Match not found');
    }
    
    const matchData = docSnapshot.data();
    const configData = matchData.config || {};
    
    return {
      baseTeamBudget: configData.baseTeamBudget || matchData.baseBudgetPerTeam || configData.totalBudget || 10000000,
      bidIncrement: configData.bidIncrement || configData.minBidIncrement || 100000,
      maxTeams: configData.maxTeams || matchData.maxTeams || 8,
      minSquad: configData.minSquad || (configData.squadSize?.min) || 11,
      maxSquad: configData.maxSquad || (configData.squadSize?.max) || matchData.maxPlayersPerTeam || 25,
    };
  } catch (error) {
    console.error('❌ Error fetching match config:', error);
    throw error;
  }
};

/**
 * Update match config via backend API
 */
export const updateMatchConfig = async (
  matchId: string,
  config: Partial<MatchConfig>
): Promise<{ success: boolean; message?: string }> => {
  try {
    console.log('📤 Updating match config:', config);
    
    const response = await fetch(
      `https://us-central1-hypehammer-2025.cloudfunctions.net/auction/matches/${matchId}/config`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      }
    );
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update config');
    }
    
    console.log('✅ Match config updated successfully');
    return { success: true, message: result.message };
  } catch (error) {
    console.error('❌ Error updating match config:', error);
    throw error;
  }
};

/**
 * Direct Firestore update (fallback if API is unavailable)
 * Note: Prefer using updateMatchConfig API for backend validation
 */
export const updateMatchConfigDirect = async (
  matchId: string,
  config: Partial<MatchConfig>
): Promise<void> => {
  try {
    const matchRef = doc(db, 'matches', matchId);
    
    // Build update object with both config and top-level fields
    const updateData: any = {};
    
    if (config.baseTeamBudget !== undefined) {
      updateData['config.baseTeamBudget'] = config.baseTeamBudget;
      updateData['config.totalBudget'] = config.baseTeamBudget;
      updateData['baseBudgetPerTeam'] = config.baseTeamBudget;
    }
    
    if (config.bidIncrement !== undefined) {
      updateData['config.bidIncrement'] = config.bidIncrement;
      updateData['config.minBidIncrement'] = config.bidIncrement;
    }
    
    if (config.maxTeams !== undefined) {
      updateData['config.maxTeams'] = config.maxTeams;
      updateData['maxTeams'] = config.maxTeams;
    }
    
    if (config.minSquad !== undefined) {
      updateData['config.minSquad'] = config.minSquad;
      updateData['config.squadSize.min'] = config.minSquad;
    }
    
    if (config.maxSquad !== undefined) {
      updateData['config.maxSquad'] = config.maxSquad;
      updateData['config.squadSize.max'] = config.maxSquad;
      updateData['maxPlayersPerTeam'] = config.maxSquad;
    }
    
    updateData.updatedAt = new Date().toISOString();
    
    await updateDoc(matchRef, updateData);
    console.log('✅ Match config updated directly in Firestore');
  } catch (error) {
    console.error('❌ Error updating match config directly:', error);
    throw error;
  }
};

/**
 * Validate match configuration
 */
export const validateMatchConfig = async (matchId: string): Promise<ValidationResult> => {
  try {
    const response = await fetch(
      `https://us-central1-hypehammer-2025.cloudfunctions.net/auction/matches/${matchId}/validate`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to validate config');
    }
    
    return result.data;
  } catch (error) {
    console.error('❌ Error validating match config:', error);
    throw error;
  }
};
