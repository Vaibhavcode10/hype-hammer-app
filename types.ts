
export enum SportType {
  CRICKET = 'Cricket',
  KABADDI = 'Kabaddi',
  FOOTBALL = 'Football',
  VOLLEYBALL = 'Volleyball',
  HOCKEY = 'Hockey',
  BADMINTON = 'Badminton',
  TABLE_TENNIS = 'Table Tennis',
  WRESTLING = 'Wrestling',
  ESPORTS = 'Esports',
  CUSTOM = 'Custom'
}

export enum UserRole {
  AUCTIONEER = 'AUCTIONEER',
  PLAYER = 'PLAYER',
  ADMIN = 'ADMIN'
}

export enum AuctionType {
  OPEN = 'Open Auction',
  CLOSED = 'Closed Auction',
  SILENT = 'Silent Auction'
}

export enum AuctionStatus {
  HOME = 'HOME',
  AUTH = 'AUTH',
  HOW_IT_WORKS = 'HOW_IT_WORKS',
  SETUP = 'SETUP',
  MATCHES = 'MATCHES',
  SETTINGS = 'SETTINGS',
  PLAYER_DASHBOARD = 'PLAYER_DASHBOARD',
  PLAYER_REGISTRATION = 'PLAYER_REGISTRATION',
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

// Multi-match data structures
export interface MatchData {
  id: string;
  name: string;
  createdAt: number;
  matchDate?: number; // Scheduled match date
  place?: string; // Tournament location
  config: AuctionConfig;
  players: Player[];
  teams: Team[];
  history: Bid[];
  status: 'SETUP' | 'ONGOING' | 'COMPLETED';
}

export interface SportData {
  sportType: SportType;
  customSportName?: string;
  matches: MatchData[];
}

export interface AppState {
  sports: SportData[];
  currentSport: string | null; // sport identifier (SportType or custom name)
  currentMatchId: string | null;
}
