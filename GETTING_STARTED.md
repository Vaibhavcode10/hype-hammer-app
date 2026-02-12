# HypeHammer - Simple Getting Started Guide

## 🎯 What is HypeHammer?

A live sports auction platform where:
- Teams bid on players with real budgets
- Auctioneers run the show
- Everything happens in real-time

---

## 🚀 5-Minute Quick Start

### **Step 1: Open the App**
Visit: `http://localhost:5173` (or your deployed URL)

### **Step 2: Choose Your Path**

#### **Want to CREATE an auction?**
→ Click **"Organize Your Season"**
→ Fill 4 simple forms
→ You become the **Admin**

#### **Want to JOIN an existing auction?**
→ Click **"Explore Auctions"**
→ Pick a season
→ Choose your role (Auctioneer/Team/Player/Guest)

---

## 👥 5 User Types Explained

### 1. **Admin (Organizer)** 🏆
**What you do:** Create and manage the auction  
**First step:** Register with organization details  
**Main job:** Approve participants, configure rules, monitor auction

### 2. **Auctioneer** 🎤
**What you do:** Run the live bidding  
**First step:** Apply and wait for admin approval  
**Main job:** Select players, accept bids, confirm sales

### 3. **Team Rep** 💰
**What you do:** Bid for your team  
**First step:** Register your team  
**Main job:** Buy players within budget, build squad

### 4. **Player** ⚽
**What you do:** Get drafted by a team  
**First step:** Register with your sports profile  
**Main job:** Wait to be auctioned, track your status

### 5. **Guest** 👁️
**What you do:** Watch the auction  
**First step:** Quick registration  
**Main job:** Spectate, no bidding

---

## 📋 Complete Flow (Start to Finish)

```
1. ADMIN creates season
   ↓
2. PLAYERS, TEAMS, AUCTIONEERS register
   ↓
3. ADMIN approves everyone
   ↓
4. AUCTIONEER starts auction
   ↓
5. TEAMS bid on players
   ↓
6. AUCTIONEER confirms sales
   ↓
7. Repeat until all players sold
   ↓
8. ADMIN generates reports
```

---

## 🎬 How to Run a Complete Auction

### **Phase 1: Setup (Admin - 10 minutes)**

1. **Create Season:**
   - Home → "Organize Your Season"
   - Enter: Season name, sport, date, location
   - Set: Max teams (8), max players per team (15), budget per team (₹1 Cr)
   - Submit → Auto-redirected to Admin Dashboard

2. **Wait for Registrations:**
   - People register as players, teams, auctioneers
   - You see them in Admin Dashboard tabs

3. **Approve Participants:**
   - Admin Dashboard → "Players" tab
   - Review each player → Click "Approve" ✓
   - Admin Dashboard → "Teams" tab
   - Review each team → Click "Approve" ✓
   - Admin Dashboard → "Auctioneers" tab
   - Review auctioneer → Click "Approve" ✓

4. **Verify Everything:**
   - At least 8 teams ✓
   - At least 50 players ✓
   - At least 1 auctioneer ✓
   - All budgets correct ✓

---

### **Phase 2: Live Auction (Auctioneer - 2-3 hours)**

1. **Login as Auctioneer:**
   - Once admin approves you, you see approval message
   - Auctioneer Dashboard opens

2. **Review Player Queue:**
   - See all AVAILABLE players in left panel
   - They're sorted by registration order

3. **Start First Player:**
   - Click "Start Bidding" on Player #1
   - Player status → "LIVE"
   - Timer starts (60 seconds)

4. **Accept Bids:**
   - **Teams bid** from their dashboards
   - **OR you bid for them:**
     - Select team from right panel
     - Click "+1L" (₹1 lakh) or "+5L" (₹5 lakhs) or "+10L" (₹10 lakhs)
     - OR enter custom amount in "Current Bid" field
   - Each bid updates in real-time
   - Leading team highlighted in red

5. **Close Bidding:**
   - **Option A: SOLD**
     - When bidding stops, click "CONFIRM SALE"
     - Celebration animation plays 🎉
     - Player added to team
     - Team budget deducted
     - Next player auto-queued
   
   - **Option B: UNSOLD**
     - If no bids, click "MARK UNSOLD"
     - Player status → "UNSOLD"
     - Move to next player

6. **Repeat:**
   - Continue steps 3-5 for each player
   - Takes ~2-3 minutes per player
   - ~50 players = 2 hours

7. **Finish:**
   - When all players done, auction status → "ENDED"
   - Admin generates reports

---

### **Phase 3: Bidding (Team Rep - Throughout Auction)**

1. **Login as Team Rep:**
   - After admin approval, access Team Rep Dashboard
   - See your team budget: ₹1 Cr (or custom)

2. **Join Live Auction:**
   - Team Rep Dashboard → "Live Auction" button
   - OR click "Live Room" from main menu

3. **Watch Current Player:**
   - See player card with photo, stats, base price
   - Current bid shows in real-time
   - Timer counts down

4. **Place Bid:**
   - Click quick bid buttons:
     - "+1L" (adds ₹1 lakh to current bid)
     - "+5L" (adds ₹5 lakhs)
     - "+10L" (adds ₹10 lakhs)
   - OR enter custom amount → Press Enter
   - System validates your budget instantly
   - If you can't afford it, shows error

5. **Track Your Bids:**
   - See bid history in sidebar
   - Your team highlighted when leading
   - Get alerts if outbid

6. **Win or Lose:**
   - If you're leading when timer expires → YOU WIN! 🎉
   - Player added to your squad
   - Budget deducted automatically
   - If outbid → Better luck next player

---

## 💡 Key Features

### **Real-Time Everything:**
- Bids update instantly (< 1 second)
- All users see same data
- No page refresh needed
- Works across all dashboards

### **Smart Budget System:**
- Can't bid more than you have
- Can't bid less than current bid
- Auto-calculates remaining budget
- Shows budget before each bid

### **Auto-Progression:**
- After each sale, next player auto-queued
- Smooth transitions
- No manual navigation needed
- Keeps auction moving

### **Flexible Bidding:**
- Quick bid buttons for speed
- Custom amounts for strategy
- Auctioneer can bid for any team
- Teams can only bid for themselves

---

## 📊 Understanding The Dashboards

### **Admin Dashboard Tabs:**
```
[Overview]     - Stats at a glance
[Settings]     - Edit season config
[Players]      - Approve/edit players (ADD, REJECT, EDIT BASE PRICE)
[Teams]        - Approve/edit teams (ADD, REJECT, EDIT BUDGET)
[Auctioneers]  - Approve auctioneers (APPROVE, REJECT, VIEW DETAILS)
[Live Monitor] - Real-time auction view
[Live Room]    - Join auction as spectator
[Analytics]    - Charts and insights
[Reports]      - Export data
```

### **Auctioneer Dashboard Sections:**
```
LEFT:   Player queue (all available players)
MIDDLE: Current player card + controls
RIGHT:  Team bidding panel (place bids here)
BOTTOM: Bid history + system logs
TOP:    Auction controls (pause/resume/end)
```

### **Team Rep Dashboard Sections:**
```
TOP:    Team overview (budget, squad size)
LEFT:   Your squad (players you've bought)
MIDDLE: Live bidding interface
RIGHT:  Available players list
BOTTOM: Your bid history
```

### **Player Dashboard Sections:**
```
TOP:    Your profile card
MIDDLE: Auction status (Available/Live/Sold/Unsold)
BOTTOM: Bid history on you (if any)
RIGHT:  Edit profile button
```

---

## 🎯 Common Questions

### **Q: How do I create my first auction?**
A: Home → "Organize Your Season" → Fill 4 forms → Done!

### **Q: Do I need to approve everyone manually?**
A: Yes, admins must approve players, teams, and auctioneers for security.

### **Q: Can I bid as an auctioneer?**
A: Yes! You can place bids on behalf of ANY team. Teams can only bid for themselves.

### **Q: What happens if bidding times out?**
A: Timer expires → Leading team wins if there are bids. If no bids, mark unsold.

### **Q: Can I edit a player's base price?**
A: Yes, admin can edit from Admin Dashboard → Players tab → Edit button.

### **Q: How do I extend the timer?**
A: Auctioneer can click "Extend Timer" button (adds 10-30 seconds).

### **Q: What if someone disconnects?**
A: All data is in Firebase. Reconnect and continue. State is preserved.

### **Q: Can I undo a sale?**
A: No direct undo. Admin can manually reverse in database if needed (emergency only).

### **Q: How do I export results?**
A: Admin Dashboard → Reports tab → "Download CSV" or "Download PDF".

### **Q: Is it mobile-friendly?**
A: Yes! Works on phone, tablet, desktop. Bidding works everywhere.

---

## ⚠️ Common Mistakes to Avoid

1. **DON'T** start auction before approving participants
2. **DON'T** set team budget less than total player base prices
3. **DON'T** approve too many teams (8-10 is optimal)
4. **DON'T** forget to set player base prices (default may be 0)
5. **DON'T** refresh page during bidding (might lose connection briefly)
6. **DON'T** place bids exceeding your budget (system blocks it anyway)
7. **DO** test with a dummy player first
8. **DO** keep internet connection stable during auction
9. **DO** communicate with all participants before starting
10. **DO** have admin available during auction for issues

---

## 🔥 Pro Tips

### **For Admins:**
- Set realistic team budgets (₹1 Cr for 15 players = ₹6.6L average)
- Approve in batches (all players first, then teams)
- Keep backup player list in case someone drops
- Use Live Monitor to track auction progress
- Export reports immediately after auction ends

### **For Auctioneers:**
- Review player queue before starting
- Keep ~2 minutes per player pace
- Use quick bid buttons for speed
- Announce bids verbally (enhances experience)
- Mark unsold only after giving teams fair chance
- Use Live Room view for professional broadcast feel

### **For Team Reps:**
- Plan your strategy before auction starts
- Know which roles you need
- Set max price for each player mentally
- Don't bid early (drives price up)
- Save budget for key players
- Use custom bid to jump ahead strategically

### **For Players:**
- Set realistic base price (not too high)
- Fill complete profile (increases chances)
- Upload good photo (makes you visible)
- Be patient (might be auctioned later)
- Stay connected during auction

---

## 🎉 What Success Looks Like

### **Good Auction Metrics:**
- **95%+** players sold
- **Average bid time:** 90-120 seconds
- **Total auction time:** 2-3 hours for 50 players
- **Zero budget errors**
- **Zero system crashes**
- **All teams satisfied with squads**

### **After Auction:**
- Every team has 10-15 players
- Budgets are 80-100% spent
- Mix of expensive and cheap players
- All reports exported
- Players know their teams
- Ready for season start!

---

## 📞 Need Help?

### **Technical Issues:**
1. Check browser console (F12)
2. Verify Firebase connection
3. Clear cache and reload
4. Try different browser
5. Check API endpoint status

### **Auction Issues:**
1. Contact admin immediately
2. Use pause button if needed
3. Check system logs
4. Verify all users online
5. Restart player if stuck

### **Contact:**
- Check `services/socketService.ts` for connection
- Review `USER_GUIDE.md` for detailed docs
- See `QUICK_START_FLOWCHART.md` for visual flow

---

## 🎁 Quick Reference

### **URLs:**
```
Home:              /
Marketplace:       /marketplace
Admin Dashboard:   /admin/dashboard
Auctioneer:        /auctioneer/dashboard
Team Rep:          /team-rep/dashboard
Player:            /player/dashboard
Guest:             /guest/dashboard
```

### **Keyboard Shortcuts:**
```
ESC:        Close modal
ENTER:      Submit bid (in custom bid input)
F11:        Fullscreen mode
TAB:        Navigate between bid buttons
```

### **Bid Amounts:**
```
+1L  = ₹1,00,000   (1 Lakh)
+5L  = ₹5,00,000   (5 Lakhs)
+10L = ₹10,00,000  (10 Lakhs)
+20L = ₹20,00,000  (20 Lakhs)
1Cr  = ₹1,00,00,000 (1 Crore)
```

### **Status Indicators:**
```
🟢 LIVE      - Auction in progress
🟡 SETUP     - Preparing auction
🔴 PAUSED    - Temporarily stopped
⚫ ENDED     - Auction completed
```

---

## ✅ Pre-Launch Checklist

**24 Hours Before:**
- [ ] All participants registered
- [ ] Admin approved everyone
- [ ] Budgets configured
- [ ] Player base prices set
- [ ] Test auction completed
- [ ] Communication sent to all

**1 Hour Before:**
- [ ] All users have login credentials
- [ ] Auctioneer online and ready
- [ ] At least 6 team reps online
- [ ] Admin dashboard open
- [ ] Backup admin assigned
- [ ] Internet connections stable

**At Launch:**
- [ ] Admin gives go-ahead
- [ ] Auctioneer selects first player
- [ ] Clicks "Start Bidding"
- [ ] Teams start bidding
- [ ] Monitor everything in Live Monitor
- [ ] Celebrate first sale! 🎉

---

**You're Ready to Roll!** 🚀

Start with a small test auction (5 players, 3 teams) to get familiar, then scale up!
