# Setup Test Users

To create test users in the Firestore database, run the following command:

## Option 1: Using curl

```bash
curl -X POST https://us-central1-axilam.cloudfunctions.net/auction/debug/seed-users
```

## Option 2: Using PowerShell

```powershell
Invoke-WebRequest -Uri "https://us-central1-axilam.cloudfunctions.net/auction/debug/seed-users" -Method POST
```

## Option 3: From Browser Console

```javascript
fetch('https://us-central1-axilam.cloudfunctions.net/auction/debug/seed-users', {
  method: 'POST'
}).then(r => r.json()).then(d => console.log(d))
```

## Test User Credentials

Once seeded, use these credentials to login:

### Admin
- Email: `admin@test.com`
- Password: `admin123`
- Role: ADMIN

### Auctioneer (Already APPROVED)
- Email: `auctioneer@test.com`
- Password: `auctioneer123`
- Role: AUCTIONEER
- Status: APPROVED ✅

### Team Rep
- Email: `teamrep@test.com`
- Password: `teamrep123`
- Role: TEAM_REP

### Player
- Email: `player@test.com`
- Password: `player123`
- Role: PLAYER

## After Creating Test Users

1. Clear browser cache and localStorage
2. Go to http://localhost:5173 (or your app URL)
3. Click "Login"
4. Use any of the test credentials above
5. The app should now work without "Application Under Review" errors

## Troubleshooting

If you still see "Application Under Review" message:
- Clear browser cache completely (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+Shift+R)
- Check that the auctioneer was created with `approvalStatus: 'APPROVED'` in Firestore

To verify in Firebase Console:
1. Go to https://console.firebase.google.com
2. Select project "axilam"
3. Go to Firestore Database
4. Check `auctioneers` collection
5. Look for document with email `auctioneer@test.com`
6. Verify `approvalStatus` field equals "APPROVED" (not "PENDING")
