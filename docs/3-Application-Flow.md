# Full Application Workflow Documentation

## Overview

This document describes the complete user journey through the Hype Hammer auction platform, from initial landing to auction completion and results viewing.

---

## Application States (AuctionStatus Enum)

```typescript
enum AuctionStatus {
  HOME = 'HOME',                                    // Landing page
  MARKETPLACE = 'MARKETPLACE',                      // Browse matches
  AUTH = 'AUTH',                                    // Login/Register
  ADMIN_REGISTRATION = 'ADMIN_REGISTRATION',        // Admin signup
  ROLE_SELECTION = 'ROLE_SELECTION',                // Choose role
  ROLE_REGISTRATION = 'ROLE_REGISTRATION',          // Role-specific form
  PROFILE_COMPLETION = 'PROFILE_COMPLETION',        // Complete OAuth profile
  HOW_IT_WORKS = 'HOW_IT_WORKS',                    // Tutorial page
  SETUP = 'SETUP',                                  // Match configuration
  MATCHES = 'MATCHES',                              // Match selection
  SETTINGS = 'SETTINGS',                            // Settings page
  PLAYER_DASHBOARD = 'PLAYER_DASHBOARD',            // Player view
  PLAYER_REGISTRATION = 'PLAYER_REGISTRATION',      // Player signup
  READY = 'READY',                                  // Pre-auction state
  LIVE = 'LIVE',                                    // Auction in progress
  PAUSED = 'PAUSED',                                // Auction paused
  ENDED = 'ENDED',                                  // Auction completed
  // Role-based Dashboards
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  AUCTIONEER_DASHBOARD = 'AUCTIONEER_DASHBOARD',
  AUCTIONEER_PENDING_APPROVAL = 'AUCTIONEER_PENDING_APPROVAL',
  TEAM_REP_DASHBOARD = 'TEAM_REP_DASHBOARD',
  GUEST_DASHBOARD = 'GUEST_DASHBOARD'
}
```

---

## Phase 1: Landing & Authentication

### 1.1 Home Page (HomePage)

```
User arrives at application
         │
         ▼
    ┌─────────────────────────────────────┐
    │           HOME PAGE                 │
    │  ┌─────────────────────────────┐   │
    │  │  Hero Section               │   │
    │  │  - Platform branding        │   │
    │  │  - "Start Auction" CTA      │   │
    │  │  - "How It Works" link      │   │
    │  └─────────────────────────────┘   │
    │  ┌─────────────────────────────┐   │
    │  │  Features Grid              │   │
    │  │  - Live Bidding             │   │
    │  │  - Team Management          │   │
    │  │  - Real-time Updates        │   │
    │  └─────────────────────────────┘   │
    └─────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   "Start Auction"        "Enter Match Code"
        │                       │
        ▼                       ▼
    AUTH PAGE              AUTH PAGE
   (New Admin)           (Join Existing)
```

### 1.2 Authentication Page (AuthPage)

```
┌─────────────────────────────────────────────────────────┐
│                    AUTH PAGE                            │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  LOGIN TAB                                      │   │
│  │  - Email input                                  │   │
│  │  - Password input                               │   │
│  │  - "Login" button                               │   │
│  │  - "Forgot Password" link                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  REGISTER TAB                                   │   │
│  │  - "I'm an Admin (Create New)" option          │   │
│  │  - "I'm joining an existing auction" option    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 1.3 Login Flow

```
User enters email + password
         │
         ▼
    POST /auth/login
         │
         ▼
   ┌─────────────────────────────────────┐
   │  Backend searches collections:      │
   │  1. auctioneers (by email)          │
   │  2. teams (by email)                │
   │  3. players (by email)              │
   │  4. guests (by email)               │
   │  5. matches (admin check)           │
   └─────────────────────────────────────┘
         │
         ▼
   Password match found?
         │
    ┌────┴────┐
    ▼         ▼
   YES        NO
    │         │
    ▼         ▼
Return      Return
user +      error
role        401
    │
    ▼
   Redirect to role-based dashboard
```

### 1.4 Role Selection (New Users)

```
New user selects role
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              ROLE SELECTION PAGE                        │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ ADMIN    │  │AUCTIONEER│  │ TEAM REP │  │ PLAYER │ │
│  │ Create & │  │ Run live │  │ Bid for  │  │Register│ │
│  │ manage   │  │ auctions │  │ your team│  │yourself│ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
│                                                         │
│                        ┌──────────┐                    │
│                        │  GUEST   │                    │
│                        │  Watch   │                    │
│                        │  only    │                    │
│                        └──────────┘                    │
└─────────────────────────────────────────────────────────┘
         │
         ▼
   Role-specific registration form
```

---

## Phase 2: Registration Flows

### 2.1 Admin Registration

```
POST /register/admin
         │
         ▼
Required Fields:
- name
- email
- password
- organizationName
- phone
         │
         ▼
Creates document in `matches` collection
with role: 'ADMIN'
         │
         ▼
Redirect to ADMIN_DASHBOARD
(Can create first match/season)
```

### 2.2 Auctioneer Registration

```
POST /register/auctioneer
         │
         ▼
Required Fields:
- name
- email
- password
- phone
- auctioneerLicense (optional)
- experience
- seasonId (which auction to join)
         │
         ▼
Creates document in `auctioneers` collection
with approvalStatus: 'pending'
         │
         ▼
Redirect to AUCTIONEER_PENDING_APPROVAL
(Waits for admin approval)
         │
         ▼
Admin approves → AUCTIONEER_DASHBOARD
```

### 2.3 Team Registration

```
POST /register/team
         │
         ▼
Required Fields:
- teamName
- teamShortCode
- teamLogo (URL)
- repName, repEmail, repMobile
- seasonId
- email, password
         │
         ▼
Creates document in `teams` collection
with approvalStatus: 'pending'
         │
         ▼
Admin approves → TEAM_REP_DASHBOARD
```

### 2.4 Player Registration

```
POST /register/player
         │
         ▼
Required Fields:
- name
- email
- password
- dateOfBirth
- roleId (e.g., Batsman, Bowler)
- basePrice
- playerPhoto (URL)
- seasonId
         │
         ▼
Creates document in `players` collection
with approvalStatus: 'pending'
with status: 'PENDING'
         │
         ▼
Admin approves:
- approvalStatus: 'accepted'
- status: 'AVAILABLE'
         │
         ▼
Player enters pool for auction
```

### 2.5 Guest Registration

```
POST /register/guest
         │
         ▼
Required Fields:
- name
- email
- password
- seasonId
         │
         ▼
Creates document in `guests` collection
         │
         ▼
Immediate access to GUEST_DASHBOARD
(No approval needed)
```

---

## Phase 3: Match/Season Setup (Admin)

### 3.1 Create New Match

```
Admin clicks "Create New Auction"
         │
         ▼
POST /matches
         │
         ▼
Required Fields:
- name (e.g., "IPL 2024 Auction")
- sport (Cricket, Kabaddi, etc.)
- adminId (creator)
         │
         ▼
Default config created:
{
  squadSize: { min: 11, max: 18 },
  totalBudget: 80_00_00_000,  // ₹80 Cr
  roles: [
    { id: 'bat', name: 'Batsman' },
    { id: 'bowl', name: 'Bowler' },
    { id: 'ar', name: 'All-Rounder' },
    { id: 'wk', name: 'Wicket Keeper' }
  ],
  bidConfig: {
    increments: [
      { range: { min: 0, max: 99 }, increment: 5 },
      { range: { min: 100, max: 199 }, increment: 10 },
      // ... more ranges
    ]
  }
}
```

### 3.2 Configure Match Settings

```
Admin Dashboard → Settings
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              MATCH CONFIGURATION                        │
│                                                         │
│  Match Name: [IPL 2024 Auction         ]              │
│  Sport:      [Cricket           ▼]                     │
│  Auction Date: [2024-03-15]                            │
│  Auction Time: [14:00]                                 │
│                                                         │
│  Team Budget:     [₹80 Cr    ]                         │
│  Max Squad Size:  [18        ]                         │
│  Min Squad Size:  [11        ]                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  BID INCREMENT CONFIGURATION                    │   │
│  │  ₹0 - ₹99L:        +₹5L                        │   │
│  │  ₹1Cr - ₹1.99Cr:   +₹10L                       │   │
│  │  ₹2Cr - ₹4.99Cr:   +₹25L                       │   │
│  │  ₹5Cr+:            +₹50L                       │   │
│  │                                     [🔒 Lock]   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         │
         ▼
PUT /matches/{id}/config
```

### 3.3 Generate Share Link

```
Admin generates join link
         │
         ▼
Format: https://hype-hammer.web.app/?match={matchId}
         │
         ▼
Share with:
- Auctioneers (to register as conductors)
- Teams (to register with budget)
- Players (to register for auction)
- Guests (to watch)
```

---

## Phase 4: Pre-Auction Approval Flow

### 4.1 Admin Approval Queue

```
Admin Dashboard → Pending Applications
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              APPROVAL QUEUE                             │
│                                                         │
│  TEAMS PENDING (3)                                     │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Chennai Kings    │ [✓ Approve] [✗ Decline]       │ │
│  │ Mumbai Stars     │ [✓ Approve] [✗ Decline]       │ │
│  │ Delhi Capitals   │ [✓ Approve] [✗ Decline]       │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  PLAYERS PENDING (25)                                  │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Virat K. │ Batsman │ ₹2Cr │ [✓] [✗]             │ │
│  │ Rohit S. │ Batsman │ ₹2Cr │ [✓] [✗]             │ │
│  │ ...                                               │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  AUCTIONEERS PENDING (1)                               │
│  ┌───────────────────────────────────────────────────┐ │
│  │ John Smith │ 5yr exp │ [✓ Approve] [✗ Decline]  │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Approval API Calls

```javascript
// Approve team
PUT /teams/{teamId}/approve
→ Sets approvalStatus: 'accepted'

// Decline team
PUT /teams/{teamId}/decline
→ Sets approvalStatus: 'declined'

// Approve player
PUT /players/{playerId}/approve
→ Sets approvalStatus: 'accepted', status: 'AVAILABLE'

// Decline player
PUT /players/{playerId}/decline
→ Sets approvalStatus: 'declined'

// Approve auctioneer
POST /auctioneer/approve
→ Sets approvalStatus: 'approved'
```

---

## Phase 5: Pre-Auction Validation

### 5.1 Validation Checklist

```
Auctioneer clicks "Start Auction"
         │
         ▼
GET /matches/{id}/pre-auction-validation
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│           PRE-AUCTION VALIDATION                        │
│                                                         │
│  ✓  Minimum 2 teams registered (found: 8)             │
│  ✓  Minimum 11 players available (found: 45)          │
│  ✓  Bid increments configured                          │
│  ✓  Auction date/time set                              │
│                                                         │
│  ⚠  Bid configuration will be LOCKED after start      │
│                                                         │
│           [Cancel]     [Start Auction →]               │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Lock Configuration

```
Before auction starts:
         │
         ▼
Bid config is locked in Firestore:
{
  bidConfig: { ... },
  bidConfigLocked: true,
  lockedAt: timestamp
}
         │
         ▼
No changes allowed during live auction
```

---

## Phase 6: Live Auction Flow

### 6.1 Start Auction

```
Auctioneer clicks "Start Auction"
         │
         ▼
POST /start
{
  seasonId: "match123"
}
         │
         ▼
Backend updates:
- liveAuctions/{seasonId}/state/current = { status: 'LIVE' }
- Match status = 'LIVE'
         │
         ▼
All connected clients receive real-time update
```

### 6.2 Player Bidding Cycle

```
┌─────────────────────────────────────────────────────────┐
│                BIDDING CYCLE                            │
│                                                         │
│    ┌─────────┐                                         │
│    │ SELECT  │ ← Auctioneer picks player or           │
│    │ PLAYER  │   "Next Player" auto-selects           │
│    └────┬────┘                                         │
│         │                                               │
│         ▼                                               │
│    POST /player/start                                   │
│    { playerId, seasonId }                              │
│         │                                               │
│         ▼                                               │
│    ┌─────────────────────────────────────────────┐     │
│    │  BIDDING ACTIVE                             │     │
│    │  Player: Virat Kohli                        │     │
│    │  Base: ₹2 Cr                                │     │
│    │  Current Bid: ₹2 Cr                         │     │
│    │  Leading: Chennai Kings                     │     │
│    │  Timer: 01:45                               │     │
│    │                                             │     │
│    │  [Chennai +10L] [Mumbai +10L] [Delhi +10L] │     │
│    └─────────────────────────────────────────────┘     │
│         │                                               │
│         │ (Team bids via auctioneer)                   │
│         ▼                                               │
│    POST /bids                                          │
│    { playerId, teamId, amount, seasonId }              │
│         │                                               │
│         ▼                                               │
│    Real-time update to all clients:                    │
│    - New bid amount                                    │
│    - Leading team                                      │
│    - Timer reset                                       │
│         │                                               │
│    ┌────┴────────────────────┐                        │
│    ▼                         ▼                         │
│  Timer expires          More bids                      │
│  OR Auctioneer                                         │
│  clicks "Sell"                                         │
│    │                                                    │
│    ▼                                                    │
│  ┌───────────────────────────────────────┐            │
│  │  POST /player/close                   │            │
│  │  OR                                   │            │
│  │  POST /player/unsold (if no bids)    │            │
│  └───────────────────────────────────────┘            │
│         │                                               │
│         ▼                                               │
│  Player marked SOLD or UNSOLD                          │
│  Team budget updated (if sold)                         │
│  Team playerIds array updated                          │
│         │                                               │
│         ▼                                               │
│    NEXT PLAYER (loop continues)                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.3 Real-time State Updates

```javascript
// Firestore document: liveAuctions/{seasonId}/currentPlayer/active
{
  player: {
    id: "player123",
    name: "Virat Kohli",
    basePrice: 20000000,
    roleId: "batsman",
    imageUrl: "..."
  },
  basePrice: 20000000,
  currentBid: 22000000,
  leadingTeamId: "team456",
  leadingTeamName: "Chennai Kings",
  duration: 120,
  startTime: Timestamp,
  timerEndTime: Timestamp
}

// Event emitted to: liveAuctions/{seasonId}/events
{
  type: "BID_PLACED",
  data: {
    playerId: "player123",
    teamId: "team456",
    teamName: "Chennai Kings",
    amount: 22000000,
    previousAmount: 20000000
  },
  timestamp: Timestamp
}
```

### 6.4 Pause/Resume

```
Auctioneer clicks "Pause"
         │
         ▼
POST /pause
{ seasonId }
         │
         ▼
liveAuctions/{seasonId}/state/current.status = 'PAUSED'
Timer stopped
         │
         ▼
All clients show "AUCTION PAUSED"
         │
         ▼
Auctioneer clicks "Resume"
         │
         ▼
POST /resume
{ seasonId }
         │
         ▼
status = 'LIVE'
Timer continues
```

### 6.5 Mark Player Unsold

```
No bids received OR Auctioneer clicks "Unsold"
         │
         ▼
POST /player/unsold
{
  playerId: "player123",
  seasonId: "match123"
}
         │
         ▼
Player document updated:
{
  status: 'UNSOLD',
  unsoldCount: 1  // Incremented each time
}
         │
         ▼
Player can be re-auctioned later via:
POST /reauction/start
```

### 6.6 Sell Player

```
Auctioneer clicks "Sell" (or timer expires with bids)
         │
         ▼
POST /player/close
{
  playerId: "player123",
  seasonId: "match123"
}
         │
         ▼
Backend performs:
1. Update player document:
   {
     status: 'SOLD',
     soldTo: "team456",
     soldAmount: 22000000,
     soldAt: timestamp,
     leadingTeamId: "team456"
   }

2. Update team document:
   {
     remainingBudget: previousBudget - 22000000,
     playerIds: [...existingIds, "player123"]
   }

3. Clear current player:
   liveAuctions/{seasonId}/currentPlayer/active = null

4. Emit event:
   {
     type: "PLAYER_SOLD",
     data: { player, team, amount }
   }
```

---

## Phase 7: End Auction

### 7.1 End Auction Session

```
Auctioneer clicks "End Auction"
         │
         ▼
POST /end
{ seasonId }
         │
         ▼
Backend updates:
- liveAuctions/{seasonId}/state/current.status = 'ENDED'
- Match document: status = 'ENDED'
         │
         ▼
Final state:
- All AVAILABLE players remain available
- All UNSOLD players remain unsold
- All SOLD players finalized
         │
         ▼
Emit event: { type: "AUCTION_ENDED" }
```

### 7.2 Unsold Re-Auction (Optional)

```
Admin/Auctioneer clicks "Re-auction Unsold"
         │
         ▼
POST /reauction/start
{ seasonId }
         │
         ▼
All players with status='UNSOLD' become available again:
- status: 'AVAILABLE'
- Can optionally set lower base prices
         │
         ▼
New auction session begins for unsold pool
```

---

## Phase 8: Results & Leaderboard

### 8.1 Auction Results Page

```
Any user navigates to Results
         │
         ▼
GET /teams?seasonId={id}
GET /players?seasonId={id}&status=SOLD
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              AUCTION RESULTS                            │
│                                                         │
│  TEAM LEADERBOARD                                      │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 1. Chennai Kings    │ 12 players │ ₹75.5Cr spent │ │
│  │ 2. Mumbai Stars     │ 11 players │ ₹72.3Cr spent │ │
│  │ 3. Delhi Capitals   │ 14 players │ ₹68.9Cr spent │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  TOP PURCHASES                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Virat K.  → Chennai  │ ₹16.5 Cr                  │ │
│  │ Rohit S.  → Mumbai   │ ₹15.0 Cr                  │ │
│  │ Bumrah    → Mumbai   │ ₹14.5 Cr                  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  UNSOLD PLAYERS (5)                                    │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Player X  │ Base ₹50L │ 2x unsold                │ │
│  │ Player Y  │ Base ₹30L │ 1x unsold                │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│               [📥 Export Results]                      │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Team Squad View

```
Click on team in leaderboard
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│         CHENNAI KINGS - FINAL SQUAD                    │
│                                                         │
│  Budget: ₹80 Cr  │  Spent: ₹75.5 Cr  │  Left: ₹4.5 Cr │
│  Squad: 12/18 players                                  │
│                                                         │
│  BATSMEN (4)                                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │ [👤] Virat Kohli      │ ₹16.5 Cr                 │ │
│  │ [👤] Faf du Plessis   │ ₹8.5 Cr                  │ │
│  │ [👤] Ruturaj Gaikwad  │ ₹6.0 Cr                  │ │
│  │ [👤] Ambati Rayudu    │ ₹4.5 Cr                  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  BOWLERS (5)                                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ...                                               │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ALL-ROUNDERS (2)                                      │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ...                                               │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  WICKET KEEPER (1)                                     │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ...                                               │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 9: Backup & Restore

### 9.1 Create Backup

```
Admin Dashboard → Settings → Backup
         │
         ▼
POST /backups
{
  matchId: "match123",
  type: "full"  // or "quick"
}
         │
         ▼
Backend creates ZIP containing:
- match.json (match config)
- teams.json (all teams)
- players.json (all players)
- bids.json (bid history)
         │
         ▼
Uploads to Firebase Storage:
backups/{matchId}/{timestamp}-backup.zip
         │
         ▼
Creates backup metadata in `backups` collection
```

### 9.2 Restore Backup

```
Admin selects backup to restore
         │
         ▼
POST /restore/preview
{ backupId }
         │
         ▼
Shows preview of changes:
- Teams to restore: 8
- Players to restore: 45
- Bids to restore: 320
         │
         ▼
POST /restore
{ backupId, confirm: true }
         │
         ▼
Restores all data from backup
```

---

## Complete User Journey Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE FLOW                                │
│                                                                 │
│  HOME → AUTH → ROLE_SELECTION → REGISTRATION → DASHBOARD      │
│                                                                 │
│  ADMIN PATH:                                                    │
│  ───────────                                                    │
│  Register → Create Match → Configure → Approve Users →         │
│  Monitor Auction → View Results → Backup                       │
│                                                                 │
│  AUCTIONEER PATH:                                               │
│  ────────────────                                               │
│  Register → Pending Approval → Dashboard → Start Auction →    │
│  Conduct Bidding → Sell/Unsold → End Auction                   │
│                                                                 │
│  TEAM REP PATH:                                                 │
│  ──────────────                                                 │
│  Register → Pending Approval → Dashboard → Watch/Bid →         │
│  View Acquired Players                                          │
│                                                                 │
│  PLAYER PATH:                                                   │
│  ────────────                                                   │
│  Register → Pending Approval → View Status →                   │
│  Get Auctioned → View Result                                    │
│                                                                 │
│  GUEST PATH:                                                    │
│  ───────────                                                    │
│  Register → Dashboard → Watch Live Auction → View Results      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Frontend-Backend Interactions

| User Action | Frontend | API Call | Backend Handler |
|-------------|----------|----------|-----------------|
| Login | AuthPage | POST /auth/login | handle_login |
| Register Team | RoleBasedRegistrationPage | POST /register/team | handle_register_team |
| Approve Player | AdminDashboardPage | PUT /players/{id}/approve | update_player_approval |
| Start Bidding | AuctioneerDashboardPage | POST /player/start | start_player_bidding |
| Place Bid | LiveAuctionPage | POST /bids | create_bid |
| Sell Player | LiveAuctionPage | POST /player/close | close_player_bidding |
| End Auction | AuctioneerDashboardPage | POST /end | end_auction |
| View Results | AuctionResultsPage | GET /teams, /players | get_teams, get_players |

---

## Error States

| Scenario | Frontend Display | Resolution |
|----------|------------------|------------|
| Login failed | "Invalid email or password" | Re-enter credentials |
| Registration email exists | "Email already registered" | Use different email or login |
| Approval pending | "Awaiting admin approval" | Contact admin |
| Auction not started | "Auction hasn't started yet" | Wait for countdown |
| Insufficient budget | "Budget exceeded" | Bid lower amount |
| Timer expired | "Bidding closed" | Wait for next player |
| Network error | "Connection lost, reconnecting..." | Auto-retry with exponential backoff |
