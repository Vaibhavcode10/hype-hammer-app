"""
HypeHammer Firebase Cloud Functions
Converted from Flask REST API to Firebase Cloud Functions
"""

from firebase_functions import https_fn, options
from firebase_admin import credentials, firestore, initialize_app
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple, Optional
import uuid
import os
import json
import traceback

# Initialize Firebase Admin (only once)
try:
    initialize_app()
    db = firestore.client()
    print("✓ Firebase Firestore initialized successfully")
except Exception as e:
    print(f"✗ Firebase initialization failed: {e}")

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


def error_response(message: str, status_code: int = 400) -> Dict:
    """Return standardized error response"""
    return {
        "error": message,
        "success": False,
        "status_code": status_code
    }


def success_response(data: Any = None, message: str = "Success", status_code: int = 200) -> Dict:
    """Return standardized success response"""
    response = {"success": True, "message": message, "status_code": status_code}
    if data is not None:
        response["data"] = data
    return response


def compute_match_status(match_data: Dict, players: List[Dict] = None, history: List[Dict] = None) -> str:
    """Compute the actual status of a match/auction based on multiple factors"""
    
    if match_data.get('status') == 'COMPLETED':
        return 'COMPLETED'
    
    now = datetime.now()
    match_date = match_data.get('matchDate')
    created_at = match_data.get('createdAt')
    
    auction_date = None
    if match_date:
        if isinstance(match_date, (int, float)):
            auction_date = datetime.fromtimestamp(match_date / 1000 if match_date > 10000000000 else match_date)
        elif isinstance(match_date, str):
            try:
                auction_date = datetime.fromisoformat(match_date.replace('Z', '+00:00'))
            except:
                pass
    
    if not auction_date and created_at:
        if isinstance(created_at, (int, float)):
            auction_date = datetime.fromtimestamp(created_at / 1000 if created_at > 10000000000 else created_at)
        elif isinstance(created_at, str):
            try:
                auction_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            except:
                pass
    
    has_sold_players = False
    if players is not None:
        total_players = len(players)
        processed_players = sum(1 for p in players if p.get('status') in ['SOLD', 'UNSOLD'])
        sold_players = sum(1 for p in players if p.get('status') == 'SOLD')
        has_sold_players = sold_players > 0
        all_players_processed = total_players > 0 and processed_players == total_players
        
        if all_players_processed:
            return 'COMPLETED'
    
    has_history = history and len(history) > 0
    is_ongoing = match_data.get('status') == 'ONGOING'
    has_activity = has_history or has_sold_players
    
    if auction_date and auction_date < now:
        if is_ongoing or has_activity:
            return 'ONGOING'
        return 'SETUP'
    
    return 'SETUP'


def sync_team_player_ids(team_id: str):
    """Synchronize team's playerIds from players marked as SOLD to that team"""
    try:
        print(f'Syncing playerIds for team: {team_id}')
        
        players_query = db.collection('players').where('soldTo', '==', team_id)
        all_players = list(players_query.stream())
        
        print(f'  Found {len(all_players)} players with soldTo={team_id}')
        for p in all_players:
            p_data = p.to_dict()
            print(f'    Player {p.id}: status={p_data.get("status")}, soldTo={p_data.get("soldTo")}')
        
        sold_players = [p for p in all_players if p.to_dict().get('status') == 'SOLD']
        sold_player_ids = [p.id for p in sold_players]
        
        print(f'  Filtered to {len(sold_player_ids)} SOLD players: {sold_player_ids}')
        
        db.collection('teams').document(team_id).update({
            'playerIds': sold_player_ids
        })
        print(f'  Updated team {team_id}: playerIds = {sold_player_ids}')
        
        return sold_player_ids
    except Exception as e:
        print(f'Error syncing team playerIds for {team_id}: {e}')
        traceback.print_exc()
        return []


def parse_request_data(request) -> Dict:
    """Parse request data from Cloud Function request"""
    try:
        if request.method == 'GET':
            return dict(request.args)
        else:
            return request.get_json(silent=True) or {}
    except:
        return {}


def create_response(data: Dict, status_code: int = 200):
    """Create HTTP response for Cloud Functions"""
    return (json.dumps(data), status_code, {'Content-Type': 'application/json'})


# ========================
# USER MANAGEMENT FUNCTIONS
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_users(req: https_fn.Request) -> https_fn.Response:
    """Get all users with optional filtering"""
    try:
        role = req.args.get('role')
        query = db.collection('users')
        
        if role:
            query = query.where('role', '==', role)
        
        docs = query.stream()
        users = serialize_firestore_docs(docs)
        
        result = success_response(users, f"Retrieved {len(users)} users")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve users: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_user(req: https_fn.Request) -> https_fn.Response:
    """Get specific user by ID"""
    try:
        # Extract user_id from path
        path_parts = req.path.split('/')
        user_id = path_parts[-1] if path_parts else None
        
        if not user_id:
            result = error_response("User ID is required", 400)
            return create_response(result, 400)
        
        doc = db.collection('users').document(user_id).get()
        
        if not doc.exists:
            result = error_response(f"User {user_id} not found", 404)
            return create_response(result, 404)
        
        user = serialize_firestore_doc(doc)
        result = success_response(user, "User retrieved successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve user: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def create_user(req: https_fn.Request) -> https_fn.Response:
    """Create a new user"""
    try:
        data = parse_request_data(req)
        
        required_fields = ['email', 'name', 'role']
        if not all(field in data for field in required_fields):
            result = error_response(f"Missing required fields: {required_fields}")
            return create_response(result, 400)
        
        existing = db.collection('users').where('email', '==', data['email']).stream()
        if list(existing):
            result = error_response(f"Email {data['email']} already registered", 409)
            return create_response(result, 409)
        
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
        
        result = success_response(user_data, "User created successfully", 201)
        return create_response(result, 201)
    except Exception as e:
        result = error_response(f"Failed to create user: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def update_user(req: https_fn.Request) -> https_fn.Response:
    """Update user information"""
    try:
        path_parts = req.path.split('/')
        user_id = path_parts[-1] if path_parts else None
        
        if not user_id:
            result = error_response("User ID is required", 400)
            return create_response(result, 400)
        
        data = parse_request_data(req)
        
        user_ref = db.collection('users').document(user_id)
        if not user_ref.get().exists:
            result = error_response(f"User {user_id} not found", 404)
            return create_response(result, 404)
        
        data['updatedAt'] = datetime.now().isoformat()
        user_ref.update(data)
        updated_doc = user_ref.get()
        
        result = success_response(serialize_firestore_doc(updated_doc), "User updated successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to update user: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def delete_user(req: https_fn.Request) -> https_fn.Response:
    """Delete a user"""
    try:
        path_parts = req.path.split('/')
        user_id = path_parts[-1] if path_parts else None
        
        if not user_id:
            result = error_response("User ID is required", 400)
            return create_response(result, 400)
        
        db.collection('users').document(user_id).delete()
        result = success_response(None, "User deleted successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to delete user: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_user_by_email(req: https_fn.Request) -> https_fn.Response:
    """Get user by email"""
    try:
        path_parts = req.path.split('/')
        email = path_parts[-1] if path_parts else None
        
        if not email:
            result = error_response("Email is required", 400)
            return create_response(result, 400)
        
        docs = db.collection('users').where('email', '==', email).stream()
        users = serialize_firestore_docs(docs)
        
        if not users:
            result = error_response(f"User with email {email} not found", 404)
            return create_response(result, 404)
        
        result = success_response(users[0], "User found")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve user: {str(e)}")
        return create_response(result, 400)


# ========================
# AUTHENTICATION FUNCTIONS
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def login(req: https_fn.Request) -> https_fn.Response:
    """Login user with email and password"""
    try:
        data = parse_request_data(req)
        
        if not data.get('email') or not data.get('password'):
            result = error_response("Email and password required", 400)
            return create_response(result, 400)
        
        print(f"🔐 Login attempt for email: {data['email']}")
        
        collections = ['auctioneers', 'teams', 'players', 'guests', 'matches']
        
        for collection_name in collections:
            print(f"   Checking collection: {collection_name}")
            docs = db.collection(collection_name).where('email', '==', data['email']).stream()
            doc_list = list(docs)
            
            if doc_list:
                print(f"   ✅ Found user in {collection_name}")
                user_doc = doc_list[0]
                user_data = user_doc.to_dict()
                
                if user_data.get('password') != data['password']:
                    print(f"   ❌ Password mismatch!")
                    result = error_response("Invalid email or password", 401)
                    return create_response(result, 401)
                
                print(f"   ✅ Login successful!")
                response_data = {k: v for k, v in user_data.items() if k != 'password'}
                response_data['collection'] = collection_name
                
                if collection_name == 'matches' and 'role' not in response_data:
                    response_data['role'] = 'ADMIN'
                
                result = success_response({'user': response_data}, "Login successful")
                return create_response(result)
        
        print(f"   ❌ User not found in any collection")
        result = error_response("Invalid email or password", 401)
        return create_response(result, 401)
    except Exception as e:
        print(f"   ❌ Login error: {str(e)}")
        result = error_response(f"Login failed: {str(e)}")
        return create_response(result, 400)


# ========================
# REGISTRATION FUNCTIONS
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def register_auctioneer(req: https_fn.Request) -> https_fn.Response:
    """Register an auctioneer for a specific match"""
    try:
        data = parse_request_data(req)
        
        required_fields = ['fullName', 'email', 'password', 'seasonId']
        if not all(field in data for field in required_fields):
            result = error_response(f"Missing required fields: {required_fields}")
            return create_response(result, 400)
        
        for collection in ['auctioneers', 'teams', 'players', 'guests', 'matches']:
            existing = db.collection(collection).where('email', '==', data['email']).stream()
            if list(existing):
                result = error_response(f"Email {data['email']} already registered", 409)
                return create_response(result, 409)
        
        user_id = generate_id('auctioneer')
        user_data = {
            'id': user_id,
            'name': data['fullName'],
            'email': data['email'],
            'password': data['password'],
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
        
        db.collection('auctioneers').document(user_id).set(user_data)
        
        result = success_response({'userId': user_id, 'auctioneerId': user_id}, "Auctioneer registered successfully", 201)
        return create_response(result, 201)
    except Exception as e:
        result = error_response(f"Failed to register auctioneer: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def register_team(req: https_fn.Request) -> https_fn.Response:
    """Register a team representative and create team"""
    try:
        data = parse_request_data(req)
        
        required_fields = ['fullName', 'email', 'password', 'seasonId', 'teamName']
        if not all(field in data for field in required_fields):
            result = error_response(f"Missing required fields: {required_fields}")
            return create_response(result, 400)
        
        for collection in ['auctioneers', 'teams', 'players', 'guests', 'matches']:
            existing = db.collection(collection).where('email', '==', data['email']).stream()
            if list(existing):
                result = error_response(f"Email {data['email']} already registered", 409)
                return create_response(result, 409)
        
        team_id = generate_id('team')
        team_data = {
            'id': team_id,
            'name': data['teamName'],
            'shortCode': data.get('teamShortCode', data['teamName'][:3].upper()),
            'logo': data.get('teamLogo', ''),
            'homeCity': data.get('homeCity', ''),
            'budget': 10000000,
            'remainingBudget': 10000000,
            'matchId': data['seasonId'],
            'players': [],
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
        
        result = success_response({'teamId': team_id}, "Team registered successfully", 201)
        return create_response(result, 201)
    except Exception as e:
        result = error_response(f"Failed to register team: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def register_player(req: https_fn.Request) -> https_fn.Response:
    """Register a player for a specific match"""
    try:
        data = parse_request_data(req)
        
        required_fields = ['fullName', 'email', 'password', 'seasonId', 'basePrice', 'playingRole']
        if not all(field in data for field in required_fields):
            result = error_response(f"Missing required fields: {required_fields}")
            return create_response(result, 400)
        
        for collection in ['auctioneers', 'teams', 'players', 'guests', 'matches']:
            existing = db.collection(collection).where('email', '==', data['email']).stream()
            if list(existing):
                result = error_response(f"Email {data['email']} already registered", 409)
                return create_response(result, 409)
        
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
        
        result = success_response({'playerId': player_id}, "Player registered successfully", 201)
        return create_response(result, 201)
    except Exception as e:
        result = error_response(f"Failed to register player: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def register_guest(req: https_fn.Request) -> https_fn.Response:
    """Register a guest for a specific match"""
    try:
        data = parse_request_data(req)
        
        required_fields = ['fullName', 'email', 'password', 'seasonId']
        if not all(field in data for field in required_fields):
            result = error_response(f"Missing required fields: {required_fields}")
            return create_response(result, 400)
        
        for collection in ['auctioneers', 'teams', 'players', 'guests', 'matches']:
            existing = db.collection(collection).where('email', '==', data['email']).stream()
            if list(existing):
                result = error_response(f"Email {data['email']} already registered", 409)
                return create_response(result, 409)
        
        user_id = generate_id('guest')
        user_data = {
            'id': user_id,
            'name': data['fullName'],
            'email': data['email'],
            'password': data['password'],
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
        
        result = success_response({'guestId': user_id}, "Guest registered successfully", 201)
        return create_response(result, 201)
    except Exception as e:
        result = error_response(f"Failed to register guest: {str(e)}")
        return create_response(result, 400)


# ========================
# TEAM MANAGEMENT FUNCTIONS
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_teams(req: https_fn.Request) -> https_fn.Response:
    """Get all teams, optionally filtered by matchId"""
    try:
        match_id = req.args.get('matchId')
        
        if match_id:
            docs = db.collection('teams').where('matchId', '==', match_id).stream()
        else:
            docs = db.collection('teams').stream()
        
        teams = serialize_firestore_docs(docs)
        
        for team in teams:
            team_id = team.get('id')
            sold_player_ids = sync_team_player_ids(team_id)
            team['playerIds'] = sold_player_ids
        
        result = success_response(teams, f"Retrieved {len(teams)} teams")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve teams: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_team(req: https_fn.Request) -> https_fn.Response:
    """Get specific team by ID"""
    try:
        path_parts = req.path.split('/')
        team_id = path_parts[-1] if path_parts else None
        
        if not team_id:
            result = error_response("Team ID is required", 400)
            return create_response(result, 400)
        
        doc = db.collection('teams').document(team_id).get()
        
        if not doc.exists:
            result = error_response(f"Team {team_id} not found", 404)
            return create_response(result, 404)
        
        team = serialize_firestore_doc(doc)
        
        players_docs = db.collection('teams').document(team_id).collection('players').stream()
        team['players'] = serialize_firestore_docs(players_docs)
        
        result = success_response(team, "Team retrieved successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve team: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def create_team(req: https_fn.Request) -> https_fn.Response:
    """Create a new team"""
    try:
        data = parse_request_data(req)
        
        required_fields = ['name', 'budget']
        if not all(field in data for field in required_fields):
            result = error_response(f"Missing required fields: {required_fields}")
            return create_response(result, 400)
        
        team_id = generate_id('team')
        team_data = {
            **data,
            'id': team_id,
            'remainingBudget': data['budget'],
            'players': [],
            'playerIds': [],
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        
        db.collection('teams').document(team_id).set(team_data)
        
        result = success_response(team_data, "Team created successfully", 201)
        return create_response(result, 201)
    except Exception as e:
        result = error_response(f"Failed to create team: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def update_team(req: https_fn.Request) -> https_fn.Response:
    """Update team information"""
    try:
        path_parts = req.path.split('/')
        team_id = path_parts[-1] if path_parts else None
        
        if not team_id:
            result = error_response("Team ID is required", 400)
            return create_response(result, 400)
        
        data = parse_request_data(req)
        
        team_ref = db.collection('teams').document(team_id)
        if not team_ref.get().exists:
            result = error_response(f"Team {team_id} not found", 404)
            return create_response(result, 404)
        
        data['updatedAt'] = datetime.now().isoformat()
        team_ref.update(data)
        updated_doc = team_ref.get()
        
        result = success_response(serialize_firestore_doc(updated_doc), "Team updated successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to update team: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def delete_team(req: https_fn.Request) -> https_fn.Response:
    """Delete a team"""
    try:
        path_parts = req.path.split('/')
        team_id = path_parts[-1] if path_parts else None
        
        if not team_id:
            result = error_response("Team ID is required", 400)
            return create_response(result, 400)
        
        db.collection('teams').document(team_id).delete()
        result = success_response(None, "Team deleted successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to delete team: {str(e)}")
        return create_response(result, 400)


# ========================
# PLAYER MANAGEMENT FUNCTIONS
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_players(req: https_fn.Request) -> https_fn.Response:
    """Get all players with optional filtering"""
    try:
        status = req.args.get('status')
        sport = req.args.get('sport')
        auction_id = req.args.get('auctionId')
        match_id = req.args.get('matchId')
        email = req.args.get('email')
        
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
        
        if auction_id:
            players = [p for p in players if p.get('auctionId') == auction_id]
        
        result = success_response(players, f"Retrieved {len(players)} players")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve players: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_player(req: https_fn.Request) -> https_fn.Response:
    """Get specific player by ID"""
    try:
        path_parts = req.path.split('/')
        player_id = path_parts[-1] if path_parts else None
        
        if not player_id:
            result = error_response("Player ID is required", 400)
            return create_response(result, 400)
        
        doc = db.collection('players').document(player_id).get()
        
        if not doc.exists:
            result = error_response(f"Player {player_id} not found", 404)
            return create_response(result, 404)
        
        player = serialize_firestore_doc(doc)
        result = success_response(player, "Player retrieved successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve player: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def create_player(req: https_fn.Request) -> https_fn.Response:
    """Create a new player"""
    try:
        data = parse_request_data(req)
        
        required_fields = ['name', 'basePrice', 'sport']
        if not all(field in data for field in required_fields):
            result = error_response(f"Missing required fields: {required_fields}")
            return create_response(result, 400)
        
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
        
        result = success_response(player_data, "Player created successfully", 201)
        return create_response(result, 201)
    except Exception as e:
        result = error_response(f"Failed to create player: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def update_player(req: https_fn.Request) -> https_fn.Response:
    """Update player information"""
    try:
        path_parts = req.path.split('/')
        player_id = path_parts[-1] if path_parts else None
        
        if not player_id:
            result = error_response("Player ID is required", 400)
            return create_response(result, 400)
        
        data = parse_request_data(req)
        
        player_ref = db.collection('players').document(player_id)
        player_doc = player_ref.get()
        if not player_doc.exists:
            result = error_response(f"Player {player_id} not found", 404)
            return create_response(result, 404)
        
        data['updatedAt'] = datetime.now().isoformat()
        player_ref.update(data)
        updated_doc = player_ref.get()
        updated_player = serialize_firestore_doc(updated_doc)
        
        result = success_response(updated_player, "Player updated successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to update player: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def delete_player(req: https_fn.Request) -> https_fn.Response:
    """Delete a player"""
    try:
        path_parts = req.path.split('/')
        player_id = path_parts[-1] if path_parts else None
        
        if not player_id:
            result = error_response("Player ID is required", 400)
            return create_response(result, 400)
        
        db.collection('players').document(player_id).delete()
        result = success_response(None, "Player deleted successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to delete player: {str(e)}")
        return create_response(result, 400)


# ========================
# MATCH MANAGEMENT FUNCTIONS
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_matches(req: https_fn.Request) -> https_fn.Response:
    """Get all matches/tournaments with optional filtering"""
    try:
        sport = req.args.get('sport')
        status = req.args.get('status')
        
        query = db.collection('matches')
        
        if sport:
            query = query.where('sport', '==', sport)
        if status:
            query = query.where('status', '==', status)
        
        docs = query.stream()
        matches = serialize_firestore_docs(docs)
        
        result = success_response(matches, f"Retrieved {len(matches)} matches")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve matches: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_match(req: https_fn.Request) -> https_fn.Response:
    """Get specific match by ID"""
    try:
        path_parts = req.path.split('/')
        match_id = path_parts[-1] if path_parts else None
        
        if not match_id:
            result = error_response("Match ID is required", 400)
            return create_response(result, 400)
        
        doc = db.collection('matches').document(match_id).get()
        
        if not doc.exists:
            result = error_response(f"Match {match_id} not found", 404)
            return create_response(result, 404)
        
        match = serialize_firestore_doc(doc)
        result = success_response(match, "Match retrieved successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve match: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def create_match(req: https_fn.Request) -> https_fn.Response:
    """Create a new match/tournament"""
    try:
        data = parse_request_data(req)
        
        required_fields = ['name', 'sport', 'auctionId']
        if not all(field in data for field in required_fields):
            result = error_response(f"Missing required fields: {required_fields}")
            return create_response(result, 400)
        
        match_id = generate_id('match')
        match_data = {
            **data,
            'id': match_id,
            'status': data.get('status', 'SETUP'),
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        
        db.collection('matches').document(match_id).set(match_data)
        
        result = success_response(match_data, "Match created successfully", 201)
        return create_response(result, 201)
    except Exception as e:
        result = error_response(f"Failed to create match: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def update_match(req: https_fn.Request) -> https_fn.Response:
    """Update match information"""
    try:
        path_parts = req.path.split('/')
        match_id = path_parts[-1] if path_parts else None
        
        if not match_id:
            result = error_response("Match ID is required", 400)
            return create_response(result, 400)
        
        data = parse_request_data(req)
        
        match_ref = db.collection('matches').document(match_id)
        if not match_ref.get().exists:
            result = error_response(f"Match {match_id} not found", 404)
            return create_response(result, 404)
        
        data['updatedAt'] = datetime.now().isoformat()
        match_ref.update(data)
        updated_doc = match_ref.get()
        
        result = success_response(serialize_firestore_doc(updated_doc), "Match updated successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to update match: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def delete_match(req: https_fn.Request) -> https_fn.Response:
    """Delete a match and all associated data (cascade delete)"""
    try:
        path_parts = req.path.split('/')
        match_id = path_parts[-1] if path_parts else None
        
        if not match_id:
            result = error_response("Match ID is required", 400)
            return create_response(result, 400)
        
        db.collection('matches').document(match_id).delete()
        
        players_query = db.collection('players').where('matchId', '==', match_id).stream()
        for player_doc in players_query:
            player_doc.reference.delete()
        
        teams_query = db.collection('teams').where('matchId', '==', match_id).stream()
        for team_doc in teams_query:
            team_doc.reference.delete()
        
        auctioneers_query = db.collection('auctioneers').where('matchId', '==', match_id).stream()
        for auctioneer_doc in auctioneers_query:
            auctioneer_doc.reference.delete()
        
        guests_query = db.collection('guests').where('matchId', '==', match_id).stream()
        for guest_doc in guests_query:
            guest_doc.reference.delete()
        
        bids_query = db.collection('bids').where('matchId', '==', match_id).stream()
        for bid_doc in bids_query:
            bid_doc.reference.delete()
        
        result = success_response(None, "Match and all associated data deleted successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to delete match: {str(e)}")
        return create_response(result, 400)


# ========================
# HEALTH CHECK
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def health(req: https_fn.Request) -> https_fn.Response:
    """Health check endpoint"""
    try:
        db.collection('healthCheck').document('test').set({'timestamp': datetime.now().isoformat()})
        result = success_response({"status": "healthy", "firebase": "connected"}, "Server is healthy")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Health check failed: {str(e)}", 503)
        return create_response(result, 503)


# ========================
# SPORTS DATA FUNCTIONS
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_sports(req: https_fn.Request) -> https_fn.Response:
    """Get all sports data aggregated from Firestore"""
    try:
        sports_data = []
        
        matches_docs = db.collection('matches').stream()
        
        for match_doc in matches_docs:
            match_data = serialize_firestore_doc(match_doc)
            
            players_docs = db.collection('players').where('matchId', '==', match_doc.id).stream()
            players = [serialize_firestore_doc(p) for p in players_docs]
            
            teams_docs = db.collection('teams').where('matchId', '==', match_doc.id).stream()
            teams = [serialize_firestore_doc(t) for t in teams_docs]
            
            bids_docs = db.collection('bids').where('matchId', '==', match_doc.id).stream()
            history = [serialize_firestore_doc(b) for b in bids_docs]
            
            computed_status = compute_match_status(match_data, players, history)
            
            if computed_status != match_data.get('status'):
                db.collection('matches').document(match_doc.id).update({
                    'status': computed_status,
                    'updatedAt': datetime.now().isoformat()
                })
                match_data['status'] = computed_status
            
            match_data['players'] = players
            match_data['teams'] = teams
            match_data['history'] = history
            
            sport_type = match_data.get('sport', 'CUSTOM')
            
            sport_entry = next((s for s in sports_data if s.get('sportType') == sport_type), None)
            if not sport_entry:
                sport_entry = {
                    'sportType': sport_type,
                    'matches': []
                }
                sports_data.append(sport_entry)
            
            sport_entry['matches'].append(match_data)
        
        result = success_response(sports_data, "Sports data retrieved successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve sports data: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def save_sports(req: https_fn.Request) -> https_fn.Response:
    """Save all sports data to Firestore"""
    try:
        data = parse_request_data(req)
        
        for sport_data in data:
            sport_type = sport_data.get('sportType', 'CUSTOM')
            
            for match in sport_data.get('matches', []):
                match_id = match.get('id')
                
                match_to_save = {k: v for k, v in match.items() if k not in ['players', 'teams', 'history']}
                match_to_save['sport'] = sport_type
                match_to_save['updatedAt'] = datetime.now().isoformat()
                
                if 'organizerEmail' in match_to_save:
                    match_to_save['email'] = match_to_save['organizerEmail']
                    del match_to_save['organizerEmail']
                if 'organizerPassword' in match_to_save:
                    match_to_save['password'] = match_to_save['organizerPassword']
                    del match_to_save['organizerPassword']
                if 'organizerName' in match_to_save:
                    match_to_save['organizerName'] = match_to_save['organizerName']
                
                db.collection('matches').document(match_id).set(match_to_save, merge=True)
                
                for player in match.get('players', []):
                    player_id = player.get('id')
                    player_to_save = {**player, 'matchId': match_id, 'updatedAt': datetime.now().isoformat()}
                    db.collection('players').document(player_id).set(player_to_save, merge=True)
                
                for team in match.get('teams', []):
                    team_id = team.get('id')
                    team_to_save = {**team, 'matchId': match_id, 'updatedAt': datetime.now().isoformat()}
                    db.collection('teams').document(team_id).set(team_to_save, merge=True)
        
        result = success_response({"saved": True}, "Sports data saved successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to save sports data: {str(e)}")
        return create_response(result, 400)


# ========================
# PLAYER SELLING
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def sell_player(req: https_fn.Request) -> https_fn.Response:
    """Mark player as sold to a team"""
    try:
        path_parts = req.path.split('/')
        player_id = path_parts[-2] if len(path_parts) >= 2 else None
        
        if not player_id:
            result = error_response("Player ID is required", 400)
            return create_response(result, 400)
        
        data = parse_request_data(req)
        team_id = data.get('teamId')
        sold_price = data.get('soldPrice')
        
        if not team_id or sold_price is None:
            result = error_response("Missing 'teamId' or 'soldPrice'")
            return create_response(result, 400)
        
        player_ref = db.collection('players').document(player_id)
        player = player_ref.get()
        
        if not player.exists:
            result = error_response(f"Player {player_id} not found", 404)
            return create_response(result, 404)
        
        player_ref.update({
            'status': 'SOLD',
            'teamId': team_id,
            'soldPrice': sold_price,
            'updatedAt': datetime.now().isoformat()
        })
        
        team_ref = db.collection('teams').document(team_id)
        team = team_ref.get()
        if team.exists:
            current_budget = team.to_dict().get('remainingBudget', 0)
            team_ref.update({
                'remainingBudget': max(0, current_budget - sold_price),
                'updatedAt': datetime.now().isoformat()
            })
        
        updated = player_ref.get()
        result = success_response(serialize_firestore_doc(updated), "Player sold successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to sell player: {str(e)}")
        return create_response(result, 400)


# ========================
# TEAM BUDGET MANAGEMENT
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def update_team_budget(req: https_fn.Request) -> https_fn.Response:
    """Update team's remaining budget after a purchase"""
    try:
        path_parts = req.path.split('/')
        team_id = path_parts[-2] if len(path_parts) >= 2 else None
        
        if not team_id:
            result = error_response("Team ID is required", 400)
            return create_response(result, 400)
        
        data = parse_request_data(req)
        amount = data.get('amount')
        
        if amount is None:
            result = error_response("Missing 'amount' field")
            return create_response(result, 400)
        
        team_ref = db.collection('teams').document(team_id)
        team = team_ref.get()
        
        if not team.exists:
            result = error_response(f"Team {team_id} not found", 404)
            return create_response(result, 404)
        
        current_budget = team.to_dict().get('remainingBudget', 0)
        new_budget = current_budget - amount
        
        if new_budget < 0:
            result = error_response("Insufficient budget", 400)
            return create_response(result, 400)
        
        team_ref.update({
            'remainingBudget': new_budget,
            'updatedAt': datetime.now().isoformat()
        })
        
        updated = team_ref.get()
        result = success_response(serialize_firestore_doc(updated), "Budget updated successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to update budget: {str(e)}")
        return create_response(result, 400)


# ========================
# AUCTION MANAGEMENT
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_auctions(req: https_fn.Request) -> https_fn.Response:
    """Get all auctions with optional filtering"""
    try:
        status = req.args.get('status')
        sport = req.args.get('sport')
        
        query = db.collection('auctions')
        
        if status:
            query = query.where('status', '==', status)
        if sport:
            query = query.where('sport', '==', sport)
        
        docs = query.stream()
        auctions = serialize_firestore_docs(docs)
        
        result = success_response(auctions, f"Retrieved {len(auctions)} auctions")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve auctions: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_auction(req: https_fn.Request) -> https_fn.Response:
    """Get specific auction by ID"""
    try:
        path_parts = req.path.split('/')
        auction_id = path_parts[-1] if path_parts else None
        
        if not auction_id:
            result = error_response("Auction ID is required", 400)
            return create_response(result, 400)
        
        doc = db.collection('auctions').document(auction_id).get()
        
        if not doc.exists:
            result = error_response(f"Auction {auction_id} not found", 404)
            return create_response(result, 404)
        
        auction = serialize_firestore_doc(doc)
        
        players_docs = db.collection('auctions').document(auction_id).collection('players').stream()
        auction['players'] = serialize_firestore_docs(players_docs)
        
        bids_docs = db.collection('auctions').document(auction_id).collection('bids').stream()
        auction['bids'] = serialize_firestore_docs(bids_docs)
        
        result = success_response(auction, "Auction retrieved successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve auction: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def create_auction(req: https_fn.Request) -> https_fn.Response:
    """Create a new auction"""
    try:
        data = parse_request_data(req)
        
        required_fields = ['name', 'sport', 'type', 'totalBudget', 'config']
        if not all(field in data for field in required_fields):
            result = error_response(f"Missing required fields: {required_fields}")
            return create_response(result, 400)
        
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
        
        result = success_response(auction_data, "Auction created successfully", 201)
        return create_response(result, 201)
    except Exception as e:
        result = error_response(f"Failed to create auction: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def update_auction(req: https_fn.Request) -> https_fn.Response:
    """Update auction information"""
    try:
        path_parts = req.path.split('/')
        auction_id = path_parts[-1] if path_parts else None
        
        if not auction_id:
            result = error_response("Auction ID is required", 400)
            return create_response(result, 400)
        
        data = parse_request_data(req)
        
        auction_ref = db.collection('auctions').document(auction_id)
        if not auction_ref.get().exists:
            result = error_response(f"Auction {auction_id} not found", 404)
            return create_response(result, 404)
        
        data['updatedAt'] = datetime.now().isoformat()
        auction_ref.update(data)
        updated_doc = auction_ref.get()
        
        result = success_response(serialize_firestore_doc(updated_doc), "Auction updated successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to update auction: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def update_auction_status(req: https_fn.Request) -> https_fn.Response:
    """Update auction status"""
    try:
        path_parts = req.path.split('/')
        auction_id = path_parts[-2] if len(path_parts) >= 2 else None
        
        if not auction_id:
            result = error_response("Auction ID is required", 400)
            return create_response(result, 400)
        
        data = parse_request_data(req)
        status = data.get('status')
        
        valid_statuses = ['SETUP', 'ONGOING', 'COMPLETED', 'PAUSED', 'LIVE', 'READY', 'ENDED']
        if status not in valid_statuses:
            result = error_response(f"Invalid status. Valid: {valid_statuses}")
            return create_response(result, 400)
        
        auction_ref = db.collection('auctions').document(auction_id)
        if not auction_ref.get().exists:
            result = error_response(f"Auction {auction_id} not found", 404)
            return create_response(result, 404)
        
        auction_ref.update({
            'status': status,
            'updatedAt': datetime.now().isoformat()
        })
        
        updated = auction_ref.get()
        result = success_response(serialize_firestore_doc(updated), "Auction status updated successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to update auction status: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def delete_auction(req: https_fn.Request) -> https_fn.Response:
    """Delete an auction"""
    try:
        path_parts = req.path.split('/')
        auction_id = path_parts[-1] if path_parts else None
        
        if not auction_id:
            result = error_response("Auction ID is required", 400)
            return create_response(result, 400)
        
        db.collection('auctions').document(auction_id).delete()
        result = success_response(None, "Auction deleted successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to delete auction: {str(e)}")
        return create_response(result, 400)


# ========================
# BID MANAGEMENT
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_bids(req: https_fn.Request) -> https_fn.Response:
    """Get all bids with optional filtering"""
    try:
        auction_id = req.args.get('auctionId')
        team_id = req.args.get('teamId')
        player_id = req.args.get('playerId')
        
        query = db.collection('bids')
        
        if auction_id:
            query = query.where('auctionId', '==', auction_id)
        if team_id:
            query = query.where('teamId', '==', team_id)
        if player_id:
            query = query.where('playerId', '==', player_id)
        
        docs = query.stream()
        bids = serialize_firestore_docs(docs)
        
        result = success_response(bids, f"Retrieved {len(bids)} bids")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve bids: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_bid(req: https_fn.Request) -> https_fn.Response:
    """Get specific bid by ID"""
    try:
        path_parts = req.path.split('/')
        bid_id = path_parts[-1] if path_parts else None
        
        if not bid_id:
            result = error_response("Bid ID is required", 400)
            return create_response(result, 400)
        
        doc = db.collection('bids').document(bid_id).get()
        
        if not doc.exists:
            result = error_response(f"Bid {bid_id} not found", 404)
            return create_response(result, 404)
        
        bid = serialize_firestore_doc(doc)
        result = success_response(bid, "Bid retrieved successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve bid: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def create_bid(req: https_fn.Request) -> https_fn.Response:
    """Create a new bid"""
    try:
        data = parse_request_data(req)
        
        required_fields = ['playerId', 'teamId', 'amount', 'auctionId']
        if not all(field in data for field in required_fields):
            result = error_response(f"Missing required fields: {required_fields}")
            return create_response(result, 400)
        
        bid_id = generate_id('bid')
        bid_data = {
            **data,
            'id': bid_id,
            'timestamp': datetime.now().isoformat()
        }
        
        db.collection('bids').document(bid_id).set(bid_data)
        
        result = success_response(bid_data, "Bid created successfully", 201)
        return create_response(result, 201)
    except Exception as e:
        result = error_response(f"Failed to create bid: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_highest_bid(req: https_fn.Request) -> https_fn.Response:
    """Get highest bid for a player in an auction"""
    try:
        path_parts = req.path.split('/')
        if len(path_parts) < 3:
            result = error_response("Auction ID and Player ID required", 400)
            return create_response(result, 400)
        
        auction_id = path_parts[-3]
        player_id = path_parts[-1]
        
        docs = db.collection('bids')\
            .where('auctionId', '==', auction_id)\
            .where('playerId', '==', player_id)\
            .order_by('amount', direction=firestore.Query.DESCENDING)\
            .limit(1)\
            .stream()
        
        bids = serialize_firestore_docs(docs)
        
        if not bids:
            result = error_response(f"No bids found for player {player_id}", 404)
            return create_response(result, 404)
        
        result = success_response(bids[0], "Highest bid retrieved successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve highest bid: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_bid_history(req: https_fn.Request) -> https_fn.Response:
    """Get bid history for a player in an auction"""
    try:
        path_parts = req.path.split('/')
        if len(path_parts) < 4:
            result = error_response("Auction ID and Player ID required", 400)
            return create_response(result, 400)
        
        auction_id = path_parts[-4]
        player_id = path_parts[-2]
        
        docs = db.collection('bids')\
            .where('auctionId', '==', auction_id)\
            .where('playerId', '==', player_id)\
            .order_by('timestamp', direction=firestore.Query.DESCENDING)\
            .stream()
        
        bids = serialize_firestore_docs(docs)
        
        result = success_response(bids, f"Retrieved {len(bids)} bids")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve bid history: {str(e)}")
        return create_response(result, 400)


# ========================
# APP STATE MANAGEMENT
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_app_state(req: https_fn.Request) -> https_fn.Response:
    """Get current application state"""
    try:
        doc = db.collection('appState').document('current').get()
        
        if not doc.exists:
            default_state = {
                'currentSport': None,
                'currentAuctionId': None,
                'currentMatchId': None
            }
            result = success_response(default_state, "Default app state")
            return create_response(result)
        
        state = serialize_firestore_doc(doc)
        result = success_response(state, "App state retrieved successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve app state: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def update_app_state(req: https_fn.Request) -> https_fn.Response:
    """Update application state"""
    try:
        data = parse_request_data(req)
        
        state_data = {
            **data,
            'updatedAt': datetime.now().isoformat()
        }
        
        db.collection('appState').document('current').set(state_data, merge=True)
        
        result = success_response(state_data, "App state updated successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to update app state: {str(e)}")
        return create_response(result, 400)


# ========================
# MATCH STATUS UPDATE
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def update_match_status(req: https_fn.Request) -> https_fn.Response:
    """Update match status (or compute it dynamically)"""
    try:
        path_parts = req.path.split('/')
        match_id = path_parts[-2] if len(path_parts) >= 2 else None
        
        if not match_id:
            result = error_response("Match ID is required", 400)
            return create_response(result, 400)
        
        match_ref = db.collection('matches').document(match_id)
        match_doc = match_ref.get()
        
        if not match_doc.exists:
            result = error_response(f"Match {match_id} not found", 404)
            return create_response(result, 404)
        
        match_data = serialize_firestore_doc(match_doc)
        
        players_docs = db.collection('players').where('matchId', '==', match_id).stream()
        players = [serialize_firestore_doc(p) for p in players_docs]
        
        bids_docs = db.collection('bids').where('matchId', '==', match_id).stream()
        history = [serialize_firestore_doc(b) for b in bids_docs]
        
        computed_status = compute_match_status(match_data, players, history)
        
        match_ref.update({
            'status': computed_status,
            'updatedAt': datetime.now().isoformat()
        })
        
        updated_doc = match_ref.get()
        updated_match = serialize_firestore_doc(updated_doc)
        
        # Note: Real-time updates should use Firestore listeners on client side
        
        result = success_response(updated_match, f"Match status updated to {computed_status}")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to update match status: {str(e)}")
        return create_response(result, 400)


# ========================
# AUDIT LOGS
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_logs(req: https_fn.Request) -> https_fn.Response:
    """Get audit logs with optional filtering"""
    try:
        user_id = req.args.get('userId')
        action = req.args.get('action')
        limit = int(req.args.get('limit', 50))
        
        query = db.collection('auditLogs')
        
        if user_id:
            query = query.where('userId', '==', user_id)
        if action:
            query = query.where('action', '==', action)
        
        docs = query.order_by('timestamp', direction=firestore.Query.DESCENDING)\
                   .limit(limit)\
                   .stream()
        
        logs = serialize_firestore_docs(docs)
        
        result = success_response(logs, f"Retrieved {len(logs)} logs")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve logs: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def create_log(req: https_fn.Request) -> https_fn.Response:
    """Create an audit log entry"""
    try:
        data = parse_request_data(req)
        
        required_fields = ['userId', 'action']
        if not all(field in data for field in required_fields):
            result = error_response(f"Missing required fields: {required_fields}")
            return create_response(result, 400)
        
        log_id = generate_id('log')
        log_data = {
            **data,
            'id': log_id,
            'timestamp': datetime.now().isoformat()
        }
        
        db.collection('auditLogs').document(log_id).set(log_data)
        
        result = success_response(log_data, "Log entry created successfully", 201)
        return create_response(result, 201)
    except Exception as e:
        result = error_response(f"Failed to create log: {str(e)}")
        return create_response(result, 400)


# ========================
# BATCH OPERATIONS
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def create_auction_with_players(req: https_fn.Request) -> https_fn.Response:
    """Create an auction and add players in batch"""
    try:
        data = parse_request_data(req)
        
        auction_data = data.get('auction')
        players_data = data.get('players', [])
        
        if not auction_data:
            result = error_response("Missing 'auction' data")
            return create_response(result, 400)
        
        auction_id = generate_id('auction')
        full_auction_data = {
            **auction_data,
            'id': auction_id,
            'status': auction_data.get('status', 'SETUP'),
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        
        batch = db.batch()
        
        auction_ref = db.collection('auctions').document(auction_id)
        batch.set(auction_ref, full_auction_data)
        
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
        
        result = success_response({
            'auctionId': auction_id,
            'playersAdded': len(players_data)
        }, "Auction with players created successfully", 201)
        return create_response(result, 201)
    except Exception as e:
        result = error_response(f"Failed to create auction with players: {str(e)}")
        return create_response(result, 400)


# ========================
# DEBUG ENDPOINTS
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def debug_sync_all_teams(req: https_fn.Request) -> https_fn.Response:
    """DEBUG: Force sync all teams with their sold players"""
    try:
        teams_docs = db.collection('teams').stream()
        all_teams = serialize_firestore_docs(teams_docs)
        
        results = []
        for team in all_teams:
            team_id = team.get('id')
            sold_player_ids = sync_team_player_ids(team_id)
            results.append({
                'teamId': team_id,
                'teamName': team.get('name'),
                'playerCount': len(sold_player_ids),
                'playerIds': sold_player_ids
            })
        
        result = success_response(results, "Synced all teams")
        return create_response(result)
    except Exception as e:
        print(f'Error in debug sync: {e}')
        traceback.print_exc()
        result = error_response(f"Debug sync failed: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def debug_all_players(req: https_fn.Request) -> https_fn.Response:
    """DEBUG: Get all SOLD players with their team assignments"""
    try:
        players_query = db.collection('players').where('status', '==', 'SOLD')
        players = list(players_query.stream())
        
        player_list = []
        for p in players:
            p_data = p.to_dict()
            player_list.append({
                'playerId': p.id,
                'playerName': p_data.get('name'),
                'status': p_data.get('status'),
                'soldTo': p_data.get('soldTo'),
                'soldAmount': p_data.get('soldAmount')
            })
        
        result = success_response(player_list, f"Found {len(player_list)} sold players")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to get players: {str(e)}")
        return create_response(result, 400)


# ========================
# AUCTIONEER APPROVAL & ASSIGNMENT
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_auctioneer_assignments(req: https_fn.Request) -> https_fn.Response:
    """Get all auctioneer assignments with status"""
    try:
        season_id = req.args.get('seasonId')
        query = db.collection('auctioneer_assignments')
        
        if season_id:
            query = query.where('seasonId', '==', season_id)
        
        docs = query.stream()
        assignments = serialize_firestore_docs(docs)
        
        result = success_response(assignments, f"Retrieved {len(assignments)} assignments")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to retrieve assignments: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def approve_auctioneer(req: https_fn.Request) -> https_fn.Response:
    """Admin approves auctioneer for a season - ONLY ONE PER SEASON"""
    try:
        data = parse_request_data(req)
        
        required_fields = ['auctioneerId', 'seasonId', 'adminId']
        if not all(field in data for field in required_fields):
            result = error_response(f"Missing required fields: {required_fields}")
            return create_response(result, 400)
        
        auctioneer_id = data['auctioneerId']
        season_id = data['seasonId']
        admin_id = data['adminId']
        
        existing = db.collection('auctioneer_assignments')\
            .where('seasonId', '==', season_id)\
            .where('status', '==', 'approved')\
            .stream()
        
        existing_list = list(existing)
        if existing_list:
            result = error_response(
                f"Season {season_id} already has an approved auctioneer. Only one auctioneer per season allowed.",
                409
            )
            return create_response(result, 409)
        
        auctioneer_doc = db.collection('auctioneers').document(auctioneer_id).get()
        if not auctioneer_doc.exists:
            result = error_response(f"Auctioneer {auctioneer_id} not found", 404)
            return create_response(result, 404)
        
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
        
        db.collection('auctioneers').document(auctioneer_id).update({
            'status': 'approved',
            'approvedAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        })
        
        # Note: Real-time notifications should use Firestore listeners on client
        
        result = success_response(assignment_data, "Auctioneer approved successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to approve auctioneer: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def reject_auctioneer(req: https_fn.Request) -> https_fn.Response:
    """Admin rejects auctioneer application"""
    try:
        data = parse_request_data(req)
        
        required_fields = ['auctioneerId', 'seasonId', 'adminId']
        if not all(field in data for field in required_fields):
            result = error_response(f"Missing required fields: {required_fields}")
            return create_response(result, 400)
        
        auctioneer_id = data['auctioneerId']
        season_id = data['seasonId']
        reason = data.get('reason', 'Application not approved')
        
        db.collection('auctioneers').document(auctioneer_id).update({
            'status': 'rejected',
            'rejectedAt': datetime.now().isoformat(),
            'rejectionReason': reason,
            'updatedAt': datetime.now().isoformat()
        })
        
        # Note: Real-time notifications should use Firestore listeners on client
        
        result = success_response(None, "Auctioneer application rejected")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to reject auctioneer: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_auctioneers(req: https_fn.Request) -> https_fn.Response:
    """Get auctioneers, optionally filtered by email"""
    try:
        email = req.args.get('email')
        
        if email:
            auctioneers_query = db.collection('auctioneers').where('email', '==', email).stream()
            auctioneers = [serialize_firestore_doc(a) for a in auctioneers_query]
            result = success_response(auctioneers, "Auctioneers retrieved")
            return create_response(result)
        else:
            auctioneers = db.collection('auctioneers').stream()
            auctioneers_list = [serialize_firestore_doc(a) for a in auctioneers]
            result = success_response(auctioneers_list, "All auctioneers retrieved")
            return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to get auctioneers: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_auctioneer_status(req: https_fn.Request) -> https_fn.Response:
    """Get auctioneer approval status"""
    try:
        path_parts = req.path.split('/')
        auctioneer_id = path_parts[-1] if path_parts else None
        
        if not auctioneer_id:
            result = error_response("Auctioneer ID is required", 400)
            return create_response(result, 400)
        
        doc = db.collection('auctioneers').document(auctioneer_id).get()
        
        if not doc.exists:
            result = error_response(f"Auctioneer {auctioneer_id} not found", 404)
            return create_response(result, 404)
        
        auctioneer = serialize_firestore_doc(doc)
        status = auctioneer.get('status', 'pending')
        
        assignments = db.collection('auctioneer_assignments')\
            .where('auctioneerId', '==', auctioneer_id)\
            .where('status', '==', 'approved')\
            .stream()
        
        approved_seasons = [serialize_firestore_doc(a) for a in assignments]
        
        result = success_response({
            'status': status,
            'auctioneer': auctioneer,
            'approvedSeasons': approved_seasons,
            'isApproved': status == 'approved'
        }, "Status retrieved")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to get status: {str(e)}")
        return create_response(result, 400)


# ========================
# LIVE AUCTION STATE MANAGEMENT
# ========================

def get_auction_state_helper(season_id: str) -> Dict:
    """Get current auction state from Firestore"""
    try:
        doc = db.collection('auction_states').document(season_id).get()
        if doc.exists:
            return serialize_firestore_doc(doc)
        return None
    except Exception as e:
        print(f"Error getting auction state: {e}")
        return None


def update_auction_state_helper(season_id: str, updates: Dict):
    """Update auction state in Firestore"""
    try:
        updates['updatedAt'] = datetime.now().isoformat()
        db.collection('auction_states').document(season_id).set(updates, merge=True)
        # Note: Real-time updates should use Firestore listeners on client side
        return True
    except Exception as e:
        print(f"Error updating auction state: {e}")
        return False


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_auction_state(req: https_fn.Request) -> https_fn.Response:
    """Get current auction state"""
    try:
        path_parts = req.path.split('/')
        season_id = path_parts[-1] if path_parts else None
        
        if not season_id:
            result = error_response("Season ID is required", 400)
            return create_response(result, 400)
        
        state = get_auction_state_helper(season_id)
        if not state:
            result = error_response("Auction state not found", 404)
            return create_response(result, 404)
        
        result = success_response(state, "Auction state retrieved")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to get auction state: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def initialize_auction(req: https_fn.Request) -> https_fn.Response:
    """Initialize auction state for a season - Admin only"""
    try:
        data = parse_request_data(req)
        
        required_fields = ['seasonId', 'startTime', 'endTime']
        if not all(field in data for field in required_fields):
            result = error_response(f"Missing required fields: {required_fields}")
            return create_response(result, 400)
        
        season_id = data['seasonId']
        
        assignments = db.collection('auctioneer_assignments')\
            .where('seasonId', '==', season_id)\
            .where('status', '==', 'approved')\
            .stream()
        
        approved_list = list(assignments)
        if not approved_list:
            result = error_response("No approved auctioneer for this season. Cannot start auction.", 400)
            return create_response(result, 400)
        
        auction_state_data = {
            'id': season_id,
            'seasonId': season_id,
            'status': 'READY',
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
        
        # Note: Real-time notifications should use Firestore listeners on client
        
        result = success_response(auction_state_data, "Auction initialized successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to initialize auction: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def start_auction(req: https_fn.Request) -> https_fn.Response:
    """Start the auction - Auctioneer or Admin only"""
    try:
        data = parse_request_data(req)
        season_id = data.get('seasonId')
        
        if not season_id:
            result = error_response("seasonId required")
            return create_response(result, 400)
        
        state = get_auction_state_helper(season_id)
        if not state:
            result = error_response("Auction not initialized", 400)
            return create_response(result, 400)
        
        if state['status'] == 'LIVE':
            result = error_response("Auction already live", 400)
            return create_response(result, 400)
        
        updates = {
            'status': 'LIVE',
            'startedAt': datetime.now().isoformat()
        }
        
        update_auction_state_helper(season_id, updates)
        
        # Note: Real-time notifications should use Firestore listeners on client
        
        result = success_response(None, "Auction started successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to start auction: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def pause_auction(req: https_fn.Request) -> https_fn.Response:
    """Pause the auction - Admin or Auctioneer"""
    try:
        data = parse_request_data(req)
        season_id = data.get('seasonId')
        
        if not season_id:
            result = error_response("seasonId required")
            return create_response(result, 400)
        
        updates = {
            'status': 'PAUSED',
            'pausedAt': datetime.now().isoformat()
        }
        
        update_auction_state_helper(season_id, updates)
        
        # Note: Real-time notifications should use Firestore listeners on client
        
        result = success_response(None, "Auction paused")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to pause auction: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def resume_auction(req: https_fn.Request) -> https_fn.Response:
    """Resume paused auction"""
    try:
        data = parse_request_data(req)
        season_id = data.get('seasonId')
        
        if not season_id:
            result = error_response("seasonId required")
            return create_response(result, 400)
        
        updates = {
            'status': 'LIVE',
            'resumedAt': datetime.now().isoformat()
        }
        
        update_auction_state_helper(season_id, updates)
        
        # Note: Real-time notifications should use Firestore listeners on client
        
        result = success_response(None, "Auction resumed")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to resume auction: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def end_auction(req: https_fn.Request) -> https_fn.Response:
    """End the auction - Admin only"""
    try:
        data = parse_request_data(req)
        season_id = data.get('seasonId')
        
        if not season_id:
            result = error_response("seasonId required")
            return create_response(result, 400)
        
        updates = {
            'status': 'ENDED',
            'endedAt': datetime.now().isoformat()
        }
        
        update_auction_state_helper(season_id, updates)
        
        # Note: Real-time notifications should use Firestore listeners on client
        
        result = success_response(None, "Auction ended")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to end auction: {str(e)}")
        return create_response(result, 400)


# ========================
# LIVE BIDDING SYSTEM
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def start_player_bidding(req: https_fn.Request) -> https_fn.Response:
    """Auctioneer starts bidding for a player"""
    try:
        data = parse_request_data(req)
        
        required_fields = ['seasonId', 'playerId', 'basePrice']
        if not all(field in data for field in required_fields):
            result = error_response(f"Missing required fields: {required_fields}")
            return create_response(result, 400)
        
        season_id = data['seasonId']
        player_id = data['playerId']
        base_price = data['basePrice']
        
        player_doc = db.collection('players').document(player_id).get()
        if not player_doc.exists:
            result = error_response("Player not found", 404)
            return create_response(result, 404)
        
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
        
        update_auction_state_helper(season_id, updates)
        
        # Note: Real-time notifications should use Firestore listeners on client
        
        result = success_response(None, "Player bidding started")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to start player bidding: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def place_bid(req: https_fn.Request) -> https_fn.Response:
    """Team Rep places a bid - SERVER VALIDATES"""
    try:
        data = parse_request_data(req)
        
        required_fields = ['seasonId', 'teamId', 'amount']
        if not all(field in data for field in required_fields):
            result = error_response(f"Missing required fields: {required_fields}")
            return create_response(result, 400)
        
        season_id = data['seasonId']
        team_id = data['teamId']
        amount = data['amount']
        
        state = get_auction_state_helper(season_id)
        if not state:
            result = error_response("Auction state not found", 404)
            return create_response(result, 404)
        
        if state['status'] != 'LIVE':
            result = error_response("Auction is not live", 400)
            return create_response(result, 400)
        
        if not state.get('biddingActive'):
            result = error_response("No player is currently up for bidding", 400)
            return create_response(result, 400)
        
        current_bid = state.get('currentBid', 0)
        if amount <= current_bid:
            result = error_response(f"Bid must be higher than current bid of {current_bid}", 400)
            return create_response(result, 400)
        
        team_doc = db.collection('teams').document(team_id).get()
        if not team_doc.exists:
            result = error_response("Team not found", 404)
            return create_response(result, 404)
        
        team = serialize_firestore_doc(team_doc)
        
        remaining_budget = team.get('remainingBudget', 0)
        if amount > remaining_budget:
            result = error_response(f"Insufficient budget. Remaining: {remaining_budget}", 400)
            return create_response(result, 400)
        
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
        
        update_auction_state_helper(season_id, updates)
        
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
        
        # Note: Real-time bid updates should use Firestore listeners on client
        
        result = success_response(None, "Bid placed successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to place bid: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def close_player_bidding(req: https_fn.Request) -> https_fn.Response:
    """Auctioneer closes bidding for current player"""
    try:
        data = parse_request_data(req)
        
        required_fields = ['seasonId', 'sold']
        if not all(field in data for field in required_fields):
            result = error_response(f"Missing required fields: {required_fields}")
            return create_response(result, 400)
        
        season_id = data['seasonId']
        sold = data['sold']
        
        state = get_auction_state_helper(season_id)
        if not state:
            result = error_response("Auction state not found", 404)
            return create_response(result, 404)
        
        player_id = state.get('currentPlayerId')
        if not player_id:
            result = error_response("No player currently up for bidding", 400)
            return create_response(result, 400)
        
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
            db.collection('players').document(player_id).update({
                'status': 'SOLD',
                'soldTo': winning_team_id,
                'soldAmount': final_amount,
                'soldAt': datetime.now().isoformat()
            })
            
            team_doc = db.collection('teams').document(winning_team_id).get()
            if team_doc.exists:
                team = serialize_firestore_doc(team_doc)
                current_budget = team.get('budget', team.get('remainingBudget', 0))
                new_budget = current_budget - final_amount
                player_ids_list = team.get('playerIds', [])
                if player_id not in player_ids_list:
                    player_ids_list.append(player_id)
                
                db.collection('teams').document(winning_team_id).update({
                    'budget': new_budget,
                    'remainingBudget': new_budget,
                    'playerIds': player_ids_list,
                    'updatedAt': datetime.now().isoformat()
                })
        else:
            db.collection('players').document(player_id).update({
                'status': 'UNSOLD',
                'updatedAt': datetime.now().isoformat()
            })
        
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
        
        update_auction_state_helper(season_id, updates)
        
        # Note: Real-time notifications should use Firestore listeners on client
        
        result = success_response(result_data, "Player bidding closed")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to close bidding: {str(e)}")
        return create_response(result, 400)


# ========================
# ADMIN OVERRIDE CONTROLS
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def admin_force_close_bidding(req: https_fn.Request) -> https_fn.Response:
    """Admin force closes current bidding"""
    return close_player_bidding(req)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def admin_extend_timer(req: https_fn.Request) -> https_fn.Response:
    """Admin extends auction timer"""
    try:
        data = parse_request_data(req)
        season_id = data.get('seasonId')
        additional_minutes = data.get('minutes', 10)
        
        if not season_id:
            result = error_response("seasonId required")
            return create_response(result, 400)
        
        state = get_auction_state_helper(season_id)
        if not state:
            result = error_response("Auction not found", 404)
            return create_response(result, 404)
        
        current_end = datetime.fromisoformat(state['endTime'])
        new_end = current_end + timedelta(minutes=additional_minutes)
        
        updates = {
            'endTime': new_end.isoformat()
        }
        
        update_auction_state_helper(season_id, updates)
        
        # Note: Real-time notifications should use Firestore listeners on client
        
        result = success_response(None, f"Timer extended by {additional_minutes} minutes")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to extend timer: {str(e)}")
        return create_response(result, 400)


@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def admin_replace_auctioneer(req: https_fn.Request) -> https_fn.Response:
    """Admin replaces current auctioneer (emergency)"""
    try:
        data = parse_request_data(req)
        season_id = data.get('seasonId')
        old_auctioneer_id = data.get('oldAuctioneerId')
        new_auctioneer_id = data.get('newAuctioneerId')
        
        if not all([season_id, old_auctioneer_id, new_auctioneer_id]):
            result = error_response("Missing required fields")
            return create_response(result, 400)
        
        old_assignment_id = f"{season_id}_{old_auctioneer_id}"
        db.collection('auctioneer_assignments').document(old_assignment_id).update({
            'status': 'replaced',
            'replacedAt': datetime.now().isoformat()
        })
        
        db.collection('auctioneers').document(old_auctioneer_id).update({
            'status': 'replaced'
        })
        
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
        
        # Note: Real-time notifications should use Firestore listeners on client
        
        result = success_response(None, "Auctioneer replaced")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Failed to replace auctioneer: {str(e)}")
        return create_response(result, 400)


# ========================
# API INFO ENDPOINT
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def api_info(req: https_fn.Request) -> https_fn.Response:
    """API information and available endpoints"""
    endpoints = {
        "health": "health",
        "users": {
            "get_all": "get_users",
            "get_by_id": "get_user",
            "get_by_email": "get_user_by_email",
            "create": "create_user",
            "update": "update_user",
            "delete": "delete_user"
        },
        "teams": {
            "get_all": "get_teams",
            "get_by_id": "get_team",
            "create": "create_team",
            "update": "update_team",
            "delete": "delete_team",
            "update_budget": "update_team_budget"
        },
        "players": {
            "get_all": "get_players",
            "get_by_id": "get_player",
            "create": "create_player",
            "update": "update_player",
            "delete": "delete_player",
            "sell_player": "sell_player"
        },
        "auctions": {
            "get_all": "get_auctions",
            "get_by_id": "get_auction",
            "create": "create_auction",
            "update": "update_auction",
            "update_status": "update_auction_status",
            "delete": "delete_auction"
        },
        "bids": {
            "get_all": "get_bids",
            "get_by_id": "get_bid",
            "create": "create_bid",
            "highest_bid": "get_highest_bid",
            "bid_history": "get_bid_history"
        },
        "matches": {
            "get_all": "get_matches",
            "get_by_id": "get_match",
            "create": "create_match",
            "update": "update_match",
            "update_status": "update_match_status",
            "delete": "delete_match"
        },
        "state": {
            "get": "get_app_state",
            "update": "update_app_state"
        },
        "sports": {
            "get_all": "get_sports",
            "save_all": "save_sports"
        },
        "logs": {
            "get_all": "get_logs",
            "create": "create_log"
        },
        "auctioneers": {
            "get_all": "get_auctioneers",
            "get_status": "get_auctioneer_status",
            "approve": "approve_auctioneer",
            "reject": "reject_auctioneer",
            "assignments": "get_auctioneer_assignments"
        },
        "auction_state": {
            "get": "get_auction_state",
            "initialize": "initialize_auction",
            "start": "start_auction",
            "pause": "pause_auction",
            "resume": "resume_auction",
            "end": "end_auction"
        },
        "live_bidding": {
            "start_player": "start_player_bidding",
            "place_bid": "place_bid",
            "close_player": "close_player_bidding"
        },
        "admin_controls": {
            "force_close": "admin_force_close_bidding",
            "extend_timer": "admin_extend_timer",
            "replace_auctioneer": "admin_replace_auctioneer"
        },
        "batch_operations": {
            "create_auction_with_players": "create_auction_with_players"
        },
        "debug": {
            "sync_teams": "debug_sync_all_teams",
            "all_players": "debug_all_players"
        }
    }
    
    info = {
        "name": "HypeHammer Firebase Cloud Functions API",
        "version": "2.0.0",
        "description": "REST API for HypeHammer Sports Auction Platform - Firebase Cloud Functions",
        "firebase": "Connected to Cloud Firestore",
        "endpoints": endpoints,
        "note": "Real-time features use Firestore listeners on client side"
    }
    
    result = success_response(info, "API information retrieved")
    return create_response(result)


# ========================
# INITIALIZATION ENDPOINT
# ========================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["http://localhost:3000", "http://localhost:5173"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def initialize_app(req: https_fn.Request) -> https_fn.Response:
    """Initialize application with sample data"""
    try:
        result = success_response({"initialized": True}, "App initialized successfully")
        return create_response(result)
    except Exception as e:
        result = error_response(f"Initialization failed: {str(e)}")
        return create_response(result, 400)


"""
========================================
IMPORTANT NOTES FOR REAL-TIME FEATURES
========================================

Firebase Cloud Functions are stateless HTTP functions and cannot:
1. Maintain WebSocket/SocketIO connections
2. Run background threads or timers
3. Keep server-side session state

For real-time features, implement on CLIENT SIDE using:

1. FIRESTORE REAL-TIME LISTENERS:
   - Listen to 'auction_states/{seasonId}' for auction updates
   - Listen to 'bids' collection for new bids
   - Listen to 'players' collection for status changes
   - Listen to 'teams' collection for budget updates

2. FIREBASE REALTIME DATABASE (optional):
   - For very low-latency updates
   - For presence detection

3. WEBRTC (for audio streaming):
   - Use Firebase Extensions or custom peer-to-peer setup
   - Consider Agora, Twilio, or similar services

4. TIMER MANAGEMENT:
   - Implement countdown timers on client side
   - Sync with server time using Firestore timestamps

Example client-side Firestore listener (JavaScript):
```javascript
const unsubscribe = db.collection('auction_states')
  .doc(seasonId)
  .onSnapshot((doc) => {
    const state = doc.data();
    // Update UI with new auction state
    updateAuctionUI(state);
  });
```

All Cloud Functions in this file update Firestore documents,
which will automatically trigger listeners on connected clients.
"""
