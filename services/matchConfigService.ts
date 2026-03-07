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

/**
 * Match Settings - SINGLE SOURCE OF TRUTH for purse intelligence
 * Computed on backend during match creation
 * Becomes IMMUTABLE after first team registers
 */
export interface MatchSettings {
  pursePerTeam: number;
  maxPlayersPerTeam: number;
  numberOfTeams: number;
  avgPlayerValue: number;
  maxBasePrice: number;
  recommendedMinBase: number;
  isLocked: boolean;
  lockedAt?: string;
  lockedReason?: string;
  createdAt?: string;
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
 * Subscribe to real-time matchSettings updates (Purse Intelligence)
 * These values are computed on backend and become immutable after first team registers
 * FALLBACK: If matchSettings doesn't exist, derive from existing match fields
 */
export const subscribeToMatchSettings = (
  matchId: string,
  onSettingsUpdate: (settings: MatchSettings | null) => void,
  onError?: (error: Error) => void
): (() => void) => {
  try {
    const matchRef = doc(db, 'matches', matchId);
    
    const unsubscribe = onSnapshot(
      matchRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const matchData = docSnapshot.data();
          const settingsData = matchData.matchSettings;
          
          if (settingsData && settingsData.pursePerTeam && settingsData.avgPlayerValue) {
            // Use existing matchSettings from Firestore
            const settings: MatchSettings = {
              pursePerTeam: settingsData.pursePerTeam,
              maxPlayersPerTeam: settingsData.maxPlayersPerTeam || 11,
              numberOfTeams: settingsData.numberOfTeams || 8,
              avgPlayerValue: settingsData.avgPlayerValue,
              maxBasePrice: settingsData.maxBasePrice || 0,
              recommendedMinBase: settingsData.recommendedMinBase || 0,
              isLocked: settingsData.isLocked || false,
              lockedAt: settingsData.lockedAt,
              lockedReason: settingsData.lockedReason,
              createdAt: settingsData.createdAt,
            };
            
            console.log('🔄 Match settings retrieved from Firestore:', settings);
            onSettingsUpdate(settings);
          } else {
            // FALLBACK: Derive matchSettings from existing match fields
            console.log('⚠️ No valid matchSettings found - computing from match fields...');
            console.log('   matchData.baseBudgetPerTeam:', matchData.baseBudgetPerTeam);
            console.log('   matchData.maxPlayersPerTeam:', matchData.maxPlayersPerTeam);
            console.log('   matchData.config:', matchData.config);
            
            const pursePerTeam = matchData.baseBudgetPerTeam || matchData.config?.totalBudget || 10000000;
            const playersPerTeam = matchData.maxPlayersPerTeam || matchData.config?.squadSize?.max || 11;
            const numberOfTeams = matchData.maxTeams || matchData.config?.maxTeams || 8;
            
            console.log('   Computed: pursePerTeam=', pursePerTeam, 'playersPerTeam=', playersPerTeam);
            
            // Compute derived values (same formula as backend)
            const avgPlayerValue = Math.floor(pursePerTeam / playersPerTeam);
            const maxBasePrice = Math.floor(avgPlayerValue * 0.40);
            const recommendedMinBase = Math.floor(avgPlayerValue * 0.05);
            
            console.log('   Derived: avgPlayerValue=', avgPlayerValue, 'maxBasePrice=', maxBasePrice, 'recommendedMinBase=', recommendedMinBase);
            
            const derivedSettings: MatchSettings = {
              pursePerTeam,
              maxPlayersPerTeam: playersPerTeam,
              numberOfTeams,
              avgPlayerValue,
              maxBasePrice,
              recommendedMinBase,
              isLocked: false,
              lockedAt: undefined,
              lockedReason: undefined,
              createdAt: matchData.createdAt,
            };
            
            console.log('✅ Final computed matchSettings:', derivedSettings);
            onSettingsUpdate(derivedSettings);
          }
        }
      },
      (error) => {
        console.error('❌ Error subscribing to match settings:', error);
        if (onError) onError(error);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Failed to subscribe to match settings:', error);
    if (onError) onError(error as Error);
    return () => {};
  }
};

/**
 * Get matchSettings (one-time fetch)
 * FALLBACK: If matchSettings doesn't exist, derive from existing match fields
 */
export const getMatchSettings = async (matchId: string): Promise<MatchSettings | null> => {
  try {
    const matchRef = doc(db, 'matches', matchId);
    const docSnapshot = await getDoc(matchRef);
    
    if (!docSnapshot.exists()) {
      throw new Error('Match not found');
    }
    
    const matchData = docSnapshot.data();
    const settingsData = matchData.matchSettings;
    
    if (settingsData) {
      // Use existing matchSettings from Firestore
      return {
        pursePerTeam: settingsData.pursePerTeam || 10000000,
        maxPlayersPerTeam: settingsData.maxPlayersPerTeam || 11,
        numberOfTeams: settingsData.numberOfTeams || 8,
        avgPlayerValue: settingsData.avgPlayerValue || 0,
        maxBasePrice: settingsData.maxBasePrice || 0,
        recommendedMinBase: settingsData.recommendedMinBase || 0,
        isLocked: settingsData.isLocked || false,
        lockedAt: settingsData.lockedAt,
        lockedReason: settingsData.lockedReason,
        createdAt: settingsData.createdAt,
      };
    }
    
    // FALLBACK: Derive matchSettings from existing match fields
    console.log('⚠️ No matchSettings found - computing from match fields...');
    
    const pursePerTeam = matchData.baseBudgetPerTeam || matchData.config?.totalBudget || 10000000;
    const playersPerTeam = matchData.maxPlayersPerTeam || matchData.config?.squadSize?.max || 11;
    const numberOfTeams = matchData.maxTeams || matchData.config?.maxTeams || 8;
    
    // Compute derived values (same formula as backend)
    const avgPlayerValue = Math.floor(pursePerTeam / playersPerTeam);
    const maxBasePrice = Math.floor(avgPlayerValue * 0.40);
    const recommendedMinBase = Math.floor(avgPlayerValue * 0.05);
    
    return {
      pursePerTeam,
      maxPlayersPerTeam: playersPerTeam,
      numberOfTeams,
      avgPlayerValue,
      maxBasePrice,
      recommendedMinBase,
      isLocked: false,
      lockedAt: undefined,
      lockedReason: undefined,
      createdAt: matchData.createdAt,
    };
  } catch (error) {
    console.error('❌ Error fetching match settings:', error);
    throw error;
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

// ═══════════════════════════════════════════════════════════════════════════════
// BID CONFIG (Multi-Increment Bidding System)
// ═══════════════════════════════════════════════════════════════════════════════

import { BidConfig } from '../types';

/**
 * Default bid increments (in rupees)
 * Used when no bidConfig exists
 */
export const DEFAULT_BID_INCREMENTS = [10000, 25000, 50000, 100000];
export const DEFAULT_CUSTOM_INCREMENT = 0;

/**
 * Get bidConfig from match document
 * Handles migration from legacy bidIncrement field
 */
export const getBidConfig = async (matchId: string): Promise<BidConfig> => {
  try {
    const matchRef = doc(db, 'matches', matchId);
    const docSnapshot = await getDoc(matchRef);
    
    if (!docSnapshot.exists()) {
      throw new Error('Match not found');
    }
    
    const matchData = docSnapshot.data();
    
    // If bidConfig exists, return it
    if (matchData.bidConfig && Array.isArray(matchData.bidConfig.increments)) {
      console.log('📊 Using existing bidConfig:', matchData.bidConfig);
      return matchData.bidConfig as BidConfig;
    }
    
    // MIGRATION: Convert legacy bidIncrement to bidConfig
    const legacyIncrement = matchData.bidIncrement || 
                           matchData.config?.bidIncrement || 
                           matchData.config?.minBidIncrement || 
                           100000;
    
    console.log('🔄 Migrating legacy bidIncrement to bidConfig:', legacyIncrement);
    
    // Return migrated config (increments based on legacy value)
    return {
      increments: [legacyIncrement],
      custom: undefined,
      isLocked: matchData.status === 'ONGOING',
      updatedAt: matchData.updatedAt,
      updatedBy: undefined,
    };
  } catch (error) {
    console.error('❌ Error fetching bidConfig:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time bidConfig updates
 */
export const subscribeToBidConfig = (
  matchId: string,
  onUpdate: (config: BidConfig) => void,
  onError?: (error: Error) => void
): (() => void) => {
  try {
    const matchRef = doc(db, 'matches', matchId);
    
    const unsubscribe = onSnapshot(
      matchRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const matchData = docSnapshot.data();
          
          // If bidConfig exists, use it
          if (matchData.bidConfig && Array.isArray(matchData.bidConfig.increments)) {
            console.log('🔄 BidConfig updated:', matchData.bidConfig);
            onUpdate(matchData.bidConfig as BidConfig);
            return;
          }
          
          // MIGRATION: Convert legacy bidIncrement to bidConfig
          const legacyIncrement = matchData.bidIncrement || 
                                 matchData.config?.bidIncrement || 
                                 matchData.config?.minBidIncrement || 
                                 100000;
          
          const migratedConfig: BidConfig = {
            increments: [legacyIncrement],
            custom: undefined,
            isLocked: matchData.status === 'ONGOING',
            updatedAt: matchData.updatedAt,
            updatedBy: undefined,
          };
          
          console.log('🔄 Using migrated bidConfig from legacy:', migratedConfig);
          onUpdate(migratedConfig);
        }
      },
      (error) => {
        console.error('❌ Error subscribing to bidConfig:', error);
        if (onError) onError(error);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Failed to subscribe to bidConfig:', error);
    if (onError) onError(error as Error);
    return () => {};
  }
};

/**
 * Update bidConfig in Firestore
 * 
 * Rules:
 * - Dashboard: Can update only when status !== 'ONGOING'
 * - Live Room: Can ALWAYS update (recovery mode)
 * 
 * @param fromLiveRoom - If true, bypasses lock check (recovery mode)
 */
export const updateBidConfig = async (
  matchId: string,
  bidConfig: Partial<BidConfig>,
  updatedBy: string,
  fromLiveRoom: boolean = false
): Promise<{ success: boolean; message?: string }> => {
  try {
    const matchRef = doc(db, 'matches', matchId);
    const docSnapshot = await getDoc(matchRef);
    
    if (!docSnapshot.exists()) {
      throw new Error('Match not found');
    }
    
    const matchData = docSnapshot.data();
    const isLocked = matchData.status === 'ONGOING';
    
    // Check lock - only Live Room can update when locked
    if (isLocked && !fromLiveRoom) {
      return {
        success: false,
        message: 'Bid increments are locked. Use Live Room to edit during auction.'
      };
    }
    
    // Validate increments
    if (bidConfig.increments) {
      // Must be positive numbers
      if (!bidConfig.increments.every(v => typeof v === 'number' && v > 0)) {
        return { success: false, message: 'All increments must be positive numbers' };
      }
      
      // Must be in ascending order
      const sorted = [...bidConfig.increments].sort((a, b) => a - b);
      if (JSON.stringify(sorted) !== JSON.stringify(bidConfig.increments)) {
        return { success: false, message: 'Increments must be in ascending order' };
      }
      
      // No duplicates
      if (new Set(bidConfig.increments).size !== bidConfig.increments.length) {
        return { success: false, message: 'Increments must not have duplicates' };
      }
    }
    
    // Validate custom increment
    if (bidConfig.custom !== undefined && bidConfig.custom !== null && bidConfig.custom !== 0) {
      if (typeof bidConfig.custom !== 'number' || bidConfig.custom <= 0) {
        return { success: false, message: 'Custom increment must be a positive number' };
      }
    }
    
    // Build update object
    const existingConfig = matchData.bidConfig || {
      increments: DEFAULT_BID_INCREMENTS,
      custom: DEFAULT_CUSTOM_INCREMENT,
      isLocked: false,
    };
    
    // CRITICAL: Filter out undefined values - Firestore rejects undefined
    // Only include fields that have actual values (or null)
    const sanitizedBidConfig: Partial<BidConfig> = {};
    if (bidConfig.increments !== undefined) {
      sanitizedBidConfig.increments = bidConfig.increments;
    }
    // For custom: only include if it's a positive number, otherwise omit entirely
    if (bidConfig.custom !== undefined && bidConfig.custom !== null && bidConfig.custom > 0) {
      sanitizedBidConfig.custom = bidConfig.custom;
    } else if (bidConfig.custom === null || bidConfig.custom === 0) {
      // Explicitly clearing custom - set to null (Firestore accepts this)
      sanitizedBidConfig.custom = null;
    }
    // If bidConfig.custom is undefined, we simply don't include it (keep existing)
    
    const updatedConfig: BidConfig = {
      ...existingConfig,
      ...sanitizedBidConfig,
      isLocked: isLocked, // Always reflect current auction status
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy,
    };
    
    await updateDoc(matchRef, {
      bidConfig: updatedConfig,
      updatedAt: new Date().toISOString(),
    });
    
    console.log('✅ BidConfig updated:', updatedConfig);
    return { success: true, message: 'Bid increments saved successfully' };
  } catch (error) {
    console.error('❌ Error updating bidConfig:', error);
    return { success: false, message: String(error) };
  }
};

/**
 * Lock bidConfig when auction starts
 * Called when status changes to ONGOING
 */
export const lockBidConfig = async (matchId: string): Promise<void> => {
  try {
    const matchRef = doc(db, 'matches', matchId);
    
    await updateDoc(matchRef, {
      'bidConfig.isLocked': true,
      'bidConfig.updatedAt': new Date().toISOString(),
    });
    
    console.log('🔒 BidConfig locked for match:', matchId);
  } catch (error) {
    console.error('❌ Error locking bidConfig:', error);
    // Non-blocking - don't throw
  }
};

/**
 * Convert bid increments to display labels
 */
export const formatBidIncrementLabel = (amount: number): string => {
  if (amount >= 10000000) return `+${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `+${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 1)}L`;
  if (amount >= 1000) return `+${(amount / 1000).toFixed(0)}K`;
  return `+₹${amount}`;
};

/**
 * Generate bid button configs from bidConfig
 */
export const generateBidButtons = (bidConfig: BidConfig | null): Array<{ amount: number; label: string }> => {
  if (!bidConfig || !bidConfig.increments || bidConfig.increments.length === 0) {
    // Default fallback
    return DEFAULT_BID_INCREMENTS.map(amount => ({
      amount,
      label: formatBidIncrementLabel(amount),
    }));
  }
  
  const buttons = bidConfig.increments.map(amount => ({
    amount,
    label: formatBidIncrementLabel(amount),
  }));
  
  // Add custom increment if present and valid
  if (bidConfig.custom && bidConfig.custom > 0) {
    buttons.push({
      amount: bidConfig.custom,
      label: formatBidIncrementLabel(bidConfig.custom) + ' ★',
    });
    // Sort by amount to maintain order
    buttons.sort((a, b) => a.amount - b.amount);
  }
  
  return buttons;
};

// ========================
// CURRENCY UNIT CONFIG
// ========================

import type { CurrencyUnit } from '../types';

/** Default currency unit when not configured */
export const DEFAULT_CURRENCY_UNIT: CurrencyUnit = 'L';

/**
 * Subscribe to real-time currencyUnit updates
 */
export const subscribeToCurrencyUnit = (
  matchId: string,
  onUpdate: (unit: CurrencyUnit) => void,
  onError?: (error: Error) => void
): (() => void) => {
  try {
    const matchRef = doc(db, 'matches', matchId);
    
    const unsubscribe = onSnapshot(
      matchRef,
      (docSnapshot) => {
        if (!docSnapshot.exists()) {
          console.warn('⚠️ Match not found for currencyUnit subscription');
          onUpdate(DEFAULT_CURRENCY_UNIT);
          return;
        }
        
        const matchData = docSnapshot.data();
        const unit = matchData.currencyUnit as CurrencyUnit || DEFAULT_CURRENCY_UNIT;
        console.log('💱 CurrencyUnit update:', unit);
        onUpdate(unit);
      },
      (error) => {
        console.error('❌ Error subscribing to currencyUnit:', error);
        if (onError) onError(error);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Failed to subscribe to currencyUnit:', error);
    if (onError) onError(error as Error);
    return () => {};
  }
};

/**
 * Update currencyUnit in Firestore
 * Can be changed anytime by auctioneer
 */
export const updateCurrencyUnit = async (
  matchId: string,
  unit: CurrencyUnit,
  updatedBy: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    if (!['K', 'L', 'Cr'].includes(unit)) {
      return { success: false, message: 'Invalid currency unit. Must be K, L, or Cr.' };
    }
    
    const matchRef = doc(db, 'matches', matchId);
    
    await updateDoc(matchRef, {
      currencyUnit: unit,
      updatedAt: new Date().toISOString(),
    });
    
    console.log('✅ CurrencyUnit updated to:', unit);
    return { success: true, message: `Currency unit changed to ${unit}` };
  } catch (error) {
    console.error('❌ Error updating currencyUnit:', error);
    return { success: false, message: String(error) };
  }
};
