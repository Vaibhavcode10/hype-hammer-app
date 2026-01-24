
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
  ADMIN = 'ADMIN',
  AUCTIONEER = 'AUCTIONEER',
  TEAM_REP = 'TEAM_REP',
  PLAYER = 'PLAYER',
  GUEST = 'GUEST'
}

export interface UserRegistration {
  id?: string;
  email: string;
  password?: string;
  name: string;
  role?: UserRole;
  avatar?: string;
  isOAuthUser?: boolean; // OAuth login flag
  profileComplete?: boolean; // Whether role-specific details are filled
  
  // Common fields
  phone?: string;
  profilePhoto?: string;
  username?: string;
  
  // Admin specific
  adminId?: string;
  organizationName?: string;
  designation?: string; // Admin / Super Admin
  adminAuthCode?: string;
  governmentId?: string;
  adminApprovalStatus?: 'pending' | 'approved' | 'rejected';
  twoFactorEnabled?: boolean;
  lastLogin?: number;
  permissions?: string[];
  
  // Auctioneer specific
  auctioneerId?: string;
  auctioneerLicense?: string;
  experience?: string; // Years of experience
  languagesKnown?: string[];
  previousAuctions?: string;
  auctioneerGovtId?: string;
  approvedByAdmin?: boolean;
  assignedAuctionEvent?: string;
  
  // Team Rep specific
  teamId?: string;
  teamName?: string;
  teamShortCode?: string;
  teamLogo?: string; // MANDATORY for teams
  homeCity?: string;
  repFullName?: string;
  repEmail?: string;
  repMobile?: string;
  repPhoto?: string;
  repRole?: string; // Owner / Manager / Captain
  totalBudget?: number;
  remainingPurse?: number;
  maxSquadSize?: number;
  authorizationLetter?: string; // PDF
  teamApprovalStatus?: 'pending' | 'approved' | 'rejected';
  
  // Player specific
  playerId?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  playerPhoto?: string; // MANDATORY for players
  contactEmail?: string;
  contactMobile?: string;
  city?: string;
  state?: string;
  sport?: SportType;
  playerRole?: string; // Playing role
  battingStyle?: string;
  bowlingStyle?: string;
  experienceLevel?: string;
  previousTeams?: string;
  basePrice?: number;
  playerCategory?: string;
  availabilityStatus?: string;
  sportsId?: string; // Govt ID / Sports ID
  consentGiven?: boolean;
  playerApprovalStatus?: 'pending' | 'approved' | 'rejected';
  
  // Guest specific
  guestOrganization?: string;
  guestType?: string;
  favoriteTeam?: string;
  notificationsEnabled?: boolean;
  
  createdAt?: number;
}

export enum AuctionType {
  OPEN = 'Open Auction',
  CLOSED = 'Closed Auction',
  SILENT = 'Silent Auction'
}

export enum AuctionStatus {
  HOME = 'HOME',
  MARKETPLACE = 'MARKETPLACE',
  AUTH = 'AUTH',
  ADMIN_REGISTRATION = 'ADMIN_REGISTRATION',
  ROLE_SELECTION = 'ROLE_SELECTION',
  ROLE_REGISTRATION = 'ROLE_REGISTRATION',
  PROFILE_COMPLETION = 'PROFILE_COMPLETION',
  HOW_IT_WORKS = 'HOW_IT_WORKS',
  SETUP = 'SETUP',
  MATCHES = 'MATCHES',
  SETTINGS = 'SETTINGS',
  PLAYER_DASHBOARD = 'PLAYER_DASHBOARD',
  PLAYER_REGISTRATION = 'PLAYER_REGISTRATION',
  READY = 'READY',
  LIVE = 'LIVE',
  PAUSED = 'PAUSED',
  ENDED = 'ENDED',
  // Role-based Dashboards
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  AUCTIONEER_DASHBOARD = 'AUCTIONEER_DASHBOARD',
  TEAM_REP_DASHBOARD = 'TEAM_REP_DASHBOARD',
  GUEST_DASHBOARD = 'GUEST_DASHBOARD'
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
  email?: string; // For matching with user
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
  // Organizer credentials (for authentication)
  organizerEmail?: string;
  organizerPassword?: string;
  organizerName?: string;
  organizationType?: string;
  organizationName?: string;
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

// ========================
// LIVE AUCTION ROOM TYPES
// ========================

export enum LiveAuctionStatus {
  READY = 'READY',
  LIVE = 'LIVE',
  PAUSED = 'PAUSED',
  ENDED = 'ENDED'
}

export interface BidHistoryItem {
  teamId: string;
  teamName: string;
  amount: number;
  timestamp: string;
}

export interface LiveAuctionState {
  id: string;
  seasonId: string;
  status: LiveAuctionStatus;
  startTime: string;
  endTime: string;
  currentPlayerId: string | null;
  currentPlayerName: string | null;
  currentBid: number;
  leadingTeamId: string | null;
  leadingTeamName: string | null;
  biddingActive: boolean;
  playerQueue: string[];
  completedPlayers: string[];
  bidHistory: BidHistoryItem[];
  bidStartTime?: string;
  lastBidTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BidIncrement {
  label: string;
  value: number;
}

export interface AuctioneerControls {
  canStartBidding: boolean;
  canCloseBidding: boolean;
  canPauseAuction: boolean;
  canResumeAuction: boolean;
  hasMicAccess: boolean;
}

export interface AdminControls {
  canStartAuction: boolean;
  canPauseAuction: boolean;
  canEndAuction: boolean;
  canOverride: boolean;
  canAdjustSettings: boolean;
}

export interface TeamControls {
  canBid: boolean;
  remainingBudget: number;
  squadSize: number;
  maxSquadSize: number;
}

export interface LiveRoomPermissions {
  role: UserRole;
  canBid: boolean;
  canSpeak: boolean;
  canControl: boolean;
  canOverride: boolean;
  canViewAll: boolean;
}
