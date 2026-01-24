"""
HypeHammer Flask Backend with Firebase Firestore
Provides REST API endpoints for the React frontend
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import firebase_admin
from firebase_admin import credentials, firestore
from functools import wraps
from datetime import datetime, timedelta
import os
import json
from typing import Dict, List, Any, Tuple, Optional
import uuid
from dotenv import load_dotenv
import threading
import time

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://localhost:5173", "http://localhost:*"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Initialize SocketIO with CORS
socketio = SocketIO(app, cors_allowed_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:*"])

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
        
        print(f"🔐 Login attempt for email: {data['email']}")
        
        # Check all role-specific collections including matches (for organizers)
        collections = ['auctioneers', 'teams', 'players', 'guests', 'matches']
        
        for collection_name in collections:
            print(f"   Checking collection: {collection_name}")
            docs = db.collection(collection_name).where('email', '==', data['email']).stream()
            doc_list = list(docs)
            
            if doc_list:
                print(f"   ✅ Found user in {collection_name}")
                user_doc = doc_list[0]
                user_data = user_doc.to_dict()
                
                # Debug: Print what we found
                print(f"   User data keys: {user_data.keys()}")
                print(f"   Has password field: {'password' in user_data}")
                print(f"   Password matches: {user_data.get('password') == data['password']}")
                
                # Check password
                if user_data.get('password') != data['password']:
                    print(f"   ❌ Password mismatch!")
                    return error_response("Invalid email or password", 401)
                
                print(f"   ✅ Login successful!")
                # Return user data (excluding password)
                response_data = {k: v for k, v in user_data.items() if k != 'password'}
                response_data['collection'] = collection_name  # Include which collection user is from
                
                # If from matches collection, set role to ADMIN (organizer)
                if collection_name == 'matches' and 'role' not in response_data:
                    response_data['role'] = 'ADMIN'
                
                return success_response({'user': response_data}, "Login successful")
        
        print(f"   ❌ User not found in any collection")
        return error_response("Invalid email or password", 401)
    except Exception as e:
        print(f"   ❌ Login error: {str(e)}")
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
        
        # Check if email exists in any collection (including matches for organizers)
        for collection in ['auctioneers', 'teams', 'players', 'guests', 'matches']:
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
        
        # Check if email exists in any collection (including matches for organizers)
        for collection in ['auctioneers', 'teams', 'players', 'guests', 'matches']:
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
        
        # Check if email exists in any collection (including matches for organizers)
        for collection in ['auctioneers', 'teams', 'players', 'guests', 'matches']:
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
            'imageUrl': data.get('imageUrl', ''),  # Firebase Storage download URL
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
        
        # Check if email exists in any collection (including matches for organizers)
        for collection in ['auctioneers', 'teams', 'players', 'guests', 'matches']:
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
    """Get all teams, optionally filtered by matchId"""
    try:
        match_id = request.args.get('matchId')
        
        if match_id:
            # Filter teams by matchId
            docs = db.collection('teams').where('matchId', '==', match_id).stream()
        else:
            # Get all teams if no filter
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
        match_id = request.args.get('matchId')
        email = request.args.get('email')
        
        query = db.collection('players')
        
        if status:
            query = query.where('status', '==', status)
        if sport:
            query = query.where('sport', '==', sport)
        if email:
            query = query.where('email', '==', email)
        if match_id:
            query = query.where('matchId', '==', match_id)
        
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
        player_doc = player_ref.get()
        if not player_doc.exists:
            return error_response(f"Player {player_id} not found", 404)
        
        player_data = serialize_firestore_doc(player_doc)
        
        data['updatedAt'] = datetime.now().isoformat()
        player_ref.update(data)
        updated_doc = player_ref.get()
        updated_player = serialize_firestore_doc(updated_doc)
        
        # Broadcast player update to all connected clients in the season room
        match_id = player_data.get('matchId')
        if match_id:
            socketio.emit('PLAYER_UPDATED', {
                'playerId': player_id,
                'player': updated_player,
                'timestamp': datetime.now().isoformat()
            }, room=f'season_{match_id}')
        
        return success_response(updated_player, "Player updated successfully")
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
    """Delete a match and all associated data (cascade delete)"""
    try:
        # Delete the match
        db.collection('matches').document(match_id).delete()
        
        # CASCADE DELETE: Delete all players for this match
        players_query = db.collection('players').where('matchId', '==', match_id).stream()
        for player_doc in players_query:
            player_doc.reference.delete()
        
        # CASCADE DELETE: Delete all teams for this match
        teams_query = db.collection('teams').where('matchId', '==', match_id).stream()
        for team_doc in teams_query:
            team_doc.reference.delete()
        
        # CASCADE DELETE: Delete all auctioneers for this match
        auctioneers_query = db.collection('auctioneers').where('matchId', '==', match_id).stream()
        for auctioneer_doc in auctioneers_query:
            auctioneer_doc.reference.delete()
        
        # CASCADE DELETE: Delete all guests for this match
        guests_query = db.collection('guests').where('matchId', '==', match_id).stream()
        for guest_doc in guests_query:
            guest_doc.reference.delete()
        
        # CASCADE DELETE: Delete all bids for this match
        bids_query = db.collection('bids').where('matchId', '==', match_id).stream()
        for bid_doc in bids_query:
            bid_doc.reference.delete()
        
        # CASCADE DELETE: Delete auction state for this match
        auction_state_ref = db.collection('auction_states').document(match_id)
        if auction_state_ref.get().exists:
            auction_state_ref.delete()
        
        # CASCADE DELETE: Delete auctioneer assignments for this match
        assignments_query = db.collection('auctioneer_assignments').where('matchId', '==', match_id).stream()
        for assignment_doc in assignments_query:
            assignment_doc.reference.delete()
        
        return success_response(None, "Match and all associated data deleted successfully")
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
                
                # Save match (include organizer credentials if present)
                # Exclude nested arrays and prevent duplicate fields
                match_to_save = {k: v for k, v in match.items() if k not in ['players', 'teams', 'history']}
                match_to_save['sport'] = sport_type
                match_to_save['updatedAt'] = datetime.now().isoformat()
                
                # Normalize organizer credentials (avoid duplicates)
                if 'organizerEmail' in match_to_save:
                    match_to_save['email'] = match_to_save['organizerEmail']
                    del match_to_save['organizerEmail']
                if 'organizerPassword' in match_to_save:
                    match_to_save['password'] = match_to_save['organizerPassword']
                    del match_to_save['organizerPassword']
                if 'organizerName' in match_to_save:
                    match_to_save['organizerName'] = match_to_save['organizerName']
                
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
# AUCTIONEER APPROVAL & ASSIGNMENT
# ========================

@app.route('/api/auctioneer/assignments', methods=['GET'])
def get_auctioneer_assignments():
    """Get all auctioneer assignments with status"""
    try:
        season_id = request.args.get('seasonId')
        query = db.collection('auctioneer_assignments')
        
        if season_id:
            query = query.where('seasonId', '==', season_id)
        
        docs = query.stream()
        assignments = serialize_firestore_docs(docs)
        
        return success_response(assignments, f"Retrieved {len(assignments)} assignments")
    except Exception as e:
        return error_response(f"Failed to retrieve assignments: {str(e)}")


@app.route('/api/auctioneer/approve', methods=['POST'])
def approve_auctioneer():
    """Admin approves auctioneer for a season - ONLY ONE PER SEASON"""
    try:
        data = request.get_json()
        
        required_fields = ['auctioneerId', 'seasonId', 'adminId']
        if not all(field in data for field in required_fields):
            return error_response(f"Missing required fields: {required_fields}")
        
        auctioneer_id = data['auctioneerId']
        season_id = data['seasonId']
        admin_id = data['adminId']
        
        # Check if there's already an approved auctioneer for this season
        existing = db.collection('auctioneer_assignments')\
            .where('seasonId', '==', season_id)\
            .where('status', '==', 'approved')\
            .stream()
        
        existing_list = list(existing)
        if existing_list:
            return error_response(
                f"Season {season_id} already has an approved auctioneer. Only one auctioneer per season allowed.",
                409
            )
        
        # Check if auctioneer exists
        auctioneer_doc = db.collection('auctioneers').document(auctioneer_id).get()
        if not auctioneer_doc.exists:
            return error_response(f"Auctioneer {auctioneer_id} not found", 404)
        
        # Create or update assignment
        assignment_id = f"{season_id}_{auctioneer_id}"
        assignment_data = {
            'id': assignment_id,
            'auctioneerId': auctioneer_id,
            'seasonId': season_id,
            'status': 'approved',
            'approvedBy': admin_id,
            'approvedAt': datetime.now().isoformat(),
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        
        db.collection('auctioneer_assignments').document(assignment_id).set(assignment_data)
        
        # Update auctioneer status
        db.collection('auctioneers').document(auctioneer_id).update({
            'status': 'approved',
            'approvedAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        })
        
        # Emit real-time event to notify auctioneer
        socketio.emit('AUCTIONEER_APPROVED', {
            'auctioneerId': auctioneer_id,
            'seasonId': season_id,
            'message': 'Your application has been approved! You can now access the auction dashboard.'
        }, room=f'user_{auctioneer_id}')
        
        return success_response(assignment_data, "Auctioneer approved successfully")
    except Exception as e:
        return error_response(f"Failed to approve auctioneer: {str(e)}")


@app.route('/api/auctioneer/reject', methods=['POST'])
def reject_auctioneer():
    """Admin rejects auctioneer application"""
    try:
        data = request.get_json()
        
        required_fields = ['auctioneerId', 'seasonId', 'adminId']
        if not all(field in data for field in required_fields):
            return error_response(f"Missing required fields: {required_fields}")
        
        auctioneer_id = data['auctioneerId']
        season_id = data['seasonId']
        reason = data.get('reason', 'Application not approved')
        
        # Update auctioneer status
        db.collection('auctioneers').document(auctioneer_id).update({
            'status': 'rejected',
            'rejectedAt': datetime.now().isoformat(),
            'rejectionReason': reason,
            'updatedAt': datetime.now().isoformat()
        })
        
        # Emit real-time event
        socketio.emit('AUCTIONEER_REJECTED', {
            'auctioneerId': auctioneer_id,
            'seasonId': season_id,
            'reason': reason
        }, room=f'user_{auctioneer_id}')
        
        return success_response(None, "Auctioneer application rejected")
    except Exception as e:
        return error_response(f"Failed to reject auctioneer: {str(e)}")


@app.route('/api/auctioneers', methods=['GET'])
def get_auctioneers():
    """Get auctioneers, optionally filtered by email"""
    try:
        email = request.args.get('email')
        
        if email:
            # Query by email
            auctioneers_query = db.collection('auctioneers').where('email', '==', email).stream()
            auctioneers = [serialize_firestore_doc(a) for a in auctioneers_query]
            return success_response(auctioneers, "Auctioneers retrieved")
        else:
            # Get all auctioneers
            auctioneers = db.collection('auctioneers').stream()
            auctioneers_list = [serialize_firestore_doc(a) for a in auctioneers]
            return success_response(auctioneers_list, "All auctioneers retrieved")
    except Exception as e:
        return error_response(f"Failed to get auctioneers: {str(e)}")


@app.route('/api/auctioneer/status/<auctioneer_id>', methods=['GET'])
def get_auctioneer_status(auctioneer_id):
    """Get auctioneer approval status"""
    try:
        doc = db.collection('auctioneers').document(auctioneer_id).get()
        
        if not doc.exists:
            return error_response(f"Auctioneer {auctioneer_id} not found", 404)
        
        auctioneer = serialize_firestore_doc(doc)
        status = auctioneer.get('status', 'pending')
        
        # Check if approved for any season
        assignments = db.collection('auctioneer_assignments')\
            .where('auctioneerId', '==', auctioneer_id)\
            .where('status', '==', 'approved')\
            .stream()
        
        approved_seasons = [serialize_firestore_doc(a) for a in assignments]
        
        return success_response({
            'status': status,
            'auctioneer': auctioneer,
            'approvedSeasons': approved_seasons,
            'isApproved': status == 'approved'
        }, "Status retrieved")
    except Exception as e:
        return error_response(f"Failed to get status: {str(e)}")


# ========================
# LIVE AUCTION STATE MANAGEMENT
# ========================

# Global auction state (in-memory, synced with Firestore)
auction_state = {}

def get_auction_state(season_id: str) -> Dict:
    """Get current auction state from Firestore"""
    try:
        doc = db.collection('auction_states').document(season_id).get()
        if doc.exists:
            return serialize_firestore_doc(doc)
        return None
    except Exception as e:
        print(f"Error getting auction state: {e}")
        return None


def update_auction_state(season_id: str, updates: Dict):
    """Update auction state in Firestore and broadcast"""
    try:
        updates['updatedAt'] = datetime.now().isoformat()
        db.collection('auction_states').document(season_id).set(updates, merge=True)
        
        # Broadcast to all connected clients in this season room
        socketio.emit('AUCTION_STATE_UPDATE', updates, room=f'season_{season_id}')
        
        return True
    except Exception as e:
        print(f"Error updating auction state: {e}")
        return False


@app.route('/api/auction/state/<season_id>', methods=['GET'])
def get_auction_state_api(season_id):
    """Get current auction state"""
    try:
        state = get_auction_state(season_id)
        if not state:
            return error_response("Auction state not found", 404)
        return success_response(state, "Auction state retrieved")
    except Exception as e:
        return error_response(f"Failed to get auction state: {str(e)}")


@app.route('/api/auction/initialize', methods=['POST'])
def initialize_auction():
    """Initialize auction state for a season - Admin only"""
    try:
        data = request.get_json()
        
        required_fields = ['seasonId', 'startTime', 'endTime']
        if not all(field in data for field in required_fields):
            return error_response(f"Missing required fields: {required_fields}")
        
        season_id = data['seasonId']
        
        # Check if auctioneer is approved
        assignments = db.collection('auctioneer_assignments')\
            .where('seasonId', '==', season_id)\
            .where('status', '==', 'approved')\
            .stream()
        
        approved_list = list(assignments)
        if not approved_list:
            return error_response("No approved auctioneer for this season. Cannot start auction.", 400)
        
        auction_state_data = {
            'id': season_id,
            'seasonId': season_id,
            'status': 'READY',  # READY, LIVE, PAUSED, ENDED
            'startTime': data['startTime'],
            'endTime': data['endTime'],
            'currentPlayerId': None,
            'currentBid': 0,
            'leadingTeamId': None,
            'biddingActive': False,
            'playerQueue': data.get('playerQueue', []),
            'completedPlayers': [],
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        
        db.collection('auction_states').document(season_id).set(auction_state_data)
        
        # Broadcast to all dashboards
        socketio.emit('AUCTION_INITIALIZED', auction_state_data, room=f'season_{season_id}')
        
        return success_response(auction_state_data, "Auction initialized successfully")
    except Exception as e:
        return error_response(f"Failed to initialize auction: {str(e)}")


@app.route('/api/auction/start', methods=['POST'])
def start_auction():
    """Start the auction - Auctioneer or Admin only"""
    try:
        data = request.get_json()
        season_id = data.get('seasonId')
        
        if not season_id:
            return error_response("seasonId required")
        
        state = get_auction_state(season_id)
        if not state:
            return error_response("Auction not initialized", 400)
        
        if state['status'] == 'LIVE':
            return error_response("Auction already live", 400)
        
        updates = {
            'status': 'LIVE',
            'startedAt': datetime.now().isoformat()
        }
        
        update_auction_state(season_id, updates)
        
        # Broadcast to all dashboards
        socketio.emit('AUCTION_STARTED', {
            'seasonId': season_id,
            'message': 'Auction is now LIVE!',
            'timestamp': datetime.now().isoformat()
        }, room=f'season_{season_id}')
        
        # Start server timer
        start_auction_timer(season_id)
        
        return success_response(None, "Auction started successfully")
    except Exception as e:
        return error_response(f"Failed to start auction: {str(e)}")


@app.route('/api/auction/pause', methods=['POST'])
def pause_auction():
    """Pause the auction - Admin or Auctioneer"""
    try:
        data = request.get_json()
        season_id = data.get('seasonId')
        
        updates = {
            'status': 'PAUSED',
            'pausedAt': datetime.now().isoformat()
        }
        
        update_auction_state(season_id, updates)
        
        socketio.emit('AUCTION_PAUSED', {
            'seasonId': season_id,
            'timestamp': datetime.now().isoformat()
        }, room=f'season_{season_id}')
        
        return success_response(None, "Auction paused")
    except Exception as e:
        return error_response(f"Failed to pause auction: {str(e)}")


@app.route('/api/auction/resume', methods=['POST'])
def resume_auction():
    """Resume paused auction"""
    try:
        data = request.get_json()
        season_id = data.get('seasonId')
        
        updates = {
            'status': 'LIVE',
            'resumedAt': datetime.now().isoformat()
        }
        
        update_auction_state(season_id, updates)
        
        socketio.emit('AUCTION_RESUMED', {
            'seasonId': season_id,
            'timestamp': datetime.now().isoformat()
        }, room=f'season_{season_id}')
        
        return success_response(None, "Auction resumed")
    except Exception as e:
        return error_response(f"Failed to resume auction: {str(e)}")


@app.route('/api/auction/end', methods=['POST'])
def end_auction():
    """End the auction - Admin only"""
    try:
        data = request.get_json()
        season_id = data.get('seasonId')
        
        updates = {
            'status': 'ENDED',
            'endedAt': datetime.now().isoformat()
        }
        
        update_auction_state(season_id, updates)
        
        socketio.emit('AUCTION_ENDED', {
            'seasonId': season_id,
            'timestamp': datetime.now().isoformat()
        }, room=f'season_{season_id}')
        
        return success_response(None, "Auction ended")
    except Exception as e:
        return error_response(f"Failed to end auction: {str(e)}")


# ========================
# LIVE BIDDING SYSTEM
# ========================

@app.route('/api/auction/player/start', methods=['POST'])
def start_player_bidding():
    """Auctioneer starts bidding for a player"""
    try:
        data = request.get_json()
        
        required_fields = ['seasonId', 'playerId', 'basePrice']
        if not all(field in data for field in required_fields):
            return error_response(f"Missing required fields: {required_fields}")
        
        season_id = data['seasonId']
        player_id = data['playerId']
        base_price = data['basePrice']
        
        # Get player details
        player_doc = db.collection('players').document(player_id).get()
        if not player_doc.exists:
            return error_response("Player not found", 404)
        
        player = serialize_firestore_doc(player_doc)
        
        updates = {
            'currentPlayerId': player_id,
            'currentPlayerName': player.get('name', 'Unknown'),
            'currentBid': base_price,
            'leadingTeamId': None,
            'leadingTeamName': None,
            'biddingActive': True,
            'bidStartTime': datetime.now().isoformat(),
            'bidHistory': []
        }
        
        update_auction_state(season_id, updates)
        
        # Broadcast to all dashboards
        socketio.emit('PLAYER_BIDDING_STARTED', {
            'seasonId': season_id,
            'player': player,
            'basePrice': base_price,
            'timestamp': datetime.now().isoformat()
        }, room=f'season_{season_id}')
        
        return success_response(None, "Player bidding started")
    except Exception as e:
        return error_response(f"Failed to start player bidding: {str(e)}")


@app.route('/api/auction/bid', methods=['POST'])
def place_bid():
    """Team Rep places a bid - SERVER VALIDATES"""
    try:
        data = request.get_json()
        
        required_fields = ['seasonId', 'teamId', 'amount']
        if not all(field in data for field in required_fields):
            return error_response(f"Missing required fields: {required_fields}")
        
        season_id = data['seasonId']
        team_id = data['teamId']
        amount = data['amount']
        
        # Get current auction state
        state = get_auction_state(season_id)
        if not state:
            return error_response("Auction state not found", 404)
        
        # Validate auction is live
        if state['status'] != 'LIVE':
            return error_response("Auction is not live", 400)
        
        # Validate bidding is active
        if not state.get('biddingActive'):
            return error_response("No player is currently up for bidding", 400)
        
        # Validate bid amount
        current_bid = state.get('currentBid', 0)
        if amount <= current_bid:
            return error_response(f"Bid must be higher than current bid of {current_bid}", 400)
        
        # Get team details
        team_doc = db.collection('teams').document(team_id).get()
        if not team_doc.exists:
            return error_response("Team not found", 404)
        
        team = serialize_firestore_doc(team_doc)
        
        # Validate team has enough budget
        remaining_budget = team.get('remainingBudget', 0)
        if amount > remaining_budget:
            return error_response(f"Insufficient budget. Remaining: {remaining_budget}", 400)
        
        # Update auction state with new bid
        bid_history = state.get('bidHistory', [])
        bid_history.append({
            'teamId': team_id,
            'teamName': team.get('name', 'Unknown'),
            'amount': amount,
            'timestamp': datetime.now().isoformat()
        })
        
        updates = {
            'currentBid': amount,
            'leadingTeamId': team_id,
            'leadingTeamName': team.get('name', 'Unknown'),
            'bidHistory': bid_history,
            'lastBidTime': datetime.now().isoformat()
        }
        
        update_auction_state(season_id, updates)
        
        # Save bid to bids collection
        bid_id = generate_id('bid')
        bid_data = {
            'id': bid_id,
            'seasonId': season_id,
            'playerId': state['currentPlayerId'],
            'teamId': team_id,
            'teamName': team.get('name'),
            'amount': amount,
            'timestamp': datetime.now().isoformat()
        }
        db.collection('bids').document(bid_id).set(bid_data)
        
        # Broadcast to ALL dashboards - EVERYONE SEES SAME BID
        socketio.emit('NEW_BID', {
            'seasonId': season_id,
            'playerId': state['currentPlayerId'],
            'teamId': team_id,
            'teamName': team.get('name'),
            'amount': amount,
            'timestamp': datetime.now().isoformat()
        }, room=f'season_{season_id}')
        
        return success_response(None, "Bid placed successfully")
    except Exception as e:
        return error_response(f"Failed to place bid: {str(e)}")


@app.route('/api/auction/player/close', methods=['POST'])
def close_player_bidding():
    """Auctioneer closes bidding for current player"""
    try:
        data = request.get_json()
        
        required_fields = ['seasonId', 'sold']
        if not all(field in data for field in required_fields):
            return error_response(f"Missing required fields: {required_fields}")
        
        season_id = data['seasonId']
        sold = data['sold']  # True if sold, False if unsold
        
        state = get_auction_state(season_id)
        if not state:
            return error_response("Auction state not found", 404)
        
        player_id = state.get('currentPlayerId')
        if not player_id:
            return error_response("No player currently up for bidding", 400)
        
        final_amount = state.get('currentBid', 0)
        winning_team_id = state.get('leadingTeamId')
        
        result_data = {
            'playerId': player_id,
            'playerName': state.get('currentPlayerName'),
            'sold': sold,
            'finalAmount': final_amount if sold else 0,
            'teamId': winning_team_id if sold else None,
            'teamName': state.get('leadingTeamName') if sold else None,
            'timestamp': datetime.now().isoformat()
        }
        
        if sold and winning_team_id:
            # Update player status
            db.collection('players').document(player_id).update({
                'status': 'SOLD',
                'soldTo': winning_team_id,
                'soldAmount': final_amount,
                'soldAt': datetime.now().isoformat()
            })
            
            # Update team budget and roster
            team_doc = db.collection('teams').document(winning_team_id).get()
            if team_doc.exists:
                team = serialize_firestore_doc(team_doc)
                new_budget = team.get('remainingBudget', 0) - final_amount
                players_list = team.get('players', [])
                players_list.append(player_id)
                
                db.collection('teams').document(winning_team_id).update({
                    'remainingBudget': new_budget,
                    'players': players_list,
                    'updatedAt': datetime.now().isoformat()
                })
        else:
            # Mark player as unsold
            db.collection('players').document(player_id).update({
                'status': 'UNSOLD',
                'updatedAt': datetime.now().isoformat()
            })
        
        # Update auction state
        completed = state.get('completedPlayers', [])
        completed.append(player_id)
        
        updates = {
            'currentPlayerId': None,
            'currentPlayerName': None,
            'currentBid': 0,
            'leadingTeamId': None,
            'leadingTeamName': None,
            'biddingActive': False,
            'completedPlayers': completed,
            'bidHistory': []
        }
        
        update_auction_state(season_id, updates)
        
        # Broadcast to all dashboards
        event_name = 'PLAYER_SOLD' if sold else 'PLAYER_UNSOLD'
        socketio.emit(event_name, result_data, room=f'season_{season_id}')
        
        return success_response(result_data, "Player bidding closed")
    except Exception as e:
        return error_response(f"Failed to close bidding: {str(e)}")


# ========================
# SERVER-CONTROLLED TIMER
# ========================

active_timers = {}

def auction_timer_thread(season_id: str, end_time_str: str):
    """Background thread that broadcasts timer updates"""
    try:
        end_time = datetime.fromisoformat(end_time_str)
        
        while season_id in active_timers:
            state = get_auction_state(season_id)
            if not state or state['status'] not in ['LIVE', 'READY']:
                break
            
            now = datetime.now()
            remaining = (end_time - now).total_seconds()
            
            if remaining <= 0:
                # Auction time ended
                update_auction_state(season_id, {'status': 'ENDED'})
                socketio.emit('AUCTION_TIME_ENDED', {
                    'seasonId': season_id,
                    'timestamp': now.isoformat()
                }, room=f'season_{season_id}')
                break
            
            # Broadcast timer update every second
            socketio.emit('AUCTION_TIMER_UPDATE', {
                'seasonId': season_id,
                'remainingSeconds': int(remaining),
                'serverTime': now.isoformat()
            }, room=f'season_{season_id}')
            
            time.sleep(1)
        
    except Exception as e:
        print(f"Timer thread error: {e}")
    finally:
        if season_id in active_timers:
            del active_timers[season_id]


def start_auction_timer(season_id: str):
    """Start the server-controlled timer"""
    state = get_auction_state(season_id)
    if not state or not state.get('endTime'):
        return False
    
    # Stop existing timer if any
    if season_id in active_timers:
        active_timers[season_id] = False
        time.sleep(1)
    
    # Start new timer thread
    active_timers[season_id] = True
    timer_thread = threading.Thread(
        target=auction_timer_thread,
        args=(season_id, state['endTime']),
        daemon=True
    )
    timer_thread.start()
    return True


# ========================
# WEBSOCKET EVENT HANDLERS
# ========================

@socketio.on('connect')
def handle_connect():
    """Client connected"""
    print(f'Client connected: {request.sid}')
    emit('connection_response', {'status': 'connected', 'message': 'Connected to HypeHammer server'})


@socketio.on('disconnect')
def handle_disconnect():
    """Client disconnected"""
    print(f'Client disconnected: {request.sid}')


@socketio.on('join_season')
def handle_join_season(data):
    """Join a season room to receive real-time updates"""
    season_id = data.get('seasonId')
    user_id = data.get('userId')
    role = data.get('role')
    
    if not season_id:
        emit('error', {'message': 'seasonId required'})
        return
    
    join_room(f'season_{season_id}')
    
    # Also join user-specific room for personal notifications
    if user_id:
        join_room(f'user_{user_id}')
    
    print(f'User {user_id} ({role}) joined season_{season_id}')
    
    # Send current auction state
    state = get_auction_state(season_id)
    if state:
        emit('AUCTION_STATE_UPDATE', state)
    
    emit('joined_season', {
        'seasonId': season_id,
        'message': f'Joined season {season_id} successfully'
    })


@socketio.on('leave_season')
def handle_leave_season(data):
    """Leave a season room"""
    season_id = data.get('seasonId')
    if season_id:
        leave_room(f'season_{season_id}')
        print(f'Client left season_{season_id}')


# ========================
# WEBRTC AUDIO SIGNALING
# ========================

# Track active auctioneer audio sessions
active_audio_sessions = {}

@socketio.on('auctioneer_audio_start')
def handle_auctioneer_audio_start(data):
    """Auctioneer starts audio streaming"""
    season_id = data.get('seasonId')
    user_id = data.get('userId')
    
    if not season_id or not user_id:
        emit('error', {'message': 'seasonId and userId required'})
        return
    
    # Store active session
    active_audio_sessions[season_id] = {
        'auctioneerId': user_id,
        'socketId': request.sid,
        'startTime': datetime.now().isoformat(),
        'muted': False
    }
    
    print(f'🎙️ Auctioneer {user_id} started audio for season {season_id}')
    
    # Notify all listeners in the room
    socketio.emit('auctioneer_audio_started', {
        'seasonId': season_id,
        'auctioneerId': user_id
    }, room=f'season_{season_id}')


@socketio.on('auctioneer_audio_stop')
def handle_auctioneer_audio_stop(data):
    """Auctioneer stops audio streaming"""
    season_id = data.get('seasonId')
    user_id = data.get('userId')
    
    if season_id in active_audio_sessions:
        del active_audio_sessions[season_id]
    
    print(f'🎙️ Auctioneer {user_id} stopped audio for season {season_id}')
    
    # Notify all listeners
    socketio.emit('auctioneer_audio_stopped', {
        'seasonId': season_id,
        'auctioneerId': user_id
    }, room=f'season_{season_id}')


@socketio.on('auctioneer_audio_mute')
def handle_auctioneer_audio_mute(data):
    """Auctioneer mutes/unmutes"""
    season_id = data.get('seasonId')
    user_id = data.get('userId')
    muted = data.get('muted', False)
    
    if season_id in active_audio_sessions:
        active_audio_sessions[season_id]['muted'] = muted
    
    print(f'🎙️ Auctioneer {user_id} {"muted" if muted else "unmuted"}')
    
    # Notify all listeners
    socketio.emit('auctioneer_audio_muted', {
        'seasonId': season_id,
        'auctioneerId': user_id,
        'muted': muted
    }, room=f'season_{season_id}')


@socketio.on('audio_listener_join')
def handle_audio_listener_join(data):
    """Listener joins to receive audio"""
    season_id = data.get('seasonId')
    user_id = data.get('userId')
    
    if not season_id or not user_id:
        emit('error', {'message': 'seasonId and userId required'})
        return
    
    # Check if auctioneer is streaming
    if season_id not in active_audio_sessions:
        emit('error', {'message': 'No active audio stream'})
        return
    
    session = active_audio_sessions[season_id]
    
    print(f'📻 Listener {user_id} joining audio for season {season_id}')
    
    # Notify auctioneer of new listener
    socketio.emit('audio_listener_joined', {
        'listenerId': user_id,
        'socketId': request.sid
    }, room=session['socketId'])


@socketio.on('audio_offer')
def handle_audio_offer(data):
    """Forward WebRTC offer from auctioneer to listener"""
    season_id = data.get('seasonId')
    to = data.get('to')
    offer = data.get('offer')
    
    if not all([season_id, to, offer]):
        emit('error', {'message': 'Missing required fields'})
        return
    
    # Forward to specific listener
    socketio.emit('audio_offer', {
        'from': request.sid,
        'offer': offer
    }, room=f'user_{to}')


@socketio.on('audio_answer')
def handle_audio_answer(data):
    """Forward WebRTC answer from listener to auctioneer"""
    season_id = data.get('seasonId')
    to = data.get('to')
    answer = data.get('answer')
    
    if not all([season_id, to, answer]):
        emit('error', {'message': 'Missing required fields'})
        return
    
    # Forward to auctioneer
    socketio.emit('audio_answer', {
        'from': request.sid,
        'answer': answer
    }, room=to)


@socketio.on('audio_ice_candidate')
def handle_audio_ice_candidate(data):
    """Forward ICE candidate between peers"""
    season_id = data.get('seasonId')
    to = data.get('to')
    candidate = data.get('candidate')
    
    if not all([season_id, to, candidate]):
        emit('error', {'message': 'Missing required fields'})
        return
    
    # Check if sending to user or socket
    if to.startswith('user_'):
        room = to
    else:
        room = to
    
    # Forward ICE candidate
    event_name = 'audio_ice_candidate_auctioneer' if 'auctioneer' in str(data.get('from', '')) else 'audio_ice_candidate_listener'
    socketio.emit(event_name, {
        'from': request.sid,
        'candidate': candidate
    }, room=room)


@socketio.on('audio_check_status')
def handle_audio_check_status(data):
    """Check if auctioneer is currently streaming"""
    season_id = data.get('seasonId')
    
    if season_id in active_audio_sessions:
        session = active_audio_sessions[season_id]
        emit('auctioneer_audio_started', {
            'seasonId': season_id,
            'auctioneerId': session['auctioneerId'],
            'muted': session.get('muted', False)
        })
    else:
        emit('audio_status', {
            'seasonId': season_id,
            'streaming': False
        })


# ========================
# ADMIN OVERRIDE CONTROLS
# ========================

@app.route('/api/admin/override/close-bidding', methods=['POST'])
def admin_force_close():
    """Admin force closes current bidding"""
    return close_player_bidding()


@app.route('/api/admin/override/extend-timer', methods=['POST'])
def admin_extend_timer():
    """Admin extends auction timer"""
    try:
        data = request.get_json()
        season_id = data.get('seasonId')
        additional_minutes = data.get('minutes', 10)
        
        state = get_auction_state(season_id)
        if not state:
            return error_response("Auction not found", 404)
        
        current_end = datetime.fromisoformat(state['endTime'])
        new_end = current_end + timedelta(minutes=additional_minutes)
        
        updates = {
            'endTime': new_end.isoformat()
        }
        
        update_auction_state(season_id, updates)
        
        socketio.emit('TIMER_EXTENDED', {
            'seasonId': season_id,
            'newEndTime': new_end.isoformat(),
            'addedMinutes': additional_minutes
        }, room=f'season_{season_id}')
        
        return success_response(None, f"Timer extended by {additional_minutes} minutes")
    except Exception as e:
        return error_response(f"Failed to extend timer: {str(e)}")


@app.route('/api/admin/override/replace-auctioneer', methods=['POST'])
def admin_replace_auctioneer():
    """Admin replaces current auctioneer (emergency)"""
    try:
        data = request.get_json()
        season_id = data.get('seasonId')
        old_auctioneer_id = data.get('oldAuctioneerId')
        new_auctioneer_id = data.get('newAuctioneerId')
        
        # Revoke old approval
        old_assignment_id = f"{season_id}_{old_auctioneer_id}"
        db.collection('auctioneer_assignments').document(old_assignment_id).update({
            'status': 'replaced',
            'replacedAt': datetime.now().isoformat()
        })
        
        db.collection('auctioneers').document(old_auctioneer_id).update({
            'status': 'replaced'
        })
        
        # Approve new auctioneer
        new_assignment_id = f"{season_id}_{new_auctioneer_id}"
        db.collection('auctioneer_assignments').document(new_assignment_id).set({
            'id': new_assignment_id,
            'auctioneerId': new_auctioneer_id,
            'seasonId': season_id,
            'status': 'approved',
            'approvedAt': datetime.now().isoformat()
        })
        
        db.collection('auctioneers').document(new_auctioneer_id).update({
            'status': 'approved'
        })
        
        # Notify both
        socketio.emit('AUCTIONEER_REPLACED', {
            'seasonId': season_id,
            'oldAuctioneerId': old_auctioneer_id,
            'newAuctioneerId': new_auctioneer_id
        }, room=f'season_{season_id}')
        
        return success_response(None, "Auctioneer replaced")
    except Exception as e:
        return error_response(f"Failed to replace auctioneer: {str(e)}")


# ========================
# MAIN
# ========================

if __name__ == '__main__':
    print("🔥 HypeHammer Server Starting...")
    print("✅ Flask + SocketIO initialized")
    print("✅ Real-time bidding enabled")
    print("✅ Server-controlled auction system active")
    print(f"🌐 Server running on http://localhost:5000")
    
    socketio.run(
        app,
        host='0.0.0.0',
        port=5000,
        debug=True,
        allow_unsafe_werkzeug=True
    )
