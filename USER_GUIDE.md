# HypeHammer - Complete User Guide

## 📋 Table of Contents
1. [Application Overview](#application-overview)
2. [Getting Started](#getting-started)
3. [Registration Workflows](#registration-workflows)
4. [Dashboard Usage by Role](#dashboard-usage-by-role)
5. [Running an Auction](#running-an-auction)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Application Overview

**HypeHammer** is a live sports auction platform where:
- **Organizers/Admins** create and manage auction seasons
- **Auctioneers** conduct live bidding sessions
- **Teams** bid on players within their budget
- **Players** register to be drafted by teams
- **Guests** watch auctions live

---

## 🚀 Getting Started

### Application Entry Point: **HomePage** (`/`)

**Location:** `components/pages/HomePage.tsx`

When you first launch the app, you land on the **Home Page** with three main options:

1. **"Explore Auctions"** → Goes to Marketplace to browse existing auctions
2. **"How It Works"** → Tutorial page explaining the auction process
3. **"Login"** → Login with existing credentials
4. **"Organize Your Season"** → Creates a new auction season (Admin Registration)

---

## 📝 Registration Workflows

### **1. Admin/Organizer Registration** (Create New Season)

**Path:** Home → "Organize Your Season" → Admin Registration Page

**File:** `components/pages/AdminRegistrationPage.tsx`

#### Step-by-Step Process:

**STEP 1: Personal Details**
- Full Name (required)
- Email Address (required)
- Phone Number (required)
- Password (required)
- Profile Photo (optional)

**STEP 2: Organization Details**
- Organization Name (College/League/Club/Private)
- Organizer Type
- Designation (Organizer/Coordinator/Owner)
- Upload Government ID (required)
- Upload Organization Proof (optional)

**STEP 3: Season Configuration**
- Season/Match Name (e.g., "IPL 2024", "College Cup 2024")
- Sport Type (Cricket, Football, Basketball, etc.)
- Auction Date & Time
- Venue Mode (Physical/Online/Hybrid)
- Venue Location (if physical/hybrid)

**STEP 4: Auction Rules**
- Maximum Teams (default: 8)
- Max Players Per Team (default: 15)
- Base Budget Per Team (default: ₹1 Crore)

**What Happens Next:**
- Your season is created in Firebase
- You're automatically logged in as **Admin**
- You're redirected to **Admin Dashboard**

---

### **2. Participant Registration** (Join Existing Season)

**Path:** Home → "Explore Auctions" → Marketplace → Select Season → "Apply for Auction"

**File:** `components/pages/MarketplacePage.tsx` → `RoleSelectionPage.tsx`

#### Flow:

1. **Browse Available Seasons** (MarketplacePage)
   - See all upcoming, ongoing, and completed auctions
   - Filter by status (Upcoming/Live/Completed)
   - Search by season name or sport

2. **Select a Season**
   - Click "Apply for Auction" on any season card

3. **Choose Your Role** (RoleSelectionPage)
   - **Auctioneer**: Conduct the live bidding
   - **Team Representative**: Bid on behalf of a team
   - **Player**: Register to be auctioned
   - **Guest**: Watch the auction live

4. **Complete Role-Specific Registration** (RoleBasedRegistrationPage)

---

#### **A. Auctioneer Registration**

**Fields Required:**
- Full Name
- Email & Phone
- Password
- Profile Photo
- **Auctioneer-specific:**
  - License Number
  - Years of Experience
  - Languages Known
  - Previous Auctions Conducted
  - Government ID
  - Assigned Auction/Event

**Approval Process:**
- Admin must approve your registration
- You'll see "Pending Approval" status
- Once approved, you can access Auctioneer Dashboard

---

#### **B. Team Representative Registration**

**Fields Required:**
- Representative Full Name
- Email & Phone
- Password
- Profile Photo
- **Team Details:**
  - Team Name
  - Team Short Code (3-4 letters)
  - Team Logo (upload)
  - Home City
  - Representative Role (Owner/Manager/Captain)
  - Max Squad Size
  - Authorization Letter (upload)

**What You Get:**
- Team created with base budget (set by admin)
- Access to Team Rep Dashboard
- Ability to bid during auctions

---

#### **C. Player Registration**

**Fields Required:**
- Full Name
- Date of Birth
- Gender
- Nationality
- Player Photo
- Contact Email & Mobile
- City & State
- **Sport-Specific Details:**
  - Sport Type (Cricket, Football, etc.)
  - Player Role (Batsman, Bowler, All-rounder, etc.)
  - Batting Style (Right-hand, Left-hand)
  - Bowling Style
  - Experience Level (Beginner/Intermediate/Professional)
  - Previous Teams
  - Base Price (minimum amount you want)
  - Player Category (Domestic/International)
  - Sports ID/Certificate
  - Availability Status
  - Consent to participate

**What Happens:**
- You're added to the player pool with status "AVAILABLE"
- Admin can approve/modify your profile
- You can track your auction status in Player Dashboard

---

#### **D. Guest Registration**

**Fields Required (Minimal):**
- Name
- Email & Phone
- Password
- Organization (optional)
- Guest Type (Media/Sponsor/Fan/Official)
- Favorite Team (optional)
- Enable notifications

**What You Get:**
- View-only access to live auctions
- Real-time updates on bids and sales
- Access to Guest Dashboard

---

## 🎛️ Dashboard Usage by Role

### **1. Admin Dashboard** (`/admin/dashboard`)

**File:** `components/pages/AdminDashboardPage.tsx`

#### **Main Sections:**

##### **A. Overview**
- Auction statistics
- Player count (Available/Sold/Unsold)
- Team count and total budget pool
- Recent activity feed

##### **B. Season Settings**
- Edit season name, dates, budget
- Configure auction rules
- Modify team budgets

##### **C. Players Management**
- View all registered players
- Approve/Reject player registrations
- Edit player base prices
- Set player status (AVAILABLE/PENDING/SOLD/UNSOLD)
- Search and filter players

##### **D. Teams Management**
- View all registered teams
- Approve/Reject team registrations
- Edit team budgets
- View team squads
- Search and filter teams

##### **E. Auctioneers Management**
- View all auctioneer applications
- Approve/Reject auctioneers
- Assign auctioneers to sessions
- View auctioneer details and credentials

##### **F. Live Monitor**
- Real-time view of ongoing auction
- See current player being auctioned
- Track current bid and leading team
- View bidding countdown
- Monitor system logs

##### **G. Live Room Access**
- Join the live auction as spectator
- See the same view as participants
- Monitor auction progress

##### **H. Analytics & Reports**
- Bidding history for each player
- Team spending analysis
- Auction completion progress
- Export reports

---

### **2. Auctioneer Dashboard** (`/auctioneer/dashboard`)

**File:** `components/pages/AuctioneerDashboardPage.tsx`

#### **Key Features:**

##### **A. Auction Control Panel**
- **Approval Status Check**: Wait for admin approval first
- **Player Queue**: List of all players to be auctioned
- **Quick Actions:**
  - Select player to start bidding
  - Pause/Resume auction
  - Skip player
  - Mark player as unsold
  - Confirm sale to highest bidder

##### **B. Team Bidding Panel**
- View all teams with their remaining budgets
- **Place bids on behalf of teams:**
  - Quick bid buttons: +1L, +5L, +10L, +20L
  - Custom bid amount input
  - Budget validation before bidding
- Real-time budget updates
- Leading team highlight

##### **C. Current Bidding Display**
- Player profile card
- Current bid amount
- Leading team
- Bid history (last 20 bids)
- Bidding timer

##### **D. Live Room View**
- Switch to "Live Room" for broadcast-style view
- **Bidding enabled in Live Room!**
- Full-screen mode available
- Professional auction interface

##### **E. System Logs**
- Track all auction events
- Bid confirmations
- Player sales
- System warnings
- Admin overrides

---

### **3. Team Rep Dashboard** (`/team-rep/dashboard`)

**File:** `components/pages/TeamRepDashboardPage.tsx`

#### **Key Features:**

##### **A. Team Overview**
- Team budget (total & remaining)
- Current squad size
- Budget spent breakdown
- Squad strength by role

##### **B. My Squad**
- View all acquired players
- See purchase prices
- Total spending
- Filter by role

##### **C. Live Auction Participation**
- Join live auction room
- **Place bids for your team:**
  - See current player being auctioned
  - Quick bid buttons
  - Custom bid amounts
  - Budget validation
- Real-time bid updates
- Notification when you're outbid

##### **D. Available Players**
- Browse player pool
- Filter by role, category, price
- Search players
- View player profiles

##### **E. Auction Analytics**
- Your bidding history
- Average player cost
- Budget utilization
- Squad completion progress

---

### **4. Player Dashboard** (`/player/dashboard`)

**File:** `components/pages/PlayerDashboardPage.tsx`

#### **Key Features:**

##### **A. Player Profile**
- Your registration details
- Base price
- Player category
- Registration status

##### **B. Auction Status**
- Current status: AVAILABLE/PENDING/LIVE/SOLD/UNSOLD
- If SOLD:
  - Team that drafted you
  - Final sale price
- If UNSOLD:
  - Reason/notes
  - Re-register option

##### **C. Bidding History**
- See who bid on you
- Bidding timeline
- Final sale details

##### **D. Edit Profile**
- Update your details
- Change base price (before auction)
- Upload new photo

---

### **5. Guest Dashboard** (`/guest/dashboard`)

**File:** `components/pages/GuestDashboardPage.tsx`

#### **Key Features:**

##### **A. Live Auction View**
- Watch auction in real-time
- See current player being auctioned
- Track bids as they happen
- View leading team

##### **B. Players Showcase**
- Browse all players
- Filter by status (Available/Sold)
- Search players

##### **C. Teams Overview**
- View all teams
- See their squads
- Track budgets spent

##### **D. Leaderboards**
- Most expensive players
- Biggest spenders
- Fastest sales

---

## 🎬 Running an Auction

### **Complete Workflow**

#### **Phase 1: Pre-Auction Setup** (Admin)

1. **Create Season** (Admin Registration process)
2. **Configure Settings** (Admin Dashboard → Settings)
   - Set team budgets
   - Set squad limits
   - Configure bidding rules

3. **Review Registrations:**
   - **Players:** Admin Dashboard → Players
     - Approve/reject player applications
     - Verify base prices
     - Set player categories
   - **Teams:** Admin Dashboard → Teams
     - Approve/reject team applications
     - Verify authorization documents
     - Confirm budgets
   - **Auctioneers:** Admin Dashboard → Auctioneers
     - Approve qualified auctioneers
     - Assign to sessions

4. **Pre-Launch Checklist:**
   - ✅ At least 8 teams approved
   - ✅ Sufficient players (50+)
   - ✅ At least 1 auctioneer approved
   - ✅ All budgets configured
   - ✅ Auction date/time set

---

#### **Phase 2: Live Auction** (Auctioneer)

**Entry:** Auctioneer Dashboard → Live Room (or Dashboard view)

##### **Starting the Auction:**

1. **Open Auctioneer Dashboard**
2. **Wait for approval confirmation**
3. **Review player queue** - All AVAILABLE players appear

##### **Auctioning Each Player:**

**Step 1: Select Player**
- Click "Start Bidding" on a player from the queue
- Player status changes to "LIVE"
- Bidding timer starts (default: 60 seconds)

**Step 2: Accept Bids**
- Teams bid through their dashboards (Team Reps)
- **Auctioneer can also bid on behalf of teams:**
  - Select team from the panel
  - Click quick bid buttons (+1L, +5L, +10L, +20L)
  - Or enter custom bid amount
  - System validates budget automatically
- Current bid updates in real-time
- Leading team highlighted
- Bid history shows recent bids

**Step 3: Closing Bidding**

**Option A: Sold**
- When timer expires or bidding stops
- Click "CONFIRM SALE" button
- Player sold to leading team
- Celebration animation plays
- Player status → "SOLD"
- Team budget automatically deducted
- Player added to team squad
- Next player automatically queued

**Option B: Unsold**
- If no bids received
- Or if bids below acceptable price
- Click "MARK UNSOLD" button
- Player status → "UNSOLD"
- Player removed from queue
- Can be re-auctioned later

##### **During Auction Controls:**

- **Pause/Resume**: Emergency pause button
- **Timer Extension**: Add 10-30 seconds if needed
- **Skip Player**: Move to next player
- **Reset Bid**: Clear current bids (emergency only)
- **View Logs**: Track all actions

##### **Managing Pace:**

- Auto-advance to next player after sale
- 3-second celebration animation
- Smooth transitions between players
- Real-time synchronization across all dashboards

---

#### **Phase 3: Monitoring** (Admin)

**Admin Dashboard → Live Monitor**

##### **Real-Time Tracking:**
- Current player being auctioned
- Active bids
- Leading team
- System health
- Error alerts

##### **Emergency Controls:**
- Force pause auction
- Override bids (if needed)
- Resolve disputes
- End auction early
- Generate reports

---

#### **Phase 4: Post-Auction**

**Admin Dashboard → Reports**

##### **Available Reports:**

1. **Bidding History**
   - All bids placed for each player
   - Timeline view
   - Winning bids highlighted

2. **Team Analysis**
   - Budget spent per team
   - Squad composition
   - Average player cost
   - Most active bidders

3. **Player Sales Report**
   - Sold players with prices
   - Unsold players
   - Highest/lowest sales
   - Base price vs sale price comparison

4. **Auction Summary**
   - Total players auctioned
   - Total money spent
   - Average sale price
   - Auction duration
   - Fastest/slowest sales

##### **Export Options:**
- Download CSV
- Download PDF
- Print reports

---

## 🔄 Key Workflows Summary

### **Workflow 1: Admin Creates Season**
```
Home Page 
→ "Organize Your Season" 
→ Admin Registration (4 steps) 
→ Season Created 
→ Admin Dashboard
```

### **Workflow 2: Player Joins Auction**
```
Home Page 
→ "Explore Auctions" 
→ Marketplace 
→ Select Season 
→ "Apply for Auction" 
→ Choose "Player" Role 
→ Player Registration 
→ Wait for Admin Approval 
→ Player Dashboard
```

### **Workflow 3: Team Registers**
```
Marketplace 
→ Select Season 
→ "Apply for Auction" 
→ Choose "Team Representative" 
→ Team Registration 
→ Admin Approves 
→ Team Rep Dashboard
```

### **Workflow 4: Auctioneer Conducts Auction**
```
Auctioneer Dashboard 
→ Wait for Approval 
→ Review Player Queue 
→ Select Player 
→ "Start Bidding" 
→ Accept Bids (from teams or place on behalf) 
→ "Confirm Sale" or "Mark Unsold" 
→ Repeat for next player
```

### **Workflow 5: Team Bids on Player**
```
Team Rep Dashboard 
→ Join Live Auction 
→ View Current Player 
→ Click Quick Bid or Enter Amount 
→ System Validates Budget 
→ Bid Placed 
→ Track in Real-Time 
→ Win or Get Outbid
```

---

## 🎯 Important Features

### **Real-Time Synchronization**
- **Technology:** Firebase Realtime Database
- **Socket Service:** `services/firebaseRealtimeService.ts`
- All dashboards update instantly
- Bids, sales, status changes sync across all users
- No page refresh needed

### **Budget Management**
- Automatic budget tracking
- Real-time validation before bids
- Prevents overbidding
- Displays remaining budget on all dashboards

### **Player Status Flow**
```
AVAILABLE → (Admin Approves) 
→ PENDING → (Auctioneer Starts) 
→ LIVE → (Bidding Active) 
→ SOLD / UNSOLD
```

### **Bidding in Live Room**
- **NEW FEATURE**: Auctioneers can now bid in the Live Room!
- Same bidding interface as Dashboard
- Quick bid buttons for all teams
- Custom bid input
- Budget validation
- Professional broadcast-style layout

### **Audio Broadcasting** (Optional)
- Auctioneer can enable microphone
- Live audio streaming to all participants
- Mute/unmute controls
- WebRTC-based communication

---

## ⚠️ Troubleshooting

### **Issue: Can't see my season in Marketplace**
**Solution:**
- Ensure season is approved (Admin Dashboard shows "LIVE" status)
- Check that auction date is set correctly
- Verify sport type is selected

### **Issue: Auctioneer pending approval**
**Solution:**
- Admin must approve from Admin Dashboard → Auctioneers section
- Contact season organizer to check approval status

### **Issue: Can't place bid - "Insufficient Budget"**
**Solution:**
- Check team's remaining budget
- Reduce bid amount
- Budget shown in Team Rep Dashboard

### **Issue: Bids not updating in real-time**
**Solution:**
- Check internet connection
- Refresh page
- Ensure Firebase Realtime Database is connected
- Check browser console for errors

### **Issue: Player stuck in "LIVE" status**
**Solution:**
- Auctioneer must either:
  - Click "Confirm Sale" to complete
  - Click "Mark Unsold" to cancel
- Admin can force reset from Admin Dashboard

### **Issue: Live Room not showing teams/bids**
**Solution:**
- Ensure `onPlaceBid` handler is passed to AuctioneerLiveRoom
- Check browser console for errors
- Verify teams are loaded (Admin Dashboard → Teams)
- Check socket connection status

---

## 📊 Database Structure

### **Firebase Collections**
- `/seasons/{seasonId}` - Season/match data
- `/players/{seasonId}` - All players for a season
- `/teams/{seasonId}` - All teams for a season
- `/bids/{seasonId}` - Bidding history
- `/auctionState/{seasonId}` - Real-time auction state
- `/users` - All registered users (admins, auctioneers, etc.)

---

## 🔐 Security & Permissions

### **Role-Based Access:**
- **Admin**: Full control over season, approvals, settings
- **Auctioneer**: Control auction flow, place bids, mark sales
- **Team Rep**: Bid for own team only, view own squad
- **Player**: View own profile, track auction status
- **Guest**: Read-only access to live auction

### **Validations:**
- Budget checks before every bid
- Admin approval for auctioneers
- Team rep authorization documents
- Player consent required
- Government ID verification for admins/auctioneers

---

## 🚀 Quick Start Guide

### **For First-Time Users:**

1. **Visit:** `http://localhost:5173` (or your deployed URL)
2. **Create Season:**
   - Click "Organize Your Season"
   - Complete 4-step registration
   - Wait 2-3 seconds for season creation
3. **Approve Participants:**
   - Go to Admin Dashboard
   - Approve players, teams, auctioneers
4. **Start Auction:**
   - Auctioneer logs in
   - Opens Auctioneer Dashboard
   - Clicks "Start Bidding" on first player
5. **Teams Bid:**
   - Team Reps join live auction
   - Place bids on players
6. **Complete Sales:**
   - Auctioneer confirms sales
   - Auction progresses automatically

---

## 📞 Support

For issues or questions:
- Check browser console for errors
- Review Firebase Realtime Database rules
- Verify API endpoint: `https://us-central1-axilam.cloudfunctions.net/auction`
- Check `services/socketService.ts` for connection status

---

**Last Updated:** February 2026  
**Version:** 2.0  
**Frontend Stack:** React + TypeScript + Vite  
**Backend:** Firebase Functions + Realtime Database
