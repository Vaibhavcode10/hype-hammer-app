# Dashboard System Documentation

## Overview

The Hype Hammer platform provides role-based dashboards for different user types. Each dashboard is tailored to the user's permissions and responsibilities within the auction ecosystem.

---

## User Roles

| Role | Dashboard | Description |
|------|-----------|-------------|
| `ADMIN` | AdminDashboardPage | Full system control, approval management |
| `AUCTIONEER` | AuctioneerDashboardPage | Auction control, bidding management |
| `GUEST` | GuestDashboardPage | View-only access to live auction |

---

## Dashboard Sidebar Navigation

### Admin Dashboard Sidebar Pages

The Admin can navigate between these pages in the left sidebar:

```
ADMIN DASHBOARD SIDEBAR
├─ 📊 Overview         (Dashboard stats, quick actions)
├─ ⚙️ Settings         (Match config, bid increments)
├─ 👥 Players         (Player management, approvals)
├─ 📋 Applications    (Pending approvals queue)
├─ 🏆 Teams           (Team management, budgets)
├─ 🎙️ Auctioneers     (Auctioneer management)
├─ 🔴 Live Monitor    (Real-time auction watch)
├─ 📺 Live Room       (Auction control interface)
├─ 📈 Reports         (Results & analytics)
├─ ➕ Add Team        (Register new team)
├─ ➕ Add Player      (Register new player)
├─ 👤 Team Detail     (Individual team squad)
└─ 📜 History         (Bid history viewer)
```

**Total Pages: 13**

---

### Auctioneer Dashboard Sidebar Pages

The Auctioneer can navigate between these pages in the left sidebar:

```
AUCTIONEER DASHBOARD SIDEBAR
├─ 📊 Dashboard       (Overview & quick actions)
├─ 📺 Live Room       (Auction control - MAIN PAGE)
├─ 🏆 Teams           (Team management)
├─ 👥 Players         (Player pool)
├─ 📋 Applications    (Player approvals)
├─ ⚙️ Settings        (Bid config, auction time)
├─ 📊 Report          (Auction results)
├─ 👤 Team Detail     (Individual team squad)
├─ 📜 History         (Bid history viewer)
├─ ➕ Add Team        (Quick team registration)
├─ ➕ Add Player      (Quick player registration)
└─ 🥇 Results         (Leaderboard)
```

**Total Pages: 12**

---

### Guest Dashboard Sidebar Pages

The Guest can navigate between these pages in the left sidebar:

```
GUEST DASHBOARD SIDEBAR
├─ 📊 Overview       (Match info & stats)
├─ 👥 Players        (Browse players - READ ONLY)
├─ 🏆 Teams          (Browse teams - READ ONLY)
├─ 📺 Live Room      (Watch auction - NO BIDDING)
└─ 🥇 Results        (Leaderboard results)
```

**Total Pages: 5**

---

## Admin Dashboard

**File:** [components/pages/AdminDashboardPage.tsx](../components/pages/AdminDashboardPage.tsx)  
**Lines:** ~5,610

### Available Sections

| Section ID | Label | Description |
|------------|-------|-------------|
| `overview` | Overview | Main dashboard with stats, quick actions |
| `settings` | Settings | Match configuration, auction settings, bid increments |
| `players` | Players | Player management with status filters |
| `playerApplications` | Applications | Pending player/team approval queue |
| `teams` | Teams | Team management with budget tracking |
| `auctioneers` | Auctioneers | Auctioneer management and approval |
| `liveMonitor` | Live Monitor | Real-time auction monitoring |
| `liveRoom` | Live Room | Full live auction interface |
| `reports` | Reports | Auction results and analytics |
| `addTeam` | Add Team | Team registration form |
| `addPlayer` | Add Player | Player registration form |
| `teamDetail` | Team Detail | Individual team squad view |
| `history` | History | Player bid history view |

### Key Features

1. **Overview Dashboard**
   - Total teams, players, auctioneers counts
   - Budget overview (total purse, spent, remaining)
   - Auction status indicator (Ready/Live/Paused/Ended)
   - Quick action buttons based on auction state
   - Recent activity feed

2. **Settings Panel**
   - Match name, sport type, auction date/time
   - Budget configuration (team budget, max squad size)
   - Bid increment settings with lock/unlock
   - Player role management
   - Backup & restore functionality

3. **Player Management**
   - Search and filter players by status/role
   - Approve/decline pending applications
   - Edit player details (base price, role)
   - View bid history per player
   - Bulk operations

4. **Team Management**
   - Team cards with budget progress bars
   - Squad size indicators
   - Approve/decline pending teams
   - Edit team budget
   - View team squad details

5. **Auctioneer Management**
   - List all registered auctioneers
   - Approve/reject auctioneer applications
   - Assign auctioneers to matches

6. **Live Room Access**
   - Real-time auction view (read-only for admin)
   - Player card with bid amount
   - Team bid history
   - Countdown timer display

### Data Access

```typescript
// API calls made by Admin Dashboard
GET /matches                          // List all matches
GET /matches/{id}                     // Get current match details
GET /teams?seasonId={id}              // Get teams for match
GET /players?seasonId={id}            // Get players for match
GET /auctioneers                      // Get all auctioneers
GET /bids?seasonId={id}&playerId={id} // Get bid history
PUT /teams/{id}/approve               // Approve team
PUT /teams/{id}/decline               // Decline team
PUT /players/{id}/approve             // Approve player
PUT /players/{id}/decline             // Decline player
PUT /matches/{id}/config              // Update match config
```

### Real-time Subscriptions

```typescript
// Firestore listeners
liveAuctions/{seasonId}/state/current     // Auction state
liveAuctions/{seasonId}/currentPlayer/active // Current player
liveAuctions/{seasonId}/events             // Bid events
```

---

## Auctioneer Dashboard

**File:** [components/pages/AuctioneerDashboardPage.tsx](../components/pages/AuctioneerDashboardPage.tsx)  
**Lines:** ~4,741

### Available Sections

| Section ID | Label | Description |
|------------|-------|-------------|
| `dashboard` | Dashboard | Overview with quick actions |
| `liveRoom` | Live Room | Full auction control interface |
| `teams` | Teams | Team management (limited) |
| `players` | Players | Player pool management |
| `playerApplications` | Applications | Player approval queue |
| `settings` | Settings | Auction date/time, bid config |
| `report` | Report | Auction results view |
| `teamDetail` | Team Detail | Individual team squad |
| `history` | History | Bid history viewer |
| `addTeam` | Add Team | Quick team registration |
| `addPlayer` | Add Player | Quick player registration |
| `results` | Results | Leaderboard view |

### Key Features

1. **Dashboard Overview**
   - Match status card with countdown
   - Team count, player count, budget stats
   - Quick navigation to all sections
   - Pre-auction validation checklist

2. **Live Auction Room (Primary Feature)**
   - Full auction control interface
   - Player selection/cycling
   - Start/stop bidding on player
   - Place bids on behalf of teams
   - Mark player sold/unsold
   - Pause/resume auction
   - Real-time timer management
   - End auction session

3. **Pre-Auction Validation Modal**
   - Check minimum teams registered
   - Check minimum players available
   - Verify bid increment configuration
   - Confirm auction date/time set
   - Lock bid config before starting

4. **Team Management**
   - View all teams with budgets
   - Register new teams on-the-fly
   - View team squad details
   - Cannot modify budgets (admin only)

5. **Player Management**
   - View player pool
   - Approve pending player applications
   - Edit player base prices
   - View bid history

### Auction Control Actions

```typescript
// Live auction API calls
POST /player/start    // Start bidding on player
POST /bids            // Place bid for team
POST /player/close    // Sell player to highest bidder
POST /player/unsold   // Mark player as unsold
POST /player/next     // Auto-select next player
POST /pause           // Pause auction
POST /resume          // Resume auction
POST /end             // End auction session
POST /reauction/start // Start unsold re-auction
```

### Real-time State Management

The auctioneer dashboard manages the authoritative auction state:

```typescript
// Firestore writes (via API)
liveAuctions/{seasonId}/state/current = {
  status: 'LIVE' | 'PAUSED' | 'ENDED',
  currentPlayerId: string,
  currentBid: number,
  leadingTeamId: string,
  timerEndTime: timestamp
}

liveAuctions/{seasonId}/currentPlayer/active = {
  player: PlayerObject,
  basePrice: number,
  duration: 120,  // seconds
  startTime: timestamp
}
```

---

## Guest Dashboard

**File:** [components/pages/GuestDashboardPage.tsx](../components/pages/GuestDashboardPage.tsx)  
**Lines:** ~1,086

### Available Sections

| Section ID | Label | Description |
|------------|-------|-------------|
| `overview` | Overview | Stats summary, quick links |
| `players` | Players | Read-only player list |
| `teams` | Teams | Read-only team list |
| `liveRoom` | Live Room | Watch live auction |
| `results` | Results | Auction leaderboard |

### Key Features

1. **Overview**
   - Match information display
   - Total teams and players counts
   - Budget statistics
   - Auction countdown timer
   - Quick navigation buttons

2. **Players View (Read-Only)**
   - Browse all approved players
   - Filter by role, status
   - View player details
   - No edit capabilities

3. **Teams View (Read-Only)**
   - Browse all approved teams
   - View team budgets and squad sizes
   - See remaining purse
   - No edit capabilities

4. **Live Room (Watch Mode)**
   - Real-time auction viewing
   - Current player card display
   - Bid amount and leading team
   - Countdown timer
   - No bidding capability

5. **Results/Leaderboard**
   - View auction results
   - Team rankings by spend
   - Player acquisition details
   - Export capabilities

### Session Persistence

```typescript
// Guest session is preserved across page reloads
sessionStorage.setItem('hypehammer_guest_section', 'liveRoom');
sessionStorage.setItem('hypehammer_guest_match_id', matchId);
```

### Read-Only API Access

```typescript
// API calls (all GET, no mutations)
GET /matches/{id}              // Get match info
GET /teams?seasonId={id}       // Get teams list
GET /players?seasonId={id}     // Get players list
```

---

## Common Components Used

### TeamHUDCard
Displays team summary with budget progress bar:
- Team logo and name
- Budget remaining display
- Squad size indicator
- Percentage bar (clamped 0-100%)

### PlayerModal
Player detail popup:
- Photo and name
- Role and base price
- Status (Available/Sold/Unsold)
- Bid history button

### AuctionCountdown
Displays countdown to auction start:
- Days, hours, minutes, seconds
- "Live Now" indicator when active

### PreAuctionValidationModal
Checklist before starting auction:
- Minimum teams requirement
- Minimum players requirement
- Bid configuration check
- Lock confirmation

---

## Navigation Flow

```
┌─────────────────────────────────────────────────────────┐
│                    SIDEBAR NAV                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Overview  │  Players  │  Teams  │  Settings   │   │
│  └─────────────────────────────────────────────────┘   │
│                         │                               │
│    ┌────────────────────┼────────────────────┐         │
│    ▼                    ▼                    ▼         │
│ Overview           PlayersPage          TeamsPage      │
│    │                    │                    │         │
│    │                    ▼                    ▼         │
│    │             PlayerModal          TeamSquadPage    │
│    │                    │                    │         │
│    ▼                    ▼                    ▼         │
│ LiveRoom ◄──────── Bid History ◄────── Team Detail    │
└─────────────────────────────────────────────────────────┘
```

---

## State Management

All dashboards use React `useState` and `useEffect` for local state. Real-time data comes via Firestore subscriptions through the `socketService`:

```typescript
// Common state pattern
const [teams, setTeams] = useState<Team[]>([]);
const [players, setPlayers] = useState<Player[]>([]);
const [activeSection, setActiveSection] = useState<SectionType>('overview');
const [loading, setLoading] = useState(true);

// Firestore subscription
useEffect(() => {
  const unsubscribe = socketService.subscribeToAuctionState(matchId, (state) => {
    setLiveAuctionStatus(state.status);
    setCurrentBid(state.currentBid);
    // etc.
  });
  return () => unsubscribe();
}, [matchId]);
```

---

## Responsive Design

All dashboards are built with responsive Tailwind CSS:
- Desktop: Full sidebar navigation
- Tablet: Collapsible sidebar
- Mobile: Bottom navigation or hamburger menu

Key breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
