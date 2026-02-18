/**
 * Purse Intelligence Service
 * Calculates real-time budget insights and provides safe bid warnings
 * 
 * IMPORTANT: Does NOT block or modify auction flow - only provides warnings
 */

import { Team, Player } from '../types';
import { MatchConfig } from './matchConfigService';

export interface TeamPurseInsights {
  teamId: string;
  teamName: string;
  // Core budget values
  totalPurse: number;
  totalSpent: number;
  remainingBudget: number;
  // Squad metrics
  squadSizeRequired: number;
  playersBought: number;
  playersLeft: number;
  // Calculated limits
  minimumRequiredAmount: number;
  safeMaxBid: number;
  // Warning state
  isOverBudgetRisk: boolean;
  warningMessage: string | null;
}

export interface BidValidationResult {
  isValid: boolean; // Always true - we don't block bids
  isSafe: boolean;
  warningMessage: string | null;
  safeMaxBid: number;
  remainingBudget: number;
  playersLeft: number;
}

/**
 * Calculate purse insights for a single team
 * 
 * @param team - The team to calculate insights for
 * @param allPlayers - All players in the auction (to count sold players)
 * @param config - Match configuration with budget and squad requirements
 * @returns TeamPurseInsights object with real-time budget analytics
 */
export const calculateTeamPurseInsights = (
  team: Team,
  allPlayers: Player[],
  config: MatchConfig | null
): TeamPurseInsights => {
  // Defensive check - ensure allPlayers is an array
  const playersList = Array.isArray(allPlayers) ? allPlayers : [];
  
  // Get configuration values (with fallbacks)
  const totalPurse = config?.baseTeamBudget ?? team.budget ?? team.remainingBudget ?? 10000000;
  const squadSizeRequired = config?.minSquad ?? 11;
  const basePrice = config?.bidIncrement ?? 100000; // Use bid increment as base price proxy
  
  // Calculate players bought by this team
  const boughtPlayers = playersList.filter(p => 
    p.status === 'SOLD' && 
    (p.soldTo === team.id || p.leadingTeamId === team.id || p.teamId === team.id)
  );
  const playersBought = boughtPlayers.length;
  
  // Calculate total spent
  const totalSpent = boughtPlayers.reduce((sum, p) => sum + (p.soldPrice || p.soldAmount || p.finalPrice || 0), 0);
  
  // Calculate remaining values
  const remainingBudget = Math.max(0, totalPurse - totalSpent);
  const playersLeft = Math.max(0, squadSizeRequired - playersBought);
  
  // Minimum amount required to complete squad (playersLeft × basePrice)
  const minimumRequiredAmount = playersLeft * basePrice;
  
  // Safe max bid = remainingBudget - ((playersLeft - 1) × basePrice)
  // This ensures team can still afford minimum base price for remaining players
  const playersAfterCurrentBid = Math.max(0, playersLeft - 1);
  const safeMaxBid = Math.max(0, remainingBudget - (playersAfterCurrentBid * basePrice));
  
  // Determine if team is at risk
  const isOverBudgetRisk = remainingBudget < minimumRequiredAmount;
  
  // Generate warning message if applicable
  let warningMessage: string | null = null;
  if (isOverBudgetRisk) {
    warningMessage = `${team.name} needs ₹${formatCurrencyShort(minimumRequiredAmount)} minimum to complete ${playersLeft} more player(s). Budget at risk!`;
  }
  
  return {
    teamId: team.id,
    teamName: team.name,
    totalPurse,
    totalSpent,
    remainingBudget,
    squadSizeRequired,
    playersBought,
    playersLeft,
    minimumRequiredAmount,
    safeMaxBid,
    isOverBudgetRisk,
    warningMessage
  };
};

/**
 * Validate a bid against team's purse capacity
 * 
 * IMPORTANT: This NEVER blocks bids - only generates warnings
 * 
 * @param team - Team data
 * @param allPlayers - All players in auction
 * @param config - Match configuration
 * @param bidAmount - The proposed bid amount (total, not increment)
 * @returns BidValidationResult with warning info (always allows bid)
 */
export const validateBidAgainstPurse = (
  team: Team,
  allPlayers: Player[],
  config: MatchConfig | null,
  bidAmount: number
): BidValidationResult => {
  // Defensive check - ensure allPlayers is an array
  const playersList = Array.isArray(allPlayers) ? allPlayers : [];
  
  const insights = calculateTeamPurseInsights(team, playersList, config);
  
  const isSafe = bidAmount <= insights.safeMaxBid;
  
  let warningMessage: string | null = null;
  if (!isSafe && insights.playersLeft > 1) {
    const basePrice = config?.bidIncrement ?? 100000;
    const requiredForRemaining = (insights.playersLeft - 1) * basePrice;
    
    warningMessage = `⚠️ WARNING: This team needs ₹${formatCurrencyShort(requiredForRemaining)} to complete the remaining ${insights.playersLeft - 1} player(s).\n` +
      `Maximum safe bid allowed is ₹${formatCurrencyShort(insights.safeMaxBid)}.`;
  }
  
  return {
    isValid: true, // Never block bids
    isSafe,
    warningMessage,
    safeMaxBid: insights.safeMaxBid,
    remainingBudget: insights.remainingBudget,
    playersLeft: insights.playersLeft
  };
};

/**
 * Calculate purse insights for all teams
 * 
 * @param teams - All teams in the auction
 * @param allPlayers - All players in the auction
 * @param config - Match configuration
 * @returns Map of team ID to TeamPurseInsights
 */
export const calculateAllTeamInsights = (
  teams: Team[],
  allPlayers: Player[],
  config: MatchConfig | null
): Map<string, TeamPurseInsights> => {
  const insightsMap = new Map<string, TeamPurseInsights>();
  
  teams.forEach(team => {
    insightsMap.set(team.id, calculateTeamPurseInsights(team, allPlayers, config));
  });
  
  return insightsMap;
};

/**
 * Format currency in short form (L for Lakhs, Cr for Crores)
 */
export const formatCurrencyShort = (amount: number): string => {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
  return amount.toLocaleString();
};

/**
 * Get warning level based on budget status
 * Returns: 'safe' | 'warning' | 'critical'
 */
export const getWarningLevel = (insights: TeamPurseInsights): 'safe' | 'warning' | 'critical' => {
  if (insights.isOverBudgetRisk) return 'critical';
  
  // Warning if safe max bid is less than 50% of remaining budget
  const utilizationThreshold = insights.remainingBudget * 0.5;
  if (insights.safeMaxBid < utilizationThreshold && insights.playersLeft > 2) {
    return 'warning';
  }
  
  return 'safe';
};
