# Backend Architecture & API Documentation

## Overview

The Hype Hammer auction platform backend is built on **Firebase Cloud Functions** using **Express.js** for routing. The single-file architecture (`functions/index.js`) contains all API handlers, utility functions, and routing logic.

**Base URL:** `https://us-central1-axilam.cloudfunctions.net/auction`

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js (Firebase Cloud Functions Gen 1) |
| Framework | Express.js |
| Database | Cloud Firestore (NoSQL) |
| File Storage | Firebase Cloud Storage |
| Email | Nodemailer (Gmail SMTP) |
| Real-time | Firestore onSnapshot listeners |
| Authentication | Custom email/password + OTP verification |

---

## Core Utility Functions

### ID & OTP Generation
| Function | Purpose |
|----------|---------|
| `generate_otp()` | Generates 6-digit OTP for verification |
| `generate_id()` | Generates UUID v4 for document IDs |

### Data Serialization
| Function | Purpose |
|----------|---------|
| `serialize_firestore_doc(doc)` | Converts Firestore DocumentSnapshot to plain object with `id` field |
| `serialize_firestore_docs(docs)` | Maps array of DocumentSnapshots to serialized objects |
| `normalizePlayerForApi(player)` | Normalizes player data for consistent API responses |
| `toNumberOrNull(val)` | Safely converts values to numbers |

### Response Helpers
| Function | Purpose |
|----------|---------|
| `successResponse(data, message)` | Wraps data in success format `{success: true, data, message}` |
| `errorResponse(message, statusCode)` | Wraps errors in failure format `{success: false, error, statusCode}` |
| `createResponse(res, payload, status)` | Sets headers and sends JSON response |

### Real-time Event System
| Function | Purpose |
|----------|---------|
| `emit_realtime_event(eventType, data, seasonId)` | Emits event to `liveAuctions/{seasonId}/events` collection |
| `_set_live_auction_state(seasonId, updates)` | Updates `liveAuctions/{seasonId}/state/current` document |
| `_set_current_player(seasonId, player, basePrice, duration)` | Sets active player in `liveAuctions/{seasonId}/currentPlayer/active` |
| `_clear_current_player(seasonId)` | Clears the current player document |
| `_emit_named_event_doc(seasonId, docName, data)` | Creates/updates named event documents |
| `emit_realtime_push(collection, data)` | Pushes to a Firestore collection |

---

## API Endpoint Reference

### Authentication Routes (`/auth/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | `/auth/login` | `handle_login` | Multi-collection login (searches auctioneers, teams, players, guests, matches) |
| POST | `/auth/register` | `handle_auth_register` | Initial user registration |
| POST | `/auth/reset-password` | `handle_reset_password` | Password reset with OTP |
| POST | `/auth/check-email` | `handle_check_email` | Check if email exists, send OTP |
| POST | `/auth/verify-otp` | `handle_verify_otp` | Verify OTP code |
| GET | `/auth/users` | `get_auth_users` | Get all auth users (admin) |
| POST | `/auth/complete-profile` | `complete_auth_profile` | Complete OAuth profile |

### Registration Routes (`/register/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | `/register/admin` | `handle_register_admin` | Register new admin user |
| POST | `/register/auctioneer` | `handle_register_auctioneer` | Register auctioneer (requires approval) |
| POST | `/register/team` | `handle_register_team` | Register team with rep details |
| POST | `/register/player` | `handle_register_player` | Register player (requires approval) |
| POST | `/register/guest` | `handle_register_guest` | Register guest viewer |

### User Routes (`/users/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/users` | `get_users` | List all users (with filters) |
| GET | `/users/{id}` | `get_user` | Get single user by ID |
| GET | `/users/email/{email}` | `get_user_by_email` | Get user by email |
| POST | `/users` | `create_user` | Create new user |
| PUT | `/users/{id}` | `update_user` | Update user data |
| DELETE | `/users/{id}` | `delete_user` | Delete user |

### Team Routes (`/teams/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/teams?seasonId=X` | `get_teams` | List teams for season |
| GET | `/teams/{id}` | `get_team` | Get single team |
| POST | `/teams` | `create_team` | Create new team |
| PUT | `/teams/{id}` | `update_team` | Update team data |
| DELETE | `/teams/{id}` | `delete_team` | Delete team |
| PUT | `/teams/{id}/budget` | `update_team_budget` | Update team budget |
| PUT | `/teams/{id}/approve` | `update_team_approval` | Approve team (status=accepted) |
| PUT | `/teams/{id}/decline` | `update_team_approval` | Decline team (status=declined) |

### Auctioneer Routes (`/auctioneers/*` & `/auctioneer/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/auctioneers` | `get_auctioneers` | List all auctioneers |
| POST | `/auctioneers` | `create_auctioneer` | Create auctioneer |
| PUT | `/auctioneers/{id}` | `update_auctioneer` | Update auctioneer |
| DELETE | `/auctioneers/{id}` | `delete_auctioneer` | Delete auctioneer |
| GET | `/auctioneer?email=X` | `get_auctioneer_by_email` | Get by email |
| GET | `/auctioneer/{id}` | `get_auctioneer` | Get by ID |
| POST | `/auctioneer/approve` | `approve_auctioneer` | Approve auctioneer |
| POST | `/auctioneer/reject` | `reject_auctioneer` | Reject auctioneer |
| POST | `/auctioneer/update-photo` | `update_auctioneer_photo` | Update photo |

### Player Routes (`/players/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/players?seasonId=X` | `get_players` | List players for season |
| GET | `/players/{id}` | `get_player` | Get single player |
| POST | `/players` | `create_player` | Create new player |
| PUT | `/players/{id}` | `update_player` | Update player data |
| DELETE | `/players/{id}` | `delete_player` | Delete player |
| PUT | `/players/{id}/approve` | `update_player_approval` | Approve player |
| PUT | `/players/{id}/decline` | `update_player_approval` | Decline player |

### Live Auction Player Actions (`/player/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | `/player/start` | `start_player_bidding` | Begin bidding on player |
| POST | `/player/close` | `close_player_bidding` | Sell player to highest bidder |
| POST | `/player/unsold` | `mark_player_unsold` | Mark player as unsold |
| POST | `/player/next` | `get_next_player` | Auto-select next player |
| POST | `/player/reset` | `reset_live_auction` | Reset auction state |

### Match/Season Routes (`/matches/*` & `/auctions/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/matches` | `get_matches` | List all matches/seasons |
| GET | `/matches/{id}` | `get_match` | Get match with players/teams counts |
| POST | `/matches` | `create_match` | Create new match/season |
| PUT | `/matches/{id}` | `update_match` | Update match data |
| DELETE | `/matches/{id}` | `delete_match` | Delete match |
| GET | `/matches/{id}/config` | `get_match_config` | Get match configuration |
| PUT | `/matches/{id}/config` | `update_match_config` | Update match config |
| GET | `/matches/{id}/validate` | `validate_match_config` | Validate config |
| GET | `/matches/{id}/pre-auction-validation` | `get_pre_auction_validation` | Pre-auction checklist |

### Bid Routes (`/bids/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/bids?seasonId=X&playerId=Y` | `get_bids` | Get bid history |
| POST | `/bids` | `create_bid` | Place a bid (handles real-time updates) |

### Auction Control Routes

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | `/start` | `start_auction` | Start auction session |
| POST | `/bid` | `place_bid` | Place bid (alias) |
| POST | `/pause` | `pause_auction` | Pause auction |
| POST | `/resume` | `resume_auction` | Resume auction |
| POST | `/end` | `end_auction` | End auction session |
| PUT | `/match-status/{id}` | `update_match_status` | Update match status |

### Re-auction Routes (`/reauction/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | `/reauction/start` | `start_reauction_unsold` | Start re-auction of unsold players |

### Backup & Restore Routes (`/backups/*` & `/backup/*` & `/restore/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/backups?matchId=X` | `get_backups` | List backups for match |
| GET | `/backups/{id}` | `get_backup` | Get backup details |
| GET | `/backups/{id}/download` | `download_backup` | Download backup file |
| POST | `/backups` | `create_backup` | Create new backup |
| DELETE | `/backups/{id}` | `delete_backup` | Delete backup |
| POST | `/backup/full` | `create_backup` | Create full backup |
| POST | `/backup/quick` | `create_backup` | Create quick backup |
| GET | `/backup/auto-config` | `get_auto_backup_config` | Get auto-backup settings |
| PUT | `/backup/auto-config` | `update_auto_backup_config` | Update auto-backup settings |
| GET | `/backup/status` | `get_backup_status` | Get backup status |
| POST | `/restore` | `restore_backup` | Restore from backup |
| POST | `/restore/preview` | `preview_restore` | Preview restore changes |
| POST | `/restore/validate` | `validate_backup_file` | Validate backup file |

### File Upload Routes (`/upload/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | `/upload/player-photo` | `handle_file_upload` | Upload player photo |
| POST | `/upload/team-logo` | `handle_file_upload` | Upload team logo |
| POST | `/upload/profile-picture` | `handle_file_upload` | Upload profile picture |
| POST | `/upload/auctioneer-photo` | `handle_file_upload` | Upload auctioneer photo |
| POST | `/upload/document` | `handle_file_upload` | Upload document |
| POST | `/upload/auction-recording` | `handle_file_upload` | Upload recording |

### Sports Configuration Routes (`/sports/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/sports` | `get_sports` | Get available sports and roles |
| POST | `/sports` | `save_sports` | Save/update sports config |

### State Management Routes (`/state/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/state` | `get_state` | Get application state |
| POST | `/state` | `save_state` | Save application state |

### Debug Routes (`/debug/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | `/debug/sync-all-teams` | `debug_sync_all_teams` | Sync team player IDs |
| GET | `/debug/all-players` | `debug_all_players` | List all players (debug) |
| POST | `/debug/seed-users` | `debug_seed_test_users` | Seed test users |
| POST | `/debug/migrate-sold-players` | `migrate_sold_players_data` | Migrate sold player data |

---

## Firestore Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `matches` | Season/auction configurations | `name`, `sport`, `status`, `config`, `auctionDate`, `auctionTime` |
| `teams` | Team registrations | `name`, `seasonId`, `budget`, `initialBudget`, `approvalStatus`, `playerIds` |
| `players` | Player registrations | `name`, `seasonId`, `basePrice`, `status`, `approvalStatus`, `roleId` |
| `auctioneers` | Auctioneer accounts | `name`, `email`, `approvalStatus`, `assignedMatchId` |
| `guests` | Guest viewer accounts | `name`, `email`, `seasonId` |
| `users` | Legacy user collection | `email`, `password`, `role` |
| `bids` | Bid history | `playerId`, `teamId`, `amount`, `timestamp`, `seasonId` |
| `backups` | Backup metadata | `matchId`, `fileName`, `type`, `createdAt` |
| `liveAuctions/{seasonId}/state/current` | Live auction state | `status`, `currentPlayerId`, `currentBid`, `leadingTeamId` |
| `liveAuctions/{seasonId}/events` | Real-time events | `type`, `data`, `timestamp` |
| `liveAuctions/{seasonId}/currentPlayer/active` | Current bidding player | `player`, `basePrice`, `duration`, `startTime` |

---

## Real-time Data Flow

```
┌─────────────────────────┐
│     Frontend Client     │
│  (Firestore onSnapshot) │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│                    Cloud Firestore                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │  liveAuctions/{seasonId}/                       │    │
│  │    ├── state/current     (auction status)      │    │
│  │    ├── currentPlayer/active (who's being bid)  │    │
│  │    └── events/{eventId}  (bid events, actions) │    │
│  └─────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────┘
                         │
             ┌───────────┴───────────┐
             │                       │
             ▼                       ▼
    ┌────────────────┐      ┌────────────────┐
    │   Auctioneer   │      │  Team Rep/     │
    │   Dashboard    │      │  Guest Viewer  │
    │  (writes bids) │      │  (reads only)  │
    └────────────────┘      └────────────────┘
```

### Real-time Event Types
- `PLAYER_START` - Bidding started on a player
- `BID_PLACED` - New bid placed
- `PLAYER_SOLD` - Player sold to team
- `PLAYER_UNSOLD` - Player marked unsold
- `AUCTION_PAUSED` - Auction paused
- `AUCTION_RESUMED` - Auction resumed
- `AUCTION_ENDED` - Auction session ended

---

## Authentication Flow

1. **Email/Password Login:**
   ```
   POST /auth/login → handle_login()
   → Search auctioneers, teams, players, guests, matches collections
   → Verify password match
   → Return user data with role
   ```

2. **Registration Flow:**
   ```
   POST /register/{role} → handle_register_{role}()
   → Validate required fields
   → Check email uniqueness
   → Hash password
   → Create document in appropriate collection
   → Return success with user ID
   ```

3. **OTP Verification:**
   ```
   POST /auth/check-email → Send OTP to email
   POST /auth/verify-otp → Verify OTP code
   POST /auth/reset-password → Reset password with verified OTP
   ```

---

## Error Handling

All API responses follow this structure:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message here",
  "statusCode": 400
}
```

**Common Status Codes:**
- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized
- `404` - Not Found
- `405` - Method Not Allowed
- `500` - Internal Server Error

---

## Environment Configuration

| Secret | Purpose |
|--------|---------|
| `EMAIL_SENDER` | Gmail address for sending OTPs |
| `EMAIL_PASSWORD` | Gmail app password |

---

## CORS Configuration

Allowed origins:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (fallback)
- `https://hype-hammer.web.app` (production)
- `https://axilam.web.app` (Firebase hosting)
- `https://us-central1-axilam.cloudfunctions.net` (Cloud Functions)
