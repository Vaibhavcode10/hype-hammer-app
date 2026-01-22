"""
HypeHammer Flask Backend with Firebase Firestore
Provides REST API endpoints for the React frontend
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
from functools import wraps
from datetime import datetime, timedelta
import os
import json
from typing import Dict, List, Any, Tuple, Optional
import uuid
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://localhost:5173", "http://localhost:*"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# ========================
# FIREBASE INITIALIZATION
# ========================

# Path to service account key (already in root folder)
SERVICE_ACCOUNT_KEY_PATH = os.path.join(
    os.path.dirname(__file__),
    '..',
    'serviceAccountKey.json'
)

# Initialize Firebase
try:
    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✓ Firebase Firestore initialized successfully")
except Exception as e:
    print(f"✗ Firebase initialization failed: {e}")
    raise

# ========================
# FIRESTORE SCHEMA DESIGN
# ========================
"""
Collections Structure:

1. users/
   - Stores user data (Admin, Auctioneer, Team Rep, Player, Guest)
   - Fields: email, role, name, phone, profilePhoto, createdAt, etc.
   - Role-specific fields: adminId, auctioneerId, teamId, playerId, etc.

2. teams/
   - Stores team information
   - Fields: name, logo, budget, remainingBudget, players[], ownerId, createdAt
   - Subcollection: teams/{teamId}/players

3. players/
   - Stores player information
   - Fields: name, basePrice, role, sport, status, nationality, city, etc.
   - Links to teams and auctions

4. auctions/
   - Stores auction events/matches
   - Fields: name, sport, type, status, totalBudget, config, createdAt, etc.
   - Subcollections: auctions/{auctionId}/players, auctions/{auctionId}/bids

5. bids/
   - Stores all bid transactions
   - Fields: playerId, teamId, amount, auctionId, timestamp, etc.

6. matches/
   - Stores match/tournament data
   - Fields: name, sport, date, place, auctionId, config, status

7. auctionConfig/
   - Stores reusable auction configurations
   - Fields: sport, type, squadSize, totalBudget, roles[], rules

8. appState/
   - Stores application state
   - Fields: currentSport, currentAuctionId, matchId
"""

# ========================
# UTILITY FUNCTIONS
# ========================

def generate_id(prefix: str = "") -> str:
    """Generate unique ID with optional prefix"""
    uid = uuid.uuid4().hex[:8]
    return f"{prefix}_{uid}" if prefix else uid


def serialize_firestore_doc(doc) -> Dict:
    """Convert Firestore document to JSON-serializable dict"""
    if hasattr(doc, 'to_dict'):
        data = doc.to_dict()
        data['id'] = doc.id
        return data
    return doc


def serialize_firestore_docs(docs: List) -> List[Dict]:
    """Convert list of Firestore documents to JSON-serializable list"""
    return [serialize_firestore_doc(doc) for doc in docs]


def error_response(message: str, status_code: int = 400) -> Tuple[Dict, int]:
    """Return standardized error response"""
    return {"error": message, "success": False}, status_code


def success_response(data: Any = None, message: str = "Success", status_code: int = 200) -> Tuple[Dict, int]:
    """Return standardized success response"""
    response = {"success": True, "message": message}
    if data is not None:
        response["data"] = data
    return response, status_code


# ========================
# ERROR HANDLERS
# ========================

@app.errorhandler(404)
def not_found(e):
    return error_response("Endpoint not found", 404)


@app.errorhandler(500)
def internal_error(e):
    return error_response("Internal server error", 500)


# ========================
# USER MANAGEMENT ROUTES
# ========================

@app.route('/api/users', methods=['GET'])
def get_users():
    """Get all users with optional filtering"""
    try:
        role = request.args.get('role')
        query = db.collection('users')
        
        if role:
            query = query.where('role', '==', role)
        
        docs = query.stream()
        users = serialize_firestore_docs(docs)
        
        return success_response(users, f"Retrieved {len(users)} users")
    except Exception as e:
        return error_response(f"Failed to retrieve users: {str(e)}")


@app.route('/api/users/<user_id>', methods=['GET'])
def get_user(user_id):
    """Get specific user by ID"""
    try:
        doc = db.collection('users').document(user_id).get()
        
        if not doc.exists:
            return error_response(f"User {user_id} not found", 404)
        
        user = serialize_firestore_doc(doc)
        return success_response(user, "User retrieved successfully")
    except Exception as e:
        return error_response(f"Failed to retrieve user: {str(e)}")


@app.route('/api/users', methods=['POST'])
def create_user():
    """Create a new user"""
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['email', 'name', 'role']
        if not all(field in data for field in required_fields):
            return error_response(f"Missing required fields: {required_fields}")
        
        # Check if email already exists
        existing = db.collection('users').where('email', '==', data['email']).stream()
        if list(existing):
            return error_response(f"Email {data['email']} already registered", 409)
        
        user_id = generate_id('user')
        user_data = {
            **data,
            'id': user_id,
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat(),
            'profileComplete': data.get('profileComplete', False),
            'isOAuthUser': data.get('isOAuthUser', False)
        }
        
        db.collection('users').document(user_id).set(user_data)
        
        return success_response(user_data, "User created successfully", 201)
    except Exception as e:
        return error_response(f"Failed to create user: {str(e)}")


@app.route('/api/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    """Update user information"""
    try:
        data = request.get_json()
        
        # Check if user exists
        user_ref = db.collection('users').document(user_id)
        if not user_ref.get().exists:
            return error_response(f"User {user_id} not found", 404)
        
        # Add update timestamp
        data['updatedAt'] = datetime.now().isoformat()
        
        user_ref.update(data)
        updated_doc = user_ref.get()
        
        return success_response(serialize_firestore_doc(updated_doc), "User updated successfully")
    except Exception as e:
        return error_response(f"Failed to update user: {str(e)}")


@app.route('/api/users/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Delete a user"""
    try:
        db.collection('users').document(user_id).delete()
        return success_response(None, "User deleted successfully")
    except Exception as e:
        return error_response(f"Failed to delete user: {str(e)}")


@app.route('/api/users/email/<email>', methods=['GET'])
def get_user_by_email(email):
    """Get user by email"""
    try:
        docs = db.collection('users').where('email', '==', email).stream()
        users = serialize_firestore_docs(docs)
        
        if not users:
            return error_response(f"User with email {email} not found", 404)
        
        return success_response(users[0], "User found")
    except Exception as e:
        return error_response(f"Failed to retrieve user: {str(e)}")


# ========================
# AUTHENTICATION ROUTES
# ========================

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user with email and password - checks all collections"""
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('password'):
            return error_response("Email and password required", 400)
        
        # Check all role-specific collections
        collections = ['auctioneers', 'teams', 'players', 'guests', 'users']
        
        for collection_name in collections:
            docs = db.collection(collection_name).where('email', '==', data['email']).stream()
            doc_list = list(docs)
            
            if doc_list:
                user_doc = doc_list[0]
                user_data = user_doc.to_dict()
                
                # Check password
                if user_data.get('password') != data['password']:
                    return error_response("Invalid email or password", 401)
                
                # Return user data (excluding password)
                response_data = {k: v for k, v in user_data.items() if k != 'password'}
                response_data['collection'] = collection_name  # Include which collection user is from
                
                return success_response({'user': response_data}, "Login successful")
        
        return error_response("Invalid email or password", 401)
    except Exception as e:
        return error_response(f"Login failed: {str(e)}")

# ========================
# REGISTRATION ROUTES
# ========================

@app.route('/api/register/auctioneer', methods=['POST'])
def register_auctioneer():
    """Register an auctioneer for a specific match"""
    try:
        data = request.get_json()
        
        required_fields = ['fullName', 'email', 'password', 'seasonId']
        if not all(field in data for field in required_fields):
            return error_response(f"Missing required fields: {required_fields}")
        
        # Check if email exists in any collection
        for collection in ['auctioneers', 'teams', 'players', 'guests']:
            existing = db.collection(collection).where('email', '==', data['email']).stream()
            if list(existing):
                return error_response(f"Email {data['email']} already registered", 409)
        
        # Create auctioneer
        user_id = generate_id('auctioneer')
        user_data = {
            'id': user_id,
            'name': data['fullName'],
            'email': data['email'],
            'password': data['password'],  # Store password (in production, hash this!)
            'phone': data.get('phone', ''),
            'role': 'AUCTIONEER',
            'auctioneerId': user_id,
            'matchId': data['seasonId'],
            'experienceLevel': data.get('experienceLevel', ''),
            'languages': data.get('languages', []),
            'previousAuctions': data.get('previousAuctions', ''),
            'availability': data.get('availability', 'Yes'),
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat(),
            'profileComplete': True
        }
        
        print(f"✅ Creating auctioneer: {user_id} - {data['email']}")
        db.collection('auctioneers').document(user_id).set(user_data)
        print(f"✅ Auctioneer registered successfully in Firebase")
        
        return success_response({'userId': user_id, 'auctioneerId': user_id}, "Auctioneer registered successfully", 201)
    except Exception as e:
        return error_response(f"Failed to register auctioneer: {str(e)}")


@app.route('/api/register/team', methods=['POST'])
def register_team():
    """Register a team representative and create team for a specific match"""
    try:
        data = request.get_json()
        
        required_fields = ['fullName', 'email', 'password', 'seasonId', 'teamName']
        if not all(field in data for field in required_fields):
            return error_response(f"Missing required fields: {required_fields}")
        
        # Check if email exists in any collection
        for collection in ['auctioneers', 'teams', 'players', 'guests']:
            existing = db.collection(collection).where('email', '==', data['email']).stream()
            if list(existing):
                return error_response(f"Email {data['email']} already registered", 409)
        
        # Create team with embedded owner data
        team_id = generate_id('team')
        team_data = {
            'id': team_id,
            'name': data['teamName'],
            'shortCode': data.get('teamShortCode', data['teamName'][:3].upper()),
            'logo': data.get('teamLogo', ''),
            'homeCity': data.get('homeCity', ''),
            'budget': 10000000,  # Default budget
            'remainingBudget': 10000000,
            'matchId': data['seasonId'],
            'players': [],
            # Owner/Representative data
            'ownerName': data['fullName'],
            'email': data['email'],
            'password': data['password'],
            'phone': data.get('phone', ''),
            'role': 'TEAM_REP',
            'roleInTeam': data.get('roleInTeam', ''),
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat(),
            'profileComplete': True
        }
        
        db.collection('teams').document(team_id).set(team_data)
        
        return success_response({
            'teamId': team_id
        }, "Team registered successfully", 201)
    except Exception as e:
        return error_response(f"Failed to register team: {str(e)}")


@app.route('/api/register/player', methods=['POST'])
def register_player():
    """Register a player for a specific match"""
    try:
        data = request.get_json()
        
        required_fields = ['fullName', 'email', 'password', 'seasonId', 'basePrice', 'playingRole']
        if not all(field in data for field in required_fields):
            return error_response(f"Missing required fields: {required_fields}")
        
        # Check if email exists in any collection
        for collection in ['auctioneers', 'teams', 'players', 'guests']:
            existing = db.collection(collection).where('email', '==', data['email']).stream()
            if list(existing):
                return error_response(f"Email {data['email']} already registered", 409)
        
        # Create player record with embedded user data
        player_id = generate_id('player')
        player_data = {
            'id': player_id,
            'name': data['fullName'],
            'email': data['email'],
            'password': data['password'],
            'phone': data.get('phone', ''),
            'role': 'PLAYER',
            'roleId': data.get('playingRole', ''),
            'basePrice': data['basePrice'],
            'isOverseas': data.get('isOverseas', False),
            'status': 'PENDING',
            'matchId': data['seasonId'],
            'age': data.get('age', 25),
            'nationality': data.get('nationality', ''),
            'dateOfBirth': data.get('dateOfBirth', ''),
            'gender': data.get('gender', ''),
            'battingStyle': data.get('battingStyle', ''),
            'bowlingStyle': data.get('bowlingStyle', ''),
            'experienceLevel': data.get('experienceLevel', ''),
            'previousTeams': data.get('previousTeams', ''),
            'playerCategory': data.get('playerCategory', ''),
            'availability': data.get('availability', 'Yes'),
            'imageUrl': data.get('imageUrl', ''),
            'bio': data.get('bio', ''),
            'stats': data.get('stats', ''),
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat(),
            'profileComplete': True
        }
        
        db.collection('players').document(player_id).set(player_data)
        
        return success_response({
            'playerId': player_id
        }, "Player registered successfully", 201)
    except Exception as e:
        return error_response(f"Failed to register player: {str(e)}")


@app.route('/api/register/guest', methods=['POST'])
def register_guest():
    """Register a guest for a specific match"""
    try:
        data = request.get_json()
        
        required_fields = ['fullName', 'email', 'password', 'seasonId']
        if not all(field in data for field in required_fields):
            return error_response(f"Missing required fields: {required_fields}")
        
        # Check if email exists in any collection
        for collection in ['auctioneers', 'teams', 'players', 'guests']:
            existing = db.collection(collection).where('email', '==', data['email']).stream()
            if list(existing):
                return error_response(f"Email {data['email']} already registered", 409)
        
        # Create guest
        user_id = generate_id('guest')
        user_data = {
            'id': user_id,
            'name': data['fullName'],
            'email': data['email'],
            'password': data['password'],  # Store password
            'phone': data.get('phone', ''),
            'role': 'GUEST',
            'matchId': data['seasonId'],
            'favoriteSport': data.get('favoriteSport', ''),
            'favoriteTeam': data.get('favoriteTeam', ''),
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat(),
            'profileComplete': True
        }
        
        db.collection('guests').document(user_id).set(user_data)
        
        return success_response({'guestId': user_id}, "Guest registered successfully", 201)
    except Exception as e:
        return error_response(f"Failed to register guest: {str(e)}")


# ========================
# TEAM MANAGEMENT ROUTES
# ========================

@app.route('/api/teams', methods=['GET'])
def get_teams():
    """Get all teams"""
    try:
        docs = db.collection('teams').stream()
        teams = serialize_firestore_docs(docs)
        
        return success_response(teams, f"Retrieved {len(teams)} teams")
    except Exception as e:
        return error_response(f"Failed to retrieve teams: {str(e)}")


@app.route('/api/teams/<team_id>', methods=['GET'])
def get_team(team_id):
    """Get specific team by ID"""
    try:
        doc = db.collection('teams').document(team_id).get()
        
        if not doc.exists:
            return error_response(f"Team {team_id} not found", 404)
        
        team = serialize_firestore_doc(doc)
        
        # Get team players
        players_docs = db.collection('teams').document(team_id).collection('players').stream()
        team['players'] = serialize_firestore_docs(players_docs)
        
        return success_response(team, "Team retrieved successfully")
    except Exception as e:
        return error_response(f"Failed to retrieve team: {str(e)}")


@app.route('/api/teams', methods=['POST'])
def create_team():
    """Create a new team"""
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['name', 'budget']
        if not all(field in data for field in required_fields):
            return error_response(f"Missing required fields: {required_fields}")
        
        team_id = generate_id('team')
        team_data = {
            **data,
            'id': team_id,
            'remainingBudget': data['budget'],
            'players': [],
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        
        db.collection('teams').document(team_id).set(team_data)
        
        return success_response(team_data, "Team created successfully", 201)
    except Exception as e:
        return error_response(f"Failed to create team: {str(e)}")


@app.route('/api/teams/<team_id>', methods=['PUT'])
def update_team(team_id):
    """Update team information"""
    try:
        data = request.get_json()
        
        # Check if team exists
        team_ref = db.collection('teams').document(team_id)
        if not team_ref.get().exists:
            return error_response(f"Team {team_id} not found", 404)
        
        data['updatedAt'] = datetime.now().isoformat()
        team_ref.update(data)
        updated_doc = team_ref.get()
        
        return success_response(serialize_firestore_doc(updated_doc), "Team updated successfully")
    except Exception as e:
        return error_response(f"Failed to update team: {str(e)}")


@app.route('/api/teams/<team_id>', methods=['DELETE'])
def delete_team(team_id):
    """Delete a team"""
    try:
        db.collection('teams').document(team_id).delete()
        return success_response(None, "Team deleted successfully")
    except Exception as e:
        return error_response(f"Failed to delete team: {str(e)}")


@app.route('/api/teams/<team_id>/budget', methods=['PUT'])
def update_team_budget(team_id):
    """Update team's remaining budget after a purchase"""
    try:
        data = request.get_json()
        amount = data.get('amount')
        
        if amount is None:
            return error_response("Missing 'amount' field")
        
        team_ref = db.collection('teams').document(team_id)
        team = team_ref.get()
        
        if not team.exists:
            return error_response(f"Team {team_id} not found", 404)
        
        current_budget = team.get('remainingBudget', 0)
        new_budget = current_budget - amount
        
        if new_budget < 0:
            return error_response("Insufficient budget", 400)
        
        team_ref.update({
            'remainingBudget': new_budget,
            'updatedAt': datetime.now().isoformat()
        })
        
        updated = team_ref.get()
        return success_response(serialize_firestore_doc(updated), "Budget updated successfully")
    except Exception as e:
        return error_response(f"Failed to update budget: {str(e)}")


# ========================
# PLAYER MANAGEMENT ROUTES
# ========================

@app.route('/api/players', methods=['GET'])
def get_players():
    """Get all players with optional filtering"""
    try:
        status = request.args.get('status')
        sport = request.args.get('sport')
        auction_id = request.args.get('auctionId')
        
        query = db.collection('players')
        
        if status:
            query = query.where('status', '==', status)
        if sport:
            query = query.where('sport', '==', sport)
        
        docs = query.stream()
        players = serialize_firestore_docs(docs)
        
        # Filter by auction if specified
        if auction_id:
            players = [p for p in players if p.get('auctionId') == auction_id]
        
        return success_response(players, f"Retrieved {len(players)} players")
    except Exception as e:
        return error_response(f"Failed to retrieve players: {str(e)}")


@app.route('/api/players/<player_id>', methods=['GET'])
def get_player(player_id):
    """Get specific player by ID"""
    try:
        doc = db.collection('players').document(player_id).get()
        
        if not doc.exists:
            return error_response(f"Player {player_id} not found", 404)
        
        player = serialize_firestore_doc(doc)
        return success_response(player, "Player retrieved successfully")
    except Exception as e:
        return error_response(f"Failed to retrieve player: {str(e)}")


@app.route('/api/players', methods=['POST'])
def create_player():
    """Create a new player"""
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['name', 'basePrice', 'sport']
        if not all(field in data for field in required_fields):
            return error_response(f"Missing required fields: {required_fields}")
        
        player_id = generate_id('player')
        player_data = {
            **data,
            'id': player_id,
            'status': data.get('status', 'UNSOLD'),
            'isOverseas': data.get('isOverseas', False),
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        
        db.collection('players').document(player_id).set(player_data)
        
        return success_response(player_data, "Player created successfully", 201)
    except Exception as e:
        return error_response(f"Failed to create player: {str(e)}")


@app.route('/api/players/<player_id>', methods=['PUT'])
def update_player(player_id):
    """Update player information"""
    try:
        data = request.get_json()
        
        # Check if player exists
        player_ref = db.collection('players').document(player_id)
        if not player_ref.get().exists:
            return error_response(f"Player {player_id} not found", 404)
        
        data['updatedAt'] = datetime.now().isoformat()
        player_ref.update(data)
        updated_doc = player_ref.get()
        
        return success_response(serialize_firestore_doc(updated_doc), "Player updated successfully")
    except Exception as e:
        return error_response(f"Failed to update player: {str(e)}")


@app.route('/api/players/<player_id>', methods=['DELETE'])
def delete_player(player_id):
    """Delete a player"""
    try:
        db.collection('players').document(player_id).delete()
        return success_response(None, "Player deleted successfully")
    except Exception as e:
        return error_response(f"Failed to delete player: {str(e)}")


@app.route('/api/players/<player_id>/sell', methods=['POST'])
def sell_player(player_id):
    """Mark player as sold to a team"""
    try:
        data = request.get_json()
        team_id = data.get('teamId')
        sold_price = data.get('soldPrice')
        
        if not team_id or sold_price is None:
            return error_response("Missing 'teamId' or 'soldPrice'")
        
        player_ref = db.collection('players').document(player_id)
        player = player_ref.get()
        
        if not player.exists:
            return error_response(f"Player {player_id} not found", 404)
        
        # Update player
        player_ref.update({
            'status': 'SOLD',
            'teamId': team_id,
            'soldPrice': sold_price,
            'updatedAt': datetime.now().isoformat()
        })
        
        # Update team's remaining budget
        team_ref = db.collection('teams').document(team_id)
        team = team_ref.get()
        if team.exists:
            current_budget = team.get('remainingBudget', 0)
            team_ref.update({
                'remainingBudget': max(0, current_budget - sold_price),
                'updatedAt': datetime.now().isoformat()
            })
        
        updated = player_ref.get()
        return success_response(serialize_firestore_doc(updated), "Player sold successfully")
    except Exception as e:
        return error_response(f"Failed to sell player: {str(e)}")


# ========================
# AUCTION MANAGEMENT ROUTES
# ========================

@app.route('/api/auctions', methods=['GET'])
def get_auctions():
    """Get all auctions with optional filtering"""
    try:
        status = request.args.get('status')
        sport = request.args.get('sport')
        
        query = db.collection('auctions')
        
        if status:
            query = query.where('status', '==', status)
        if sport:
            query = query.where('sport', '==', sport)
        
        docs = query.stream()
        auctions = serialize_firestore_docs(docs)
        
        return success_response(auctions, f"Retrieved {len(auctions)} auctions")
    except Exception as e:
        return error_response(f"Failed to retrieve auctions: {str(e)}")


@app.route('/api/auctions/<auction_id>', methods=['GET'])
def get_auction(auction_id):
    """Get specific auction by ID"""
    try:
        doc = db.collection('auctions').document(auction_id).get()
        
        if not doc.exists:
            return error_response(f"Auction {auction_id} not found", 404)
        
        auction = serialize_firestore_doc(doc)
        
        # Get auction players
        players_docs = db.collection('auctions').document(auction_id).collection('players').stream()
        auction['players'] = serialize_firestore_docs(players_docs)
        
        # Get bids
        bids_docs = db.collection('auctions').document(auction_id).collection('bids').stream()
        auction['bids'] = serialize_firestore_docs(bids_docs)
        
        return success_response(auction, "Auction retrieved successfully")
    except Exception as e:
        return error_response(f"Failed to retrieve auction: {str(e)}")


@app.route('/api/auctions', methods=['POST'])
def create_auction():
    """Create a new auction"""
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['name', 'sport', 'type', 'totalBudget', 'config']
        if not all(field in data for field in required_fields):
            return error_response(f"Missing required fields: {required_fields}")
        
        auction_id = generate_id('auction')
        auction_data = {
            **data,
            'id': auction_id,
            'status': data.get('status', 'SETUP'),
            'players': [],
            'teams': [],
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        
        db.collection('auctions').document(auction_id).set(auction_data)
        
        return success_response(auction_data, "Auction created successfully", 201)
    except Exception as e:
        return error_response(f"Failed to create auction: {str(e)}")


@app.route('/api/auctions/<auction_id>', methods=['PUT'])
def update_auction(auction_id):
    """Update auction information"""
    try:
        data = request.get_json()
        
        # Check if auction exists
        auction_ref = db.collection('auctions').document(auction_id)
        if not auction_ref.get().exists:
            return error_response(f"Auction {auction_id} not found", 404)
        
        data['updatedAt'] = datetime.now().isoformat()
        auction_ref.update(data)
        updated_doc = auction_ref.get()
        
        return success_response(serialize_firestore_doc(updated_doc), "Auction updated successfully")
    except Exception as e:
        return error_response(f"Failed to update auction: {str(e)}")


@app.route('/api/auctions/<auction_id>/status', methods=['PUT'])
def update_auction_status(auction_id):
    """Update auction status (SETUP, ONGOING, COMPLETED, PAUSED, etc.)"""
    try:
        data = request.get_json()
        status = data.get('status')
        
        valid_statuses = ['SETUP', 'ONGOING', 'COMPLETED', 'PAUSED', 'LIVE', 'READY', 'ENDED']
        if status not in valid_statuses:
            return error_response(f"Invalid status. Valid: {valid_statuses}")
        
        auction_ref = db.collection('auctions').document(auction_id)
        if not auction_ref.get().exists:
            return error_response(f"Auction {auction_id} not found", 404)
        
        auction_ref.update({
            'status': status,
            'updatedAt': datetime.now().isoformat()
        })
        
        updated = auction_ref.get()
        return success_response(serialize_firestore_doc(updated), "Auction status updated successfully")
    except Exception as e:
        return error_response(f"Failed to update auction status: {str(e)}")


@app.route('/api/auctions/<auction_id>', methods=['DELETE'])
def delete_auction(auction_id):
    """Delete an auction"""
    try:
        db.collection('auctions').document(auction_id).delete()
        return success_response(None, "Auction deleted successfully")
    except Exception as e:
        return error_response(f"Failed to delete auction: {str(e)}")


# ========================
# BID MANAGEMENT ROUTES
# ========================

@app.route('/api/bids', methods=['GET'])
def get_bids():
    """Get all bids with optional filtering"""
    try:
        auction_id = request.args.get('auctionId')
        team_id = request.args.get('teamId')
        player_id = request.args.get('playerId')
        
        query = db.collection('bids')
        
        if auction_id:
            query = query.where('auctionId', '==', auction_id)
        if team_id:
            query = query.where('teamId', '==', team_id)
        if player_id:
            query = query.where('playerId', '==', player_id)
        
        docs = query.stream()
        bids = serialize_firestore_docs(docs)
        
        return success_response(bids, f"Retrieved {len(bids)} bids")
    except Exception as e:
        return error_response(f"Failed to retrieve bids: {str(e)}")


@app.route('/api/bids/<bid_id>', methods=['GET'])
def get_bid(bid_id):
    """Get specific bid by ID"""
    try:
        doc = db.collection('bids').document(bid_id).get()
        
        if not doc.exists:
            return error_response(f"Bid {bid_id} not found", 404)
        
        bid = serialize_firestore_doc(doc)
        return success_response(bid, "Bid retrieved successfully")
    except Exception as e:
        return error_response(f"Failed to retrieve bid: {str(e)}")


@app.route('/api/bids', methods=['POST'])
def create_bid():
    """Create a new bid"""
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['playerId', 'teamId', 'amount', 'auctionId']
        if not all(field in data for field in required_fields):
            return error_response(f"Missing required fields: {required_fields}")
        
        bid_id = generate_id('bid')
        bid_data = {
            **data,
            'id': bid_id,
            'timestamp': datetime.now().isoformat()
        }
        
        db.collection('bids').document(bid_id).set(bid_data)
        
        return success_response(bid_data, "Bid created successfully", 201)
    except Exception as e:
        return error_response(f"Failed to create bid: {str(e)}")


@app.route('/api/bids/<auction_id>/highest/<player_id>', methods=['GET'])
def get_highest_bid(auction_id, player_id):
    """Get highest bid for a player in an auction"""
    try:
        docs = db.collection('bids')\
            .where('auctionId', '==', auction_id)\
            .where('playerId', '==', player_id)\
            .order_by('amount', direction=firestore.Query.DESCENDING)\
            .limit(1)\
            .stream()
        
        bids = serialize_firestore_docs(docs)
        
        if not bids:
            return error_response(f"No bids found for player {player_id}", 404)
        
        return success_response(bids[0], "Highest bid retrieved successfully")
    except Exception as e:
        return error_response(f"Failed to retrieve highest bid: {str(e)}")


@app.route('/api/bids/<auction_id>/player/<player_id>/history', methods=['GET'])
def get_bid_history(auction_id, player_id):
    """Get bid history for a player in an auction"""
    try:
        docs = db.collection('bids')\
            .where('auctionId', '==', auction_id)\
            .where('playerId', '==', player_id)\
            .order_by('timestamp', direction=firestore.Query.DESCENDING)\
            .stream()
        
        bids = serialize_firestore_docs(docs)
        
        return success_response(bids, f"Retrieved {len(bids)} bids")
    except Exception as e:
        return error_response(f"Failed to retrieve bid history: {str(e)}")


# ========================
# MATCH/TOURNAMENT ROUTES
# ========================

@app.route('/api/matches', methods=['GET'])
def get_matches():
    """Get all matches/tournaments with optional filtering"""
    try:
        sport = request.args.get('sport')
        status = request.args.get('status')
        
        query = db.collection('matches')
        
        if sport:
            query = query.where('sport', '==', sport)
        if status:
            query = query.where('status', '==', status)
        
        docs = query.stream()
        matches = serialize_firestore_docs(docs)
        
        return success_response(matches, f"Retrieved {len(matches)} matches")
    except Exception as e:
        return error_response(f"Failed to retrieve matches: {str(e)}")


@app.route('/api/matches/<match_id>', methods=['GET'])
def get_match(match_id):
    """Get specific match by ID"""
    try:
        doc = db.collection('matches').document(match_id).get()
        
        if not doc.exists:
            return error_response(f"Match {match_id} not found", 404)
        
        match = serialize_firestore_doc(doc)
        return success_response(match, "Match retrieved successfully")
    except Exception as e:
        return error_response(f"Failed to retrieve match: {str(e)}")


@app.route('/api/matches', methods=['POST'])
def create_match():
    """Create a new match/tournament"""
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['name', 'sport', 'auctionId']
        if not all(field in data for field in required_fields):
            return error_response(f"Missing required fields: {required_fields}")
        
        match_id = generate_id('match')
        match_data = {
            **data,
            'id': match_id,
            'status': data.get('status', 'SETUP'),
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        
        db.collection('matches').document(match_id).set(match_data)
        
        return success_response(match_data, "Match created successfully", 201)
    except Exception as e:
        return error_response(f"Failed to create match: {str(e)}")


@app.route('/api/matches/<match_id>', methods=['PUT'])
def update_match(match_id):
    """Update match information"""
    try:
        data = request.get_json()
        
        # Check if match exists
        match_ref = db.collection('matches').document(match_id)
        if not match_ref.get().exists:
            return error_response(f"Match {match_id} not found", 404)
        
        data['updatedAt'] = datetime.now().isoformat()
        match_ref.update(data)
        updated_doc = match_ref.get()
        
        return success_response(serialize_firestore_doc(updated_doc), "Match updated successfully")
    except Exception as e:
        return error_response(f"Failed to update match: {str(e)}")


@app.route('/api/matches/<match_id>', methods=['DELETE'])
def delete_match(match_id):
    """Delete a match"""
    try:
        db.collection('matches').document(match_id).delete()
        return success_response(None, "Match deleted successfully")
    except Exception as e:
        return error_response(f"Failed to delete match: {str(e)}")


# ========================
# APP STATE MANAGEMENT
# ========================

@app.route('/api/state', methods=['GET'])
def get_app_state():
    """Get current application state"""
    try:
        doc = db.collection('appState').document('current').get()
        
        if not doc.exists:
            # Return default state
            default_state = {
                'currentSport': None,
                'currentAuctionId': None,
                'currentMatchId': None
            }
            return success_response(default_state, "Default app state")
        
        state = serialize_firestore_doc(doc)
        return success_response(state, "App state retrieved successfully")
    except Exception as e:
        return error_response(f"Failed to retrieve app state: {str(e)}")


@app.route('/api/state', methods=['POST'])
def update_app_state():
    """Update application state"""
    try:
        data = request.get_json()
        
        state_data = {
            **data,
            'updatedAt': datetime.now().isoformat()
        }
        
        db.collection('appState').document('current').set(state_data, merge=True)
        
        return success_response(state_data, "App state updated successfully")
    except Exception as e:
        return error_response(f"Failed to update app state: {str(e)}")


# ========================
# SPORTS DATA ROUTES
# ========================

@app.route('/api/sports', methods=['GET'])
def get_all_sports():
    """Get all sports data aggregated from Firestore"""
    try:
        sports_data = []
        
        # Get all matches with their associated players and teams
        matches_docs = db.collection('matches').stream()
        
        for match_doc in matches_docs:
            match_data = serialize_firestore_doc(match_doc)
            
            # Get players for this match
            players_docs = db.collection('players').where('matchId', '==', match_doc.id).stream()
            players = [serialize_firestore_doc(p) for p in players_docs]
            
            # Get teams for this match
            teams_docs = db.collection('teams').where('matchId', '==', match_doc.id).stream()
            teams = [serialize_firestore_doc(t) for t in teams_docs]
            
            # Add players and teams to match data
            match_data['players'] = players
            match_data['teams'] = teams
            match_data['history'] = []  # TODO: fetch from history collection if needed
            
            # Group by sport
            sport_type = match_data.get('sport', 'CUSTOM')
            
            # Find or create sport entry
            sport_entry = next((s for s in sports_data if s.get('sportType') == sport_type), None)
            if not sport_entry:
                sport_entry = {
                    'sportType': sport_type,
                    'matches': []
                }
                sports_data.append(sport_entry)
            
            sport_entry['matches'].append(match_data)
        
        return success_response(sports_data, "Sports data retrieved successfully")
    except Exception as e:
        return error_response(f"Failed to retrieve sports data: {str(e)}")


@app.route('/api/sports', methods=['POST'])
def save_all_sports():
    """Save all sports data to Firestore"""
    try:
        data = request.get_json()
        
        # Process each sport's matches, players, and teams
        for sport_data in data:
            sport_type = sport_data.get('sportType', 'CUSTOM')
            
            for match in sport_data.get('matches', []):
                match_id = match.get('id')
                
                # Save match
                match_to_save = {k: v for k, v in match.items() if k not in ['players', 'teams', 'history']}
                match_to_save['sport'] = sport_type
                match_to_save['updatedAt'] = datetime.now().isoformat()
                
                db.collection('matches').document(match_id).set(match_to_save, merge=True)
                
                # Save players
                for player in match.get('players', []):
                    player_id = player.get('id')
                    player_to_save = {**player, 'matchId': match_id, 'updatedAt': datetime.now().isoformat()}
                    db.collection('players').document(player_id).set(player_to_save, merge=True)
                
                # Save teams
                for team in match.get('teams', []):
                    team_id = team.get('id')
                    team_to_save = {**team, 'matchId': match_id, 'updatedAt': datetime.now().isoformat()}
                    db.collection('teams').document(team_id).set(team_to_save, merge=True)
        
        return success_response({"saved": True}, "Sports data saved successfully")
    except Exception as e:
        return error_response(f"Failed to save sports data: {str(e)}")


# ========================
# AUDIT LOG ROUTES
# ========================

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Get audit logs with optional filtering"""
    try:
        user_id = request.args.get('userId')
        action = request.args.get('action')
        limit = int(request.args.get('limit', 50))
        
        query = db.collection('auditLogs')
        
        if user_id:
            query = query.where('userId', '==', user_id)
        if action:
            query = query.where('action', '==', action)
        
        docs = query.order_by('timestamp', direction=firestore.Query.DESCENDING)\
                   .limit(limit)\
                   .stream()
        
        logs = serialize_firestore_docs(docs)
        
        return success_response(logs, f"Retrieved {len(logs)} logs")
    except Exception as e:
        return error_response(f"Failed to retrieve logs: {str(e)}")


@app.route('/api/logs', methods=['POST'])
def create_log():
    """Create an audit log entry"""
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['userId', 'action']
        if not all(field in data for field in required_fields):
            return error_response(f"Missing required fields: {required_fields}")
        
        log_id = generate_id('log')
        log_data = {
            **data,
            'id': log_id,
            'timestamp': datetime.now().isoformat()
        }
        
        db.collection('auditLogs').document(log_id).set(log_data)
        
        return success_response(log_data, "Log entry created successfully", 201)
    except Exception as e:
        return error_response(f"Failed to create log: {str(e)}")


# ========================
# HEALTH CHECK & INITIALIZATION
# ========================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test Firestore connection
        db.collection('healthCheck').document('test').set({'timestamp': datetime.now().isoformat()})
        return success_response({"status": "healthy", "firebase": "connected"}, "Server is healthy")
    except Exception as e:
        return error_response(f"Health check failed: {str(e)}", 503)


@app.route('/api/init', methods=['POST'])
def initialize_app():
    """Initialize application with sample data"""
    try:
        # This endpoint can be used to set up initial collections and documents
        # Currently just returns success
        return success_response({"initialized": True}, "App initialized successfully")
    except Exception as e:
        return error_response(f"Initialization failed: {str(e)}")


# ========================
# BATCH OPERATIONS
# ========================

@app.route('/api/batch/auction-with-players', methods=['POST'])
def create_auction_with_players():
    """Create an auction and add players in batch"""
    try:
        data = request.get_json()
        
        auction_data = data.get('auction')
        players_data = data.get('players', [])
        
        if not auction_data:
            return error_response("Missing 'auction' data")
        
        # Create auction
        auction_id = generate_id('auction')
        full_auction_data = {
            **auction_data,
            'id': auction_id,
            'status': auction_data.get('status', 'SETUP'),
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        
        batch = db.batch()
        
        # Add auction
        auction_ref = db.collection('auctions').document(auction_id)
        batch.set(auction_ref, full_auction_data)
        
        # Add players
        for player in players_data:
            player_id = generate_id('player')
            full_player_data = {
                **player,
                'id': player_id,
                'auctionId': auction_id,
                'status': player.get('status', 'UNSOLD'),
                'createdAt': datetime.now().isoformat()
            }
            player_ref = db.collection('players').document(player_id)
            batch.set(player_ref, full_player_data)
        
        batch.commit()
        
        return success_response({
            'auctionId': auction_id,
            'playersAdded': len(players_data)
        }, "Auction with players created successfully", 201)
    except Exception as e:
        return error_response(f"Failed to create auction with players: {str(e)}")


# ========================
# ROOT ENDPOINT
# ========================

@app.route('/api', methods=['GET'])
def api_info():
    """API information and available endpoints"""
    endpoints = {
        "health": "/api/health",
        "users": {
            "get_all": "GET /api/users",
            "get_by_id": "GET /api/users/<user_id>",
            "get_by_email": "GET /api/users/email/<email>",
            "create": "POST /api/users",
            "update": "PUT /api/users/<user_id>",
            "delete": "DELETE /api/users/<user_id>"
        },
        "teams": {
            "get_all": "GET /api/teams",
            "get_by_id": "GET /api/teams/<team_id>",
            "create": "POST /api/teams",
            "update": "PUT /api/teams/<team_id>",
            "delete": "DELETE /api/teams/<team_id>",
            "update_budget": "PUT /api/teams/<team_id>/budget"
        },
        "players": {
            "get_all": "GET /api/players",
            "get_by_id": "GET /api/players/<player_id>",
            "create": "POST /api/players",
            "update": "PUT /api/players/<player_id>",
            "delete": "DELETE /api/players/<player_id>",
            "sell_player": "POST /api/players/<player_id>/sell"
        },
        "auctions": {
            "get_all": "GET /api/auctions",
            "get_by_id": "GET /api/auctions/<auction_id>",
            "create": "POST /api/auctions",
            "update": "PUT /api/auctions/<auction_id>",
            "update_status": "PUT /api/auctions/<auction_id>/status",
            "delete": "DELETE /api/auctions/<auction_id>"
        },
        "bids": {
            "get_all": "GET /api/bids",
            "get_by_id": "GET /api/bids/<bid_id>",
            "create": "POST /api/bids",
            "highest_bid": "GET /api/bids/<auction_id>/highest/<player_id>",
            "bid_history": "GET /api/bids/<auction_id>/player/<player_id>/history"
        },
        "matches": {
            "get_all": "GET /api/matches",
            "get_by_id": "GET /api/matches/<match_id>",
            "create": "POST /api/matches",
            "update": "PUT /api/matches/<match_id>",
            "delete": "DELETE /api/matches/<match_id>"
        },
        "state": {
            "get": "GET /api/state",
            "update": "POST /api/state"
        },
        "sports": {
            "get_all": "GET /api/sports",
            "save_all": "POST /api/sports"
        },
        "logs": {
            "get_all": "GET /api/logs",
            "create": "POST /api/logs"
        },
        "batch_operations": {
            "create_auction_with_players": "POST /api/batch/auction-with-players"
        }
    }
    
    return {
        "name": "HypeHammer Flask API",
        "version": "1.0.0",
        "description": "REST API for HypeHammer Sports Auction Platform",
        "firebase": "Connected to Cloud Firestore",
        "endpoints": endpoints
    }


# ========================
# MAIN
# ========================

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )
