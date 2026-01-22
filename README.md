# 🏆 HypeHammer - Sports Auction Management Platform

A comprehensive **Role-Based Sports Auction Management System** built with React + TypeScript frontend and Flask + Firebase Firestore backend.

## 📋 Features

✅ **Multi-Role System** - Admin, Auctioneer, Team Rep, Player, Guest dashboards  
✅ **Real-time Auction Management** - Live bidding and player assignment  
✅ **Firebase Firestore Backend** - Cloud database with REST API  
✅ **AI-Powered Insights** - Gemini API integration for smart suggestions  
✅ **Complete CRUD Operations** - Full data management capabilities  
✅ **Responsive UI** - Beautiful, intuitive interface for all roles  
✅ **Audit Logging** - Complete activity tracking and history  

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ (for frontend)
- **Python** 3.8+ (for backend)
- **Firebase Project** with Firestore enabled
- **Service Account Key** (serviceAccountKey.json)

### 1. Setup Frontend

```bash
# Install dependencies
npm install

# Set environment variables
# Create .env.local and add your GEMINI_API_KEY
echo "VITE_GEMINI_API_KEY=your_gemini_key_here" > .env.local

# Start development server
npm run dev
```

Frontend runs at: `http://localhost:5173`

### 2. Setup Backend

See [server/SETUP_GUIDE.md](server/SETUP_GUIDE.md) for detailed backend setup.

```bash
# Navigate to server directory
cd server

# Install Python dependencies
pip install -r requirements.txt

# Start Flask backend
python app.py
```

Backend runs at: `http://localhost:5000/api`

### 3. Run Both Together

```bash
# From root directory
npm run start:all
```

---

## 📂 Project Structure

```
hype-hammer/
├── frontend files
│   ├── App.tsx                 # Main app component
│   ├── index.tsx              # Entry point
│   ├── types.ts               # TypeScript interfaces
│   ├── components/            # React components
│   │   ├── pages/             # Page components
│   │   ├── modals/            # Modal dialogs
│   │   └── ui/                # UI components
│   └── services/              # API services
│
├── server/                     # Flask backend
│   ├── app.py                 # Main Flask app
│   ├── requirements.txt        # Python dependencies
│   ├── SETUP_GUIDE.md         # Backend setup guide
│   ├── README_FLASK.md        # Backend documentation
│   ├── FIREBASE_SCHEMA.md     # Database schema & API docs
│   └── .env.example           # Environment variables template
│
├── public/                     # Static assets
├── serviceAccountKey.json      # Firebase service account (⚠️ keep secret)
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
├── package.json              # Project dependencies
└── PROJECT_DOCUMENTATION.md  # Complete project guide
```

---

## 🌐 API Documentation

### Backend API
- **Base URL**: `http://localhost:5000/api`
- **Documentation**: See [server/FIREBASE_SCHEMA.md](server/FIREBASE_SCHEMA.md)

### Key Endpoints

| Resource | GET | POST | PUT | DELETE |
|----------|-----|------|-----|--------|
| Users | `/api/users` | `/api/users` | `/api/users/{id}` | `/api/users/{id}` |
| Teams | `/api/teams` | `/api/teams` | `/api/teams/{id}` | `/api/teams/{id}` |
| Players | `/api/players` | `/api/players` | `/api/players/{id}` | `/api/players/{id}` |
| Auctions | `/api/auctions` | `/api/auctions` | `/api/auctions/{id}` | `/api/auctions/{id}` |
| Bids | `/api/bids` | `/api/bids` | — | — |

Complete API reference: [server/FIREBASE_SCHEMA.md](server/FIREBASE_SCHEMA.md)

---

## 🗄️ Database Schema

Uses **Firebase Cloud Firestore** with collections:

- **users** - User accounts (Admin, Auctioneer, Team Rep, Player, Guest)
- **teams** - Team information and rosters
- **players** - Player profiles and auction status
- **auctions** - Auction events and configurations
- **bids** - Bid transactions and history
- **matches** - Match/tournament data
- **auditLogs** - Activity tracking
- **appState** - Application state

See [server/FIREBASE_SCHEMA.md](server/FIREBASE_SCHEMA.md#-firestore-collections-schema) for detailed schema.

---

## 🎭 User Roles

### 👑 Admin
- Manage all users and auctions
- Monitor system analytics
- Configure sports and auction rules
- **Credentials**: `admin@hypehammer.com` / `admin123`

### 🎤 Auctioneer
- Control live auctions
- Manage bidding queue
- Track bid history
- **Credentials**: `auctioneer@hypehammer.com` / `auctioneer123`

### 🏏 Team Representative
- Place bids during auctions
- Manage team roster
- Track budget and spending
- **Credentials**: `teamrep@hypehammer.com` / `team123`

### 👤 Player
- View auction status
- Track personal details
- Check final results
- **Credentials**: `player@hypehammer.com` / `player123`

### 👀 Guest/Spectator
- View live auctions
- Monitor team standings
- Watch auction history
- **Credentials**: `guest@hypehammer.com` / `guest123`

---

## 🏅 Key Features

### Auction Management
- Create and configure auctions
- Add/remove players and teams
- Define auction rules and constraints
- Real-time status updates

### Live Bidding
- Real-time bid placement
- Budget validation
- Bid history tracking
- Automatic winner assignment

### Team Management
- Squad composition
- Budget tracking
- Player assignment
- Performance metrics

### Admin Dashboard
- User management
- Auction oversight
- System analytics
- Configuration control

---

## 🔧 Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Lucide React** - Icons
- **React Router** - Navigation

### Backend
- **Flask** - Python web framework
- **Firebase Admin SDK** - Database & auth
- **Cloud Firestore** - NoSQL database
- **Flask-CORS** - Cross-origin support

### AI/ML
- **Google Gemini API** - AI insights

---

## 📚 Documentation

### Project Documentation
- [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) - Complete project guide
- [ROLE_SYSTEM_GUIDE.md](ROLE_SYSTEM_GUIDE.md) - Role specifications
- [DEMO_USERS.md](DEMO_USERS.md) - Demo account credentials
- [STORAGE_SETUP.md](STORAGE_SETUP.md) - Storage configuration

### Backend Documentation
- [server/SETUP_GUIDE.md](server/SETUP_GUIDE.md) - Step-by-step setup
- [server/README_FLASK.md](server/README_FLASK.md) - Backend overview
- [server/FIREBASE_SCHEMA.md](server/FIREBASE_SCHEMA.md) - API & schema reference

---

## 🚀 Development Workflow

1. **Start Backend**
   ```bash
   cd server && python app.py
   ```

2. **Start Frontend**
   ```bash
   npm run dev
   ```

3. **Test API**
   ```bash
   curl http://localhost:5000/api/health
   ```

4. **Use Demo Credentials**
   - See [DEMO_USERS.md](DEMO_USERS.md) for test accounts

5. **Monitor Firestore**
   - Visit [Firebase Console](https://console.firebase.google.com)
   - Check collections and documents

---

## 🐛 Troubleshooting

### Backend Issues
- See [server/SETUP_GUIDE.md - Troubleshooting](server/SETUP_GUIDE.md#-troubleshooting)

### Frontend Issues
- Check Node.js version: `node --version`
- Clear cache: `npm cache clean --force`
- Reinstall: `rm -rf node_modules && npm install`

### API Connection Issues
- Verify backend is running: `curl http://localhost:5000/api/health`
- Check CORS settings in `server/app.py`
- Ensure serviceAccountKey.json is in root folder

### Firebase Issues
- Verify service account key is valid
- Check Firestore rules in Firebase Console
- Ensure Firestore database is created

---

## 📝 Environment Variables

### Frontend (.env.local)
```
VITE_GEMINI_API_KEY=your_gemini_key
```

### Backend (server/.env)
```
FLASK_ENV=development
FLASK_DEBUG=True
FLASK_PORT=5000
```

See [server/.env.example](server/.env.example) for more options.

---

## 🔐 Security Notes

⚠️ **Important**:
- Never commit `serviceAccountKey.json` to git
- Keep API keys private in environment variables
- Use Firebase Security Rules in production
- Implement JWT authentication for production
- Enable HTTPS for deployed instances

---

## 📊 Sample Data

To load sample data:

```bash
# Create auction with players (batch operation)
curl -X POST http://localhost:5000/api/batch/auction-with-players \
  -H "Content-Type: application/json" \
  -d @sample_auction.json
```

See [server/FIREBASE_SCHEMA.md](server/FIREBASE_SCHEMA.md#-batch-operations) for payload format.

---

## 🤝 Contributing

1. Follow the existing code structure
2. Add types for TypeScript code
3. Update documentation
4. Test API endpoints
5. Use meaningful commit messages

---

## 📄 License

This project is part of HypeHammer Sports Auction Platform.

---

## 📞 Support

For help and questions:
1. Check the documentation files
2. Review API endpoints: [server/FIREBASE_SCHEMA.md](server/FIREBASE_SCHEMA.md)
3. Check project structure: [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)
4. Review demo users: [DEMO_USERS.md](DEMO_USERS.md)

---

## ✅ Quick Verification

After setup, verify everything works:

```bash
# 1. Check frontend
npm run dev
# → Open http://localhost:5173

# 2. Check backend
cd server && python app.py
# → Check for "✓ Firebase Firestore initialized"

# 3. Test API
curl http://localhost:5000/api/health
# → Should return success: true

# 4. Create sample data
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","name":"Test","role":"PLAYER"}'
```

---

**Happy Auctioning! 🎉**

For detailed setup instructions, see [server/SETUP_GUIDE.md](server/SETUP_GUIDE.md)
