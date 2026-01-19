
import { SportType, PlayerRole, AuctionConfig, AuctionType } from './types';

export const SPORT_DEFAULTS: Record<SportType, Partial<AuctionConfig>> = {
  [SportType.CRICKET]: {
    squadSize: { min: 18, max: 25 },
    totalBudget: 100000000, // 100 Crore
    roles: [
      { id: 'bat', name: 'Batsman' },
      { id: 'bowl', name: 'Bowler' },
      { id: 'ar', name: 'All-Rounder' },
      { id: 'wk', name: 'Wicket-Keeper' }
    ],
    rules: { overseasLimit: 8 }
  },
  [SportType.KABADDI]: {
    squadSize: { min: 15, max: 20 },
    totalBudget: 50000000,
    roles: [
      { id: 'raider', name: 'Raider' },
      { id: 'defender', name: 'Defender' },
      { id: 'ar', name: 'All-Rounder' }
    ]
  },
  [SportType.FOOTBALL]: {
    squadSize: { min: 20, max: 30 },
    totalBudget: 80000000,
    roles: [
      { id: 'fwd', name: 'Forward' },
      { id: 'mid', name: 'Midfielder' },
      { id: 'def', name: 'Defender' },
      { id: 'gk', name: 'Goalkeeper' }
    ]
  },
  [SportType.ESPORTS]: {
    squadSize: { min: 5, max: 8 },
    totalBudget: 1000000,
    roles: [
      { id: 'igl', name: 'IGL' },
      { id: 'fragger', name: 'Entry Fragger' },
      { id: 'support', name: 'Support' },
      { id: 'sniper', name: 'Sniper' }
    ]
  },
  [SportType.CUSTOM]: {
    squadSize: { min: 1, max: 100 },
    totalBudget: 1000000,
    roles: [{ id: 'player', name: 'Player' }]
  }
};

export const INITIAL_CONFIG: AuctionConfig = {
  sport: SportType.CRICKET,
  type: AuctionType.OPEN,
  level: 'Professional',
  squadSize: { min: 18, max: 25 },
  totalBudget: 100000000,
  roles: SPORT_DEFAULTS[SportType.CRICKET].roles || [],
  rules: { overseasLimit: 8 }
};
