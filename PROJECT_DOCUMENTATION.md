# 🎯 HypeHammer - Complete Project Documentation

## 📌 Project Overview

**HypeHammer** is a comprehensive **Role-Based Sports Auction Management System** built with React + TypeScript. It enables organizations to conduct professional sports auctions with multiple stakeholders (Admins, Auctioneers, Team Representatives, Players, and Guests), each with customized dashboards and workflows.

The platform supports multiple sports (Cricket, Football, Kabaddi, Volleyball, Hockey, Badminton, Table Tennis, Wrestling, Esports) and provides real-time auction management with AI-powered insights.

---

## 🎭 Core Roles & Dashboards

### 1. **Super Admin / Organizer Dashboard** 👑
- **Color Scheme**: Blue/Yellow gradient
- **Access**: Full platform control
- **Features**:
  - Manage all seasons and auctions
  - Monitor all users across the platform
  - View comprehensive KPI analytics
  - Create and manage multiple sports/matches
  - System-wide oversight and reports

**Demo Credentials**: 
- Email: `admin@hypehammer.com`
- Password: `admin123`

---

### 2. **Auctioneer Dashboard** 🎤
- **Color Scheme**: Red/Pink gradient
- **Access**: Live auction control and management
- **Features**:
  - Overview: Auction statistics and metrics
  - Queue: Manage player auction order
  - Live: Real-time auction control
  - Announcements: Broadcast auction updates
  - Logs: Complete auction history tracking

**Demo Credentials**:
- Email: `auctioneer@hypehammer.com`
- Password: `auctioneer123`

**Key Functionality**:
- Start/pause auctions
- Control bidding timer
- Manage player queue
- Track bid history
- Announce winners

---

### 3. **Team Representative Dashboard** 🏏
- **Color Scheme**: Purple/Pink gradient
- **Access**: Team bidding and squad management
- **Features**:
  - Overview: Team stats, remaining budget, players bought
  - Live Bid: Place bids during active auctions
  - Squad: Manage team roster
  - Budget: Track spending history
  - Activity: Monitor team notifications

**Demo Credentials**:
- Email: `teamrep@hypehammer.com`
- Password: `team123`
- Team: Mumbai Warriors

**Key Functionality**:
- Real-time bidding interface
- Budget tracking and validation
- Squad composition management
- Bid history review
- Team performance metrics

---

### 4. **Player Dashboard** 👤
- **Color Scheme**: Green/Teal gradient
- **Access**: View-only auction status tracking
- **Features**:
  - Profile: Player info, base price, stats
  - Status: Current auction live status
  - Result: Final sale information
  - History: Past seasons performance

**Demo Credentials**:
- Email: `player@hypehammer.com`
- Password: `player123`
- Player Name: Virat Sharma

**Key Functionality**:
- View auction status (awaiting/live/sold/unsold)
- Track current bid against base price
- View final sale team and price
- Historical performance analysis
- Self-registration option

---

### 5. **Guest/Spectator Dashboard** 👀
- **Color Scheme**: Cyan/Light Blue gradient
- **Access**: Spectator view of auctions
- **Features**:
  - Live: Real-time auction monitoring
  - Favorites: Track favorite players/teams
  - Summary: Auction statistics and insights

**Demo Credentials**:
- Email: `guest@hypehammer.com`
- Password: `guest123`

**Key Functionality**:
- Watch live auctions
- Track favorite teams and players
- View auction summaries
- Monitor highest bids and costliest buys
- Read-only access to all data

---

## 🏗️ Project Architecture

### File Structure

```
hype-hammer/
├── src/
│   ├── App.tsx                          ← Main app with routing & state management
│   ├── index.tsx                        ← React entry point
│   ├── index.css                        ← Global styles
│   ├── types.ts                         ← TypeScript interfaces & enums
│   ├── constants.ts                     ← Mock data & default configs
│   │
│   ├── components/
│   │   ├── index.ts                     ← Component exports
│   │   │
│   │   ├── pages/
│   │   │   ├── HomePage.tsx             ← Landing page with login
│   │   │   ├── AuthPage.tsx             ← Login form
│   │   │   ├── SetupPage.tsx            ← Auction configuration
│   │   │   ├── MatchesPage.tsx          ← Match management
│   │   │   ├── DashboardPage.tsx        ← Main auction dashboard
│   │   │   ├── PlayersPage.tsx          ← Player management
│   │   │   ├── TeamsPage.tsx            ← Team management
│   │   │   ├── AuctionRoomPage.tsx      ← Live auction interface
│   │   │   ├── HistoryPage.tsx          ← Bid history tracking
│   │   │   ├── HowItWorksPage.tsx       ← Help & tutorial
│   │   │   ├── SettingsPage.tsx         ← Application settings
│   │   │   │
│   │   │   ├── AdminDashboardPage.tsx   ← Super Admin dashboard
│   │   │   ├── AuctioneerDashboardPage.tsx ← Auctioneer dashboard
│   │   │   ├── TeamRepDashboardPage.tsx    ← Team Rep dashboard
│   │   │   ├── PlayerDashboardPage.tsx     ← Player dashboard
│   │   │   ├── GuestDashboardPage.tsx      ← Guest dashboard
│   │   │   │
│   │   │   └── ...other pages
│   │   │
│   │   ├── ui/
│   │   │   ├── Modal.tsx                ← Reusable modal component
│   │   │   ├── StatCard.tsx             ← KPI card component
│   │   │   ├── CommandCard.tsx          ← Command button component
│   │   │   ├── OrbitalItem.tsx          ← Navigation orbital
│   │   │   ├── HUDPill.tsx              ← Status indicator
│   │   │   ├── SoldCelebration.tsx      ← Celebration animation
│   │   │   └── SettingsSidebar.tsx      ← Settings navigation
│   │   │
│   │   ├── modals/
│   │   │   ├── PlayerModal.tsx          ← Player edit/create
│   │   │   ├── TeamModal.tsx            ← Team edit/create
│   │   │   ├── SquadModal.tsx           ← Squad viewer
│   │   │   └── HowItWorksModal.tsx      ← Help modal
│   │   │
│   │   └── db/
│   │       ├── app-state.json           ← Current app state
│   │       ├── cricket/                 ← Cricket data
│   │       │   ├── players.json
│   │       │   ├── teams.json
│   │       │   └── matches.json
│   │       ├── football/                ← Football data
│   │       ├── kabaddi/                 ← Kabaddi data
│   │       └── ...other sports
│   │
│   ├── services/
│   │   ├── storageService.ts            ← Data persistence & API calls
│   │   └── geminiService.ts             ← Google Gemini AI integration
│   │
│   ├── vite.config.ts                   ← Vite bundler config
│   ├── tsconfig.json                    ← TypeScript config
│   ├── package.json                     ← Dependencies & scripts
│   │
│   └── server/
│       ├── index.js                     ← Express backend server
│       ├── package.json                 ← Server dependencies
│       └── data/
│           ├── app-state.json           ← Persisted app state
│           └── sports-data.json         ← Persisted sports data
│
└── Documentation/
    ├── README.md                        ← Getting started
    ├── DEMO_USERS.md                    ← Login credentials
    ├── ROLE_SYSTEM_GUIDE.md             ← Role-based system details
    ├── STORAGE_SETUP.md                 ← Data storage documentation
    └── PROJECT_DOCUMENTATION.md         ← This file
```

---

## 🔐 Authentication & Login System

### Mock Users (In localStorage)
All demo credentials are stored in `localStorage` with key `hypehammer_users`:

```json
{
  "id": "user-admin-1",
  "email": "admin@hypehammer.com",
  "password": "admin123",
  "name": "Super Admin",
  "role": "ADMIN",
  "seasonId": "mock-cricket-1"
}
```

### Login Flow
1. User clicks "Login" on HomePage
2. Enters email and password
3. Auto-detects role from credentials
4. Stores user in `currentUser` state
5. Navigates to role-specific dashboard
6. sessionStorage persists state on refresh

### Session Management
- **sessionStorage Keys**:
  - `hypehammer_current_status`: Current page status
  - `hypehammer_current_user`: Logged-in user data
  - `hypehammer_current_sport`: Selected sport
  - `hypehammer_current_match_id`: Selected match

- **Page Refresh**: User stays on current page with all data intact
- **Browser Back Button**: Navigates to previous page in history
- **Logout**: Clears all session data and returns to home

---

## 🎨 Modern UI Design System

### Design Pattern
- **Modern Dashboard Aesthetic**: Smooth gradients, blur effects, floating cards
- **Color Scheme**: `bg-gradient-to-br from-white via-blue-50 to-orange-50`
- **Component Styling**:
  - Rounded corners: `rounded-3xl` (cards), `rounded-full` (buttons)
  - Blur effects: `backdrop-blur-lg` for glassmorphism
  - Shadows: `shadow-2xl` with hover elevation
  - Borders: Gradient borders for visual interest
  - Icons: Lucide React icons (16-56px sizes)

### Navigation Headers
All dashboards use consistent 3-section header layout:
1. **Left (1/4)**: Logo + Role title
2. **Center**: Navigation tabs with color-coded active states
3. **Right (1/4)**: Notifications, user profile, logout button

### Role-Specific Color Schemes
| Role | Primary Color | Accent |
|------|---------------|--------|
| Admin | Blue (from-blue-400 to-orange-500) | Gold gradient |
| Auctioneer | Red (from-red-500 to-pink-500) | Red glow |
| Team Rep | Purple (from-purple-500 to-pink-500) | Purple glow |
| Player | Green (from-green-500 to-teal-500) | Green glow |
| Guest | Cyan (from-cyan-500 to-blue-500) | Cyan glow |

---

## 🔄 State Management

### App-Level State (in App.tsx)

```typescript
// Authentication & User
const [currentUser, setCurrentUser] = useState(...)     // User profile
const [status, setStatus] = useState(...)               // Current page

// Sports & Matches
const [allSports, setAllSports] = useState(...)         // All sports data
const [currentSport, setCurrentSport] = useState(...)   // Selected sport
const [currentMatchId, setCurrentMatchId] = useState(...) // Selected match

// Auction Control
const [config, setConfig] = useState(...)               // Auction config
const [players, setPlayers] = useState(...)             // Match players
const [teams, setTeams] = useState(...)                 // Match teams
const [history, setHistory] = useState(...)             // Bid history

// UI State
const [activeTab, setActiveTab] = useState(...)         // Current tab
const [isNavExpanded, setIsNavExpanded] = useState(...)  // Nav state
```

### Routing System

**Status to URL Mapping**:
```typescript
statusToPath: Record<AuctionStatus, string> = {
  HOME: '/',
  AUTH: '/login',
  ADMIN_DASHBOARD: '/admin/dashboard',
  AUCTIONEER_DASHBOARD: '/auctioneer/dashboard',
  TEAM_REP_DASHBOARD: '/team-rep/dashboard',
  PLAYER_DASHBOARD: '/player/dashboard',
  GUEST_DASHBOARD: '/guest/dashboard'
  // ... etc
}
```

**Navigation**:
- URL changes trigger status updates
- Status changes update URL with browser history
- Browser back button supported via `popstate` listener
- Page refresh restores previous state from sessionStorage

---

## 💾 Data Persistence

### Storage Layers
1. **sessionStorage** (Temporary - Per Session)
   - User login state
   - Current page status
   - Current sport/match selection
   - Cleared on logout

2. **localStorage** (Persistent - Browser)
   - Sports data (JSON)
   - Mock users
   - User registrations

3. **Backend Server** (Persistent - Disk)
   - `server/data/app-state.json` - App state
   - `server/data/sports-data.json` - All sports/matches/teams/players
   - Synced via Node.js Express API

### Data Flow
```
User Action
    ↓
Update State in React
    ↓
Save to sessionStorage (instant)
    ↓
Send to Backend API (http://localhost:3001)
    ↓
Backend writes to JSON files
    ↓
On Page Refresh: Load from sessionStorage → URL sync
    ↓
On Page Reload: Load from Backend → Display data
```

---

## 🚀 Tech Stack

### Frontend
- **React 19.2.3** - UI framework
- **TypeScript** - Type safety
- **React Router** - Navigation (BrowserRouter)
- **Vite** - Build tool (ultra-fast)
- **Tailwind CSS** - Styling (imported via CDN in HTML)
- **Lucide React** - Icon library (562 icons)

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **CORS** - Cross-origin requests
- **File System (fs)** - JSON file storage

### AI Integration
- **Google Gemini API** - AI insights for auctions
- **@google/genai** - Gemini client library

### Development
- **npm** - Package manager
- **Vite Dev Server** - Fast HMR
- **TypeScript Compiler** - Type checking

---

## 📋 Supported Sports

1. **Cricket** 🏏
   - Teams: CSK, MI, RCB, etc.
   - Roles: Batsman, Bowler, All-rounder, Wicket-keeper
   - Budget: Varies by tournament

2. **Football** ⚽
   - Teams: Manchester United, Barcelona, Real Madrid, etc.
   - Roles: Forward, Midfielder, Defender, Goalkeeper
   - Budget: Multi-million contracts

3. **Kabaddi** 🤼
   - Teams: UP Yoddhas, Jaipur Pink Panthers, etc.
   - Roles: Raider, Defender
   - Budget: Varies

4. **Volleyball** 🏐
5. **Hockey** 🏑
6. **Badminton** 🏸
7. **Table Tennis** 🏓
8. **Wrestling** 🤺
9. **Esports** 🎮
10. **Custom Sports** ⚙️

---

## 🎯 Key Features

### 1. Role-Based Access Control
- Different dashboards for each role
- Role-specific UI and functionality
- Session-based authentication
- Demo credentials for testing

### 2. Multi-Sport Management
- Support for 9+ sports
- Custom sport creation
- Multiple simultaneous auctions
- Sport-specific configurations

### 3. Real-Time Auction Management
- Live auction dashboard
- Bid tracking and history
- Timer and queue management
- Winner announcements

### 4. Team & Player Management
- Create/edit teams and players
- Budget allocation
- Squad composition
- Performance analytics

### 5. Analytics & Insights
- AI-powered auction insights (Gemini API)
- Live statistics dashboard
- Bid history export
- KPI tracking

### 6. Modern UI/UX
- Responsive design
- Smooth animations
- Glassmorphism effects
- Dark/light theme ready
- Mobile-friendly navigation

---

## 🔧 Running the Application

### Prerequisites
- Node.js 18+
- npm or yarn
- Google Gemini API key (optional)

### Setup Instructions

**1. Install Frontend Dependencies**
```bash
npm install
```

**2. Install Backend Dependencies**
```bash
cd server
npm install
cd ..
```

**3. Configure API Key (Optional)**
Create `.env.local`:
```
VITE_GEMINI_API_KEY=your_api_key_here
```

**4. Start Backend Server** (Terminal 1)
```bash
cd server
npm start
# Runs on http://localhost:3001
```

**5. Start Frontend** (Terminal 2)
```bash
npm run dev
# Runs on http://localhost:5173
```

### Development Commands
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `cd server && npm start` - Start backend server
- `cd server && npm run dev` - Backend with auto-reload

---

## 📊 Data Models

### User Types
```typescript
enum UserRole {
  ADMIN = 'ADMIN',              // Platform admin
  AUCTIONEER = 'AUCTIONEER',    // Conducts auctions
  TEAM_REP = 'TEAM_REP',        // Represents team
  PLAYER = 'PLAYER',            // Gets auctioned
  GUEST = 'GUEST'               // Spectator
}
```

### Auction Status
```typescript
enum AuctionStatus {
  HOME, MARKETPLACE, AUTH,
  SETUP, MATCHES, READY, LIVE, PAUSED, ENDED,
  ADMIN_DASHBOARD, AUCTIONEER_DASHBOARD,
  TEAM_REP_DASHBOARD, PLAYER_DASHBOARD, GUEST_DASHBOARD
}
```

### Core Entities

**Player**:
- id, name, roleId, basePrice
- status (UNSOLD/SOLD/LIVE/PENDING)
- stats, nationality, isOverseas

**Team**:
- id, name, owner, budget, logo
- homeCity, foundationYear
- players[], remainingBudget

**Bid**:
- id, playerId, teamId, amount
- timestamp, status (PENDING/WON/LOST)

**Match**:
- id, name, sport type
- config (squadSize, budget, rules)
- players[], teams[], history[]

---

## 🎓 Learning Path

### For New Developers
1. Read `DEMO_USERS.md` for login details
2. Read `ROLE_SYSTEM_GUIDE.md` for feature overview
3. Check `STORAGE_SETUP.md` for data persistence
4. Explore component files in `components/pages/`
5. Review `types.ts` for data structures
6. Study `App.tsx` for routing logic

### Key Files to Understand
1. **App.tsx** - Core logic, routing, state management
2. **types.ts** - Data models and enums
3. **constants.ts** - Mock data and defaults
4. **services/storageService.ts** - API & persistence
5. **components/pages/*.tsx** - Feature pages

---

## 🐛 Debugging Tips

### Check Current State
```javascript
// In browser console
localStorage.getItem('hypehammer_users')
sessionStorage.getItem('hypehammer_current_user')
```

### Reset Application
```javascript
// In browser console
localStorage.removeItem('hypehammer_sports')
sessionStorage.clear()
// Then refresh page
```

### View API Responses
```javascript
// Backend logs appear in server terminal
// Frontend logs appear in browser console
```

### Network Issues
- Ensure backend runs on port 3001
- Check CORS configuration in `server/index.js`
- Verify API_BASE in `services/storageService.ts`

---

## 📈 Future Enhancements

- [ ] Real authentication (JWT/OAuth)
- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] Email notifications
- [ ] Payment gateway integration
- [ ] Mobile app (React Native)
- [ ] Video streaming for live auctions
- [ ] Advanced analytics dashboard
- [ ] Machine learning for price prediction
- [ ] Multi-language support
- [ ] Dark mode theme

---

## 📞 Support

For issues or questions:
1. Check existing documentation files
2. Review mock data in `constants.ts`
3. Check browser console for errors
4. Check server logs for API issues
5. Review component prop interfaces

---

## 📝 Version History

**v1.0.0** (Current)
- ✅ Role-based dashboard system
- ✅ Multi-sport auction management
- ✅ Real-time bidding interface
- ✅ Modern UI with Tailwind CSS
- ✅ Browser history support
- ✅ Session persistence
- ✅ AI-powered insights (Gemini)
- ✅ Complete documentation

---

**Last Updated**: January 20, 2026

**Status**: Production Ready 🚀

---

