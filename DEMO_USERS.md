# 🔐 Demo User Credentials

Use these credentials to login and test different role dashboards.

---

## 👑 SUPER ADMIN / ORGANIZER

**Email:** `admin@hypehammer.com`  
**Password:** `admin123`  
**Role:** Super Admin  
**Access:** Full platform control, all seasons, all data

---

## 🎤 AUCTIONEER

**Email:** `auctioneer@hypehammer.com`  
**Password:** `auctioneer123`  
**Role:** Auctioneer  
**Access:** Live auction control, player queue management

---

## 🏏 TEAM REPRESENTATIVE

**Email:** `teamrep@hypehammer.com`  
**Password:** `team123`  
**Role:** Team Representative  
**Team:** Mumbai Warriors  
**Access:** Bidding, squad management, budget tracking

---

## 👤 PLAYER

**Email:** `player@hypehammer.com`  
**Password:** `player123`  
**Role:** Player  
**Player Name:** Virat Sharma  
**Access:** View auction status, track bids (read-only)

---

## 👀 GUEST

**Email:** `guest@hypehammer.com`  
**Password:** `guest123`  
**Role:** Guest  
**Access:** Watch live auctions, view summaries (read-only)

---

## 📝 Quick Login Steps

1. Go to HomePage
2. Click "Login" button in top bar
3. Enter email and password from above
4. Select the role from dropdown (or it auto-detects)
5. Click "Sign In"
6. You'll be redirected to the role-specific dashboard

---

## 🔄 To Reset/Re-seed Mock Data

1. Open browser console (F12)
2. Run: `localStorage.removeItem('hypehammer_users')`
3. Refresh the page
4. Mock users will be recreated automatically

---

## 📦 What's Stored

Mock users are stored in `localStorage` with key: `hypehammer_users`

Each user object contains:
- email
- password (in demo - DON'T do this in production!)
- role
- name
- Additional role-specific data (teamName, basePrice, etc.)

---

## ⚠️ Important Notes

- These are **DEMO CREDENTIALS ONLY**
- Passwords are stored in plain text for demo purposes
- In production, use proper authentication with hashed passwords
- All users are pre-approved and assigned to "Inter-College Cricket Championship 2026"
