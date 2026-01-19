
export enum SportType {
  CRICKET = 'Cricket',
  KABADDI = 'Kabaddi',
  FOOTBALL = 'Football',
  ESPORTS = 'Esports',
  CUSTOM = 'Custom'
}

export enum AuctionType {
  OPEN = 'Open Auction',
  CLOSED = 'Closed Auction',
  SILENT = 'Silent Auction'
}

export enum AuctionStatus {
  SETUP = 'SETUP',
  READY = 'READY',
  LIVE = 'LIVE',
  PAUSED = 'PAUSED',
  ENDED = 'ENDED'
}

export interface PlayerRole {
  id: string;
  name: string;
}

export interface AuctionConfig {
  sport: SportType;
  customSportName?: string;
  type: AuctionType;
  level: string;
  squadSize: {
    min: number;
    max: number;
  };
  totalBudget: number;
  roles: PlayerRole[];
  rules: {
    overseasLimit?: number;
    roleLimits?: Record<string, { min: number; max: number }>;
  };
}

export interface Player {
  id: string;
  name: string;
  roleId: string;
  basePrice: number;
  isOverseas: boolean;
  status: 'UNSOLD' | 'SOLD' | 'PENDING';
  teamId?: string;
  soldPrice?: number;
  imageUrl?: string;
  // Real-world extensions
  age?: number;
  nationality?: string;
  bio?: string;
  stats?: string; // High-level stats summary
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  budget: number;
  remainingBudget: number;
  players: string[]; // Player IDs
  // Real-world extensions
  owner?: string;
  homeCity?: string;
  foundationYear?: number;
}

export interface Bid {
  id: string;
  playerId: string;
  teamId: string;
  amount: number;
  timestamp: number;
}
