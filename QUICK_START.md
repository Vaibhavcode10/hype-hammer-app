# 🚀 HypeHammer Live Bidding - Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies (1 minute)

```bash
# Backend
cd server
pip install Flask-SocketIO==5.3.5 python-socketio==5.10.0

# Frontend
cd ..
npm install socket.io-client@^4.7.2
```

### Step 2: Start Server (30 seconds)

```bash
cd server
python app.py
```

Expected output:
```
🔥 HypeHammer Server Starting...
✅ Flask + SocketIO initialized
✅ Real-time bidding enabled
🌐 Server running on http://localhost:5000
```

### Step 3: Start Frontend (30 seconds)

```bash
npm run dev
```

### Step 4: Test the System (3 minutes)

1. **Register Auctioneer**
   - Go to registration
   - Select "Auctioneer" role
   - Fill form and register
   - **Notice:** Dashboard shows blur screen ⏳

2. **Approve Auctioneer (Admin)**
   - Login as admin
   - Call approval endpoint:
   ```bash
   curl -X POST http://localhost:5000/api/auctioneer/approve \
     -H "Content-Type: application/json" \
     -d '{
       "auctioneerId": "auctioneer_abc123",
       "seasonId": "IPL_2024",
       "adminId": "admin_xyz"
     }'
   ```
   - **Auctioneer dashboard:** Blur removed! 🎉

3. **Initialize Auction (Admin)**
   ```bash
   curl -X POST http://localhost:5000/api/auction/initialize \
     -H "Content-Type: application/json" \
     -d '{
       "seasonId": "IPL_2024",
       "startTime": "2024-01-22T10:00:00Z",
       "endTime": "2024-01-22T18:00:00Z"
     }'
   ```

4. **Start Auction (Auctioneer)**
   - Click "Start Auction" button
   - Status changes to LIVE 🟢
   - Timer starts counting down

5. **Start Player Bidding (Auctioneer)**
   - Go to "Queue" tab
   - Select a player
   - Click "Start Bidding"
   - Player appears on all dashboards!

6. **Place Bids (Team Reps)**
   - Open multiple team rep dashboards
   - Click bid buttons (+5L, +10L, +20L)
   - **Watch:** All dashboards update instantly! ⚡

7. **Close Bidding (Auctioneer)**
   - Click "SOLD!" or "UNSOLD"
   - Player removed from queue
   - Budget updated
   - Celebration animation! 🎊

---

## 🎮 Demo Scenario

### The Full IPL Auction Experience

**Cast:**
- 1 Admin (you)
- 1 Auctioneer (you in incognito)
- 3 Team Reps (3 browser tabs)
- 1 Player dashboard (bonus)

**Script:**

**00:00 - Setup Phase**
```bash
# Admin initializes season
POST /api/auction/initialize
{
  "seasonId": "IPL_2024",
  "startTime": "2024-01-22T10:00:00Z",
  "endTime": "2024-01-22T18:00:00Z",
  "playerQueue": ["player_1", "player_2", "player_3"]
}

# Admin approves auctioneer
POST /api/auctioneer/approve
{
  "auctioneerId": "auctioneer_123",
  "seasonId": "IPL_2024",
  "adminId": "admin_456"
}
```

**00:30 - Auction Starts**
```
Auctioneer: Clicks "Start Auction"
All Dashboards: Status → LIVE 🟢
Timer: Starts counting down from 8 hours
```

**01:00 - First Player**
```
Auctioneer: Starts bidding for "Virat Kohli"
Base Price: ₹2.0 Cr

All Dashboards Show:
┌─────────────────────────────────┐
│  NOW BIDDING: Virat Kohli       │
│  Current Bid: ₹2.0 Cr           │
│  Leading Team: None             │
└─────────────────────────────────┘
```

**01:05 - Bidding War!**
```
RCB: Clicks "+5L" → ₹2.5 Cr
MI:  Clicks "+10L" → ₹3.5 Cr
CSK: Clicks "+10L" → ₹4.5 Cr
RCB: Clicks "+20L" → ₹6.5 Cr
MI:  Clicks "+10L" → ₹7.5 Cr
RCB: Clicks "+5L" → ₹8.0 Cr

[10 seconds of silence]

Auctioneer: "Going once... going twice..."
Auctioneer: Clicks "SOLD!"
```

**01:30 - Result**
```
All Dashboards Show:
┌─────────────────────────────────┐
│    🔨 SOLD! 🔨                 │
│                                 │
│    Virat Kohli                  │
│    ₹8.0 Cr                      │
│                                 │
│    Royal Challengers Bangalore  │
└─────────────────────────────────┘

RCB Dashboard:
- Remaining Budget: ₹92.0 Cr (from ₹100 Cr)
- Squad: [Virat Kohli]
- Status: "You acquired Virat Kohli! 🎉"

Other Teams:
- Budgets unchanged
- Status: "Virat Kohli sold to RCB"
```

**01:45 - Next Player**
```
Auctioneer: Starts bidding for "MS Dhoni"
Repeat process...
```

---

## 🧪 Testing Checklist

### ✅ Approval System
- [ ] Auctioneer sees blur screen before approval
- [ ] Admin can approve auctioneer
- [ ] Only one auctioneer per season
- [ ] Blur removed after approval
- [ ] Rejected auctioneer cannot access

### ✅ Live Bidding
- [ ] All dashboards show same player
- [ ] Bids appear instantly on all screens
- [ ] Leading team highlighted correctly
- [ ] Budget validation works
- [ ] Cannot bid more than budget

### ✅ Server Control
- [ ] Timer synced across all dashboards
- [ ] Pause stops bidding for everyone
- [ ] Resume continues from where paused
- [ ] Force close works

### ✅ Role Permissions
- [ ] Admin can view everything
- [ ] Auctioneer can control flow
- [ ] Team reps can bid
- [ ] Players/guests view only

---

## 🐛 Common Issues

### Issue 1: "WebSocket connection failed"

**Cause:** Frontend can't connect to backend

**Fix:**
```bash
# Check server is running
curl http://localhost:5000

# Check CORS settings in server/app.py
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173"], # Your frontend URL
        ...
    }
})
```

### Issue 2: "Auctioneer still sees blur"

**Cause:** Not approved yet

**Fix:**
```bash
# Check status in Firestore
# auctioneers collection → find your auctioneer → check "status" field
# Should be "approved"

# Or call approval endpoint
POST /api/auctioneer/approve
```

### Issue 3: "Bid not appearing"

**Cause:** Not joined season room

**Fix:**
```javascript
// In your dashboard, ensure you're joining the season
useEffect(() => {
  socketService.connect();
  socketService.joinSeason(seasonId, userId, role);
}, []);
```

### Issue 4: "Budget not updating"

**Cause:** Player wasn't marked as SOLD

**Fix:**
```bash
# Ensure auctioneer clicks "SOLD" not "UNSOLD"
# Check in players collection → status should be "SOLD"
# Check in teams collection → remainingBudget should be reduced
```

---

## 📊 Monitoring

### Check Server Health

```bash
# Test WebSocket connection
curl http://localhost:5000

# Should return API info with SocketIO status
```

### Check Auction State

```bash
# Get current auction state
curl http://localhost:5000/api/auction/state/IPL_2024

# Response:
{
  "success": true,
  "data": {
    "status": "LIVE",
    "currentPlayerId": "player_123",
    "currentBid": 15000000,
    "leadingTeamId": "team_rcb",
    "biddingActive": true
  }
}
```

### Check Auctioneer Status

```bash
# Check if auctioneer is approved
curl http://localhost:5000/api/auctioneer/status/auctioneer_123

# Response:
{
  "success": true,
  "data": {
    "status": "approved",
    "isApproved": true,
    "approvedSeasons": ["IPL_2024"]
  }
}
```

---

## 🎯 What's Next?

Now that you have the core system working:

1. **Add to Other Dashboards**
   - Copy LiveBiddingPanel to TeamRepDashboardPage
   - Copy to PlayerDashboardPage (view-only)
   - Copy to GuestDashboardPage (view-only)
   - Copy to AdminDashboardPage

2. **Add Admin UI**
   - Show pending auctioneers list
   - Add approve/reject buttons
   - Show all live bids
   - Add override controls

3. **Add Notifications**
   - Browser notifications for outbids
   - Sound effects for new bids
   - Toast messages for events

4. **Add Analytics**
   - Total bids per player
   - Average bid time
   - Most active team
   - Highest sale

5. **Add Replay**
   - Record entire auction
   - Playback feature
   - Highlight reels

---

## 🎉 You're Ready!

You now have a **professional-grade, real-time auction platform** ready to use!

Key features working:
- ✅ Auctioneer approval with blur screen
- ✅ Server-controlled live bidding
- ✅ Real-time WebSocket sync
- ✅ Budget validation
- ✅ Admin overrides

**Next step:** Run the demo scenario above and see it in action!

---

Need help? Check:
- [LIVE_BIDDING_IMPLEMENTATION.md](./LIVE_BIDDING_IMPLEMENTATION.md) - Full guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - How it works

**Happy Auctioning! 🔨**
