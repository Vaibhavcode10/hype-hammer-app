
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
  AUCTIONEER_PENDING_APPROVAL = 'AUCTIONEER_PENDING_APPROVAL',
  TEAM_REP_DASHBOARD = 'TEAM_REP_DASHBOARD',
  GUEST_DASHBOARD = 'GUEST_DASHBOARD'
}

export interface PlayerRole {
  id: string;
  name: string;
}

export interface AuctionConfig {
  duration: number;
  maxTeams: number;
  sport: SportType;
  customSportName?: string;
  type: AuctionType;
  level: string;
  squadSize: {
    min: number;
    max: number;
  };
  totalBudget: number;
  minBidIncrement?: number; // Minimum bid increment
  roles: PlayerRole[];
  rules: {
    overseasLimit?: number;
    roleLimits?: Record<string, { min: number; max: number }>;
  };
}

// Approval status for moderation system
export type ApprovalStatus = 'pending' | 'accepted' | 'declined';

export interface Player {
  id: string;
  name: string;
  roleId: string;
  basePrice: number;
  isOverseas: boolean;
  status: 'UNSOLD' | 'SOLD' | 'PENDING' | 'AVAILABLE';
  approvalStatus?: ApprovalStatus; // Moderation status: pending | accepted | declined
  teamId?: string;
  soldPrice?: number;
  soldAmount?: number; // Backend field for sold price
  soldTo?: string; // Backend field for team ID
  soldAt?: string; // Backend field for sold timestamp
  leadingTeamId?: string; // Leading team ID during/after bidding
  finalPrice?: number; // Alternative price field
  currentBid?: number; // Current bid amount
  teamName?: string; // Team name if available
  imageUrl?: string;
  email?: string; // For matching with user
  role?: string; // Alternative field for roleId
  unsoldCount?: number; // Number of times marked as unsold
  // Real-world extensions
  age?: number;
  nationality?: string;
  bio?: string;
  stats?: string; // High-level stats summary
  gender?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  experienceLevel?: string;
  playerCategory?: string;
  previousTeams?: string;
  // Government ID fields
  governmentId?: string;
  governmentIdURL?: string;
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  budget: number;
  remainingBudget: number;
  players: string[]; // Player IDs
  playerIds?: string[]; // Backend field for player IDs
  squadSize?: number; // Calculated field for display
  maxSquadSize?: number; // Maximum squad size (capacity)
  approvalStatus?: ApprovalStatus; // Moderation status: pending | accepted | declined
  // Real-world extensions
  owner?: string;
  homeCity?: string;
  foundationYear?: number;
  repName?: string; // Team representative name
  initialBudget?: number; // Alternative budget field name
  // Government ID fields
  governmentId?: string;
  governmentIdURL?: string;
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
  
  // Additional organizer details from registration form
  organizerPhone?: string;
  designation?: 'Organizer' | 'Coordinator' | 'Owner' | '';
  profilePhotoURL?: string;
  adminEmail?: string;
  
  // Season configuration details
  seasonName?: string;
  sportType?: SportType | '';
  auctionDateTime?: string;
  venueMode?: 'Physical' | 'Online' | 'Hybrid' | '';
  venueLocation?: string;
  
  // Auction configuration
  maxTeams?: number;
  maxPlayersPerTeam?: number;
  baseBudgetPerTeam?: number;
  
  // Document URLs
  governmentId?: string;
  governmentIdURL?: string;
  organizerProofURL?: string;
  
  // ─── MATCH SETTINGS (Purse Intelligence) ───────────────────────────────
  // Computed on backend during match creation
  // Becomes IMMUTABLE after first team registers
  matchSettings?: {
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
  };
  
  // ─── BID CONFIG (Multi-Increment Bidding) ───────────────────────────────
  // Configurable before auction starts, locked when ONGOING
  // Can be edited from Live Room (recovery mode) even when locked
  bidConfig?: BidConfig;
  
  // ─── CURRENCY DISPLAY CONFIG ───────────────────────────────────────────
  // Display format for monetary values (K, L, Cr)
  // Changeable anytime - affects UI only, not stored values
  currencyUnit?: CurrencyUnit;
  
  // Legacy field - for backward compatibility with old matches
  bidIncrement?: number;
  
  // System tracking
  updatedAt?: string;
  statusUpdatedAt?: string;
  statusUpdatedBy?: string;
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
  unsoldPlayers?: string[]; // Players marked as unsold
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

/**
 * BidConfig - Per-match configurable bid increments
 * Stored in match document, locked when auction starts
 */
export interface BidConfig {
  increments: number[];     // 4 predefined bid increment amounts (in paise/cents)
  custom?: number | null;   // Optional custom increment amount (null when not set)
  isLocked: boolean;        // True when auction is ONGOING (editable from Live Room)
  updatedAt?: string;       // Last modification timestamp
  updatedBy?: string;       // User ID who last updated
}

/**
 * CurrencyUnit - Display format for monetary values
 * Stored in match document, changeable anytime by auctioneer
 * Affects display only - raw values always stored in DB
 */
export type CurrencyUnit = 'K' | 'L' | 'Cr';

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

// ========================
// BACKUP & RESTORE TYPES
// ========================

export type BackupType = 'full' | 'quick' | 'auto';
export type BackupStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

export type AutoBackupInterval = 'hourly' | 'six_hours' | 'daily' | 'disabled';

export interface BackupMetadata {
  id: string;
  matchId: string;
  matchName: string;
  fileName: string;
  type: BackupType;
  size: number; // in bytes
  createdBy: string;
  createdByEmail: string;
  createdByRole: UserRole;
  createdAt: string;
  status: BackupStatus;
  downloadURL?: string;
  errorMessage?: string;
  schemaVersion: string;
  
  // Counts for preview
  playersCount: number;
  teamsCount: number;
  auctionsCount: number;
  bidsCount: number;
  usersCount: number;
  storageFilesCount: number;
  
  // Auto backup specific
  autoBackupInterval?: AutoBackupInterval;
  nextAutoBackupAt?: string;
}

export interface BackupData {
  schemaVersion: string;
  createdAt: string;
  matchId: string;
  matchName: string;
  backupType: BackupType;
  
  // Database collections
  database: {
    players: Player[];
    teams: Team[];
    auctions: any[];
    bids: Bid[];
    users: any[];
    settings: any;
    matchConfig: MatchData | null;
    liveRoomState: LiveAuctionState | null;
    purseData: any[];
    soldHistory: any[];
    unsoldHistory: any[];
  };
  
  // Storage file manifest
  storageManifest: StorageFileManifest[];
}

export interface StorageFileManifest {
  path: string;
  type: 'player_photo' | 'team_logo' | 'id_document' | 'asset';
  originalUrl: string;
  fileName: string;
  size?: number;
  mimeType?: string;
}

export interface RestorePreview {
  playersCount: number;
  teamsCount: number;
  auctionsCount: number;
  bidsCount: number;
  usersCount: number;
  storageFilesCount: number;
  schemaVersion: string;
  backupDate: string;
  matchName: string;
  isCompatible: boolean;
  warnings: string[];
}

export interface AutoBackupConfig {
  enabled: boolean;
  interval: AutoBackupInterval;
  lastBackupAt?: string;
  nextBackupAt?: string;
  retainCount: number; // Keep minimum N backups
}

export interface BackupPermissions {
  canCreateFullBackup: boolean;
  canCreateQuickBackup: boolean;
  canRestore: boolean;
  canScheduleAutoBackup: boolean;
  canDeleteBackups: boolean;
  canViewBackups: boolean;
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
