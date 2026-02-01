"""
HypeHammer Firebase Cloud Functions - Unified API
Single Cloud Function with all routes handled via path routing
"""

from firebase_functions import https_fn, options
from firebase_admin import credentials, firestore, initialize_app
from datetime import datetime
from typing import Dict, Any
import uuid
import json
import traceback

# Initialize Firebase Admin
try:
    initialize_app()
    print("✓ Firebase initialized")
except:
    pass

# Lazy initialize Firestore client
_db = None

def get_db():
    global _db
    if _db is None:
        _db = firestore.client()
    return _db

# ====================
# UTILITY FUNCTIONS
# ====================

def generate_id(prefix: str = "") -> str:
    uid = uuid.uuid4().hex[:8]
    return f"{prefix}_{uid}" if prefix else uid

def serialize_firestore_doc(doc) -> Dict:
    if hasattr(doc, 'to_dict'):
        data = doc.to_dict()
        data['id'] = doc.id
        return data
    return doc

def serialize_firestore_docs(docs) -> list:
    return [serialize_firestore_doc(doc) for doc in docs]

def error_response(message: str, status_code: int = 400) -> Dict:
    return {"error": message, "success": False, "status_code": status_code}

def success_response(data: Any = None, message: str = "Success") -> Dict:
    response = {"success": True, "message": message}
    if data is not None:
        response["data"] = data
    return response

def create_response(data: Dict, status_code: int = 200):
    return (json.dumps(data, default=str), status_code, {'Content-Type': 'application/json'})

# ====================
# FIRESTORE REAL-TIME
# ====================

def emit_realtime_event(event_type: str, data: Dict, season_id: str = None):
    try:
        if not season_id and 'seasonId' in data:
            season_id = data['seasonId']
        if not season_id:
            return
        
        event_doc = {
            'type': event_type,
            'data': data,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'createdAt': datetime.now().isoformat()
        }
        
        # Use subcollection with auto-generated IDs to prevent overwriting
        base_path = f'liveAuctions/{season_id}/events'
        get_db().collection(base_path).add(event_doc)
        
        # Also update a single 'latestEvent' document in the events subcollection for quick access
        get_db().collection(base_path).document('latestEvent').set({
            'type': event_type,
            'data': data,
            'timestamp': firestore.SERVER_TIMESTAMP
        })
        print(f"✓ Event: {event_type}")
    except Exception as e:
        print(f"✗ Event error: {e}")


def _set_live_auction_state(season_id: str, updates: Dict):
    """Upsert the live auction state document used by Firestore listeners."""
    if not season_id:
        return
    try:
        updates = dict(updates or {})
        updates['updatedAt'] = datetime.now().isoformat()
        get_db().collection('liveAuctions').document(season_id).set(updates, merge=True)
    except Exception as e:
        print(f"✗ Live auction state update error: {e}")


def _set_current_player(season_id: str, player: Dict, base_price: int, duration: int = 120):
    """Write the canonical current player document consumed by all dashboards."""
    if not season_id:
        return
    try:
        payload = {
            'seasonId': season_id,
            'player': player,
            'basePrice': base_price,
            'duration': duration,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'createdAt': datetime.now().isoformat()
        }
        get_db().collection('liveAuctions').document(season_id).collection('currentPlayer').document('active').set(payload)
    except Exception as e:
        print(f"✗ Current player write error: {e}")


def _clear_current_player(season_id: str):
    """Remove the canonical current player doc so clients don't hydrate stale players."""
    if not season_id:
        return
    try:
        get_db().collection('liveAuctions').document(season_id).collection('currentPlayer').document('active').delete()
    except Exception as e:
        print(f"✗ Current player delete error: {e}")


def _emit_named_event_doc(season_id: str, doc_name: str, data: Dict):
    """Write a stable event doc (playerSold/playerUnsold/etc.) for legacy listeners."""
    if not season_id or not doc_name:
        return
    try:
        payload = dict(data or {})
        payload['timestamp'] = firestore.SERVER_TIMESTAMP
        payload['createdAt'] = datetime.now().isoformat()
        get_db().collection('liveAuctions').document(season_id).collection('events').document(doc_name).set(payload)
    except Exception as e:
        print(f"✗ Named event doc error ({doc_name}): {e}")

def emit_realtime_push(collection_name: str, data: Dict):
    try:
        data['timestamp'] = firestore.SERVER_TIMESTAMP
        data['createdAt'] = datetime.now().isoformat()
        doc_ref = get_db().collection(collection_name).document()
        doc_ref.set(data)
        return doc_ref.id
    except Exception as e:
        print(f"✗ Push error: {e}")
        return None

# ====================
# UNIFIED API ENDPOINT
# ====================

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["*"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def auction(req: https_fn.Request) -> https_fn.Response:
    """
    Single unified API endpoint for all routes - 'auction' function
    URL: https://your-function-url/auction/<resource>/<id>/<action>
    """
    try:
        # Parse path: /auction/users/123 -> ['auction', 'users', '123']
        path = req.path.strip('/').split('/')
        method = req.method
        
        # Get request data
        data = {}
        if method in ['POST', 'PUT', 'PATCH']:
            data = req.get_json(silent=True) or {}
        elif method == 'GET':
            data = dict(req.args)
        
        # Remove 'auction' or 'api' from path if present
        if path and path[0] in ['auction', 'api']:
            path = path[1:]
        
        # Root route
        if not path or path[0] == '':
            return create_response(success_response({"version": "1.0", "status": "running"}))
        
        resource = path[0] if len(path) > 0 else None
        resource_id = path[1] if len(path) > 1 else None
        action = path[2] if len(path) > 2 else None
        
        # Debug logging
        print(f"DEBUG: path={path}, method={method}, resource={resource}, resource_id={resource_id}, action={action}")
        
        # ===== USERS ROUTE - HANDLE EMAIL ENDPOINT =====
        if resource == 'users':
            if method == 'GET' and not resource_id:
                return get_users(data)
            elif method == 'GET' and resource_id:
                if resource_id == 'email' and action:
                    # /users/email/<email>
                    return get_user_by_email(action)
                else:
                    return get_user(resource_id)
            elif method == 'POST':
                return create_user(data)
            elif method == 'PUT' and resource_id:
                return update_user(resource_id, data)
            elif method == 'DELETE' and resource_id:
                return delete_user(resource_id)
        
        # ===== AUTH ROUTES =====
        elif resource == 'auth':
            # Handle /auth/login path (resource_id='login')
            if (action == 'login' or resource_id == 'login') and method == 'POST':
                return handle_login(data)
            elif (action == 'register' or resource_id == 'register') and method == 'POST':
                return handle_auth_register(data)
            elif (action == 'users' or resource_id == 'users') and method == 'GET':
                return get_auth_users(data)
            elif (action == 'complete-profile' or resource_id == 'complete-profile') and method == 'POST':
                return complete_auth_profile(data)
        
        # ===== REGISTRATION ROUTES =====
        elif resource == 'register':
            if action == 'admin' and method == 'POST':
                return handle_register_admin(data)
            elif action == 'auctioneer' and method == 'POST':
                return handle_register_auctioneer(data)
            elif action == 'team' and method == 'POST':
                return handle_register_team(data)
            elif action == 'player' and method == 'POST':
                return handle_register_player(data)
            elif action == 'guest' and method == 'POST':
                return handle_register_guest(data)
        
        # ===== TEAM ROUTES =====
        elif resource == 'teams':
            if method == 'GET' and not resource_id:
                return get_teams(data)
            elif method == 'GET' and resource_id:
                if action == 'budget':
                    return update_team_budget(resource_id, data) if method == 'PUT' else create_response(error_response("Method not allowed", 405), 405)
                else:
                    return get_team(resource_id)
            elif method == 'POST':
                return create_team(data)
            elif method == 'PUT' and resource_id:
                if action == 'budget':
                    return update_team_budget(resource_id, data)
                else:
                    return update_team(resource_id, data)
            elif method == 'DELETE' and resource_id:
                return delete_team(resource_id)
        
        # ===== AUCTIONEER ROUTES =====
        elif resource == 'auctioneers':
            if method == 'GET':
                return get_auctioneers(data)
            elif method == 'GET' and resource_id:
                return get_auctioneer(resource_id)
            elif method == 'POST':
                return create_auctioneer(data)
            elif method == 'PUT' and resource_id:
                return update_auctioneer(resource_id, data)
            elif method == 'DELETE' and resource_id:
                return delete_auctioneer(resource_id)
        
        elif resource == 'auctioneer':
            if action == 'approve' and method == 'POST':
                return approve_auctioneer(data)
            elif action == 'reject' and method == 'POST':
                return reject_auctioneer(data)
        
        # ===== PLAYER ROUTES =====
        elif resource == 'players':
            if method == 'GET' and not resource_id:
                return get_players(data)
            elif method == 'GET' and resource_id:
                return get_player(resource_id)
            elif method == 'POST':
                return create_player(data)
            elif method == 'PUT' and resource_id:
                return update_player(resource_id, data)
            elif method == 'DELETE' and resource_id:
                return delete_player(resource_id)
        
        # ===== PLAYER AUCTION ACTIONS =====
        elif resource == 'player':
            # For routes like /player/start, /player/close
            if resource_id == 'start' and method == 'POST':
                return start_player_bidding(data)
            elif resource_id == 'close' and method == 'POST':
                return close_player_bidding(data)
            elif resource_id == 'reset' and method == 'POST':
                return reset_live_auction(data)
        
        # ===== MATCH/AUCTION ROUTES =====
        elif resource == 'matches' or resource == 'auctions':
            if method == 'GET' and not resource_id:
                return get_matches(data)
            elif method == 'GET' and resource_id:
                return get_match(resource_id)
            elif method == 'POST':
                return create_match(data)
            elif method == 'PUT' and resource_id:
                return update_match(resource_id, data)
            elif method == 'DELETE' and resource_id:
                return delete_match(resource_id)
        
        # ===== BID ROUTES =====
        elif resource == 'bids':
            if method == 'GET':
                return get_bids(data)
            elif method == 'POST':
                return create_bid(data)
        
        # ===== AUCTION ACTIONS =====
        elif resource in ['start', 'bid', 'pause', 'resume', 'end']:
            if resource == 'start' and method == 'POST':
                return start_auction(data)
            elif resource == 'bid' and method == 'POST':
                return place_bid(data)
            elif resource == 'pause' and method == 'POST':
                return pause_auction(data)
            elif resource == 'resume' and method == 'POST':
                return resume_auction(data)
            elif resource == 'end' and method == 'POST':
                return end_auction(data)
        
        # ===== AUCTION (OLD STRUCTURE) =====
        elif resource == 'auction':
            # For routes like /auction/start, /auction/player/start
            auction_action = resource_id
            auction_subaction = action
            
            # Player-specific auction actions: /auction/player/start, /auction/player/close
            if auction_action == 'player':
                if auction_subaction == 'start' and method == 'POST':
                    return start_player_bidding(data)
                elif auction_subaction == 'close' and method == 'POST':
                    return close_player_bidding(data)
            # General auction actions
            elif auction_action == 'start' and method == 'POST':
                return start_auction(data)
            elif auction_action == 'bid' and method == 'POST':
                return place_bid(data)
            elif auction_action == 'pause' and method == 'POST':
                return pause_auction(data)
            elif auction_action == 'resume' and method == 'POST':
                return resume_auction(data)
            elif auction_action == 'end' and method == 'POST':
                return end_auction(data)
        
        # ===== HISTORY ROUTES =====
        elif resource == 'history':
            return get_history(data)
        
        # ===== DEBUG ROUTES =====
        elif resource == 'debug':
            if action == 'sync-all-teams' and method == 'POST':
                return debug_sync_all_teams(data)
            elif action == 'all-players' and method == 'GET':
                return debug_all_players(data)
            elif action == 'seed-users' and method == 'POST':
                return debug_seed_test_users()
        
        # ===== SPORTS ROUTES =====
        elif resource == 'sports':
            if method == 'GET':
                return get_sports(data)
            elif method == 'POST':
                return save_sports(data)
        
        # ===== AUCTIONS (CRUD) ROUTES =====
        elif resource == 'auctions':
            if method == 'GET' and not resource_id:
                return get_auctions(data)
            elif method == 'GET' and resource_id:
                return get_auction(resource_id)
            elif method == 'POST':
                return create_auction(data)
            elif method == 'PUT' and resource_id:
                return update_auction(resource_id, data)
            elif method == 'DELETE' and resource_id:
                return delete_auction(resource_id)
        
        # ===== APP STATE ROUTES =====
        elif resource == 'state':
            if method == 'GET':
                return get_state(data)
            elif method == 'POST':
                return save_state(data)
        
        # 404 Not Found
        return create_response(error_response(f"Route not found: {method} /{'/'.join(path)}", 404), 404)
    
    except Exception as e:
        print(f"API Error: {e}")
        traceback.print_exc()
        return create_response(error_response(f"Internal error: {str(e)}", 500), 500)

# ====================
# HANDLER FUNCTIONS
# ====================

def get_users(data):
    try:
        role = data.get('role')
        query = get_db().collection('users')
        if role:
            query = query.where('role', '==', role)
        docs = query.stream()
        users = serialize_firestore_docs(docs)
        return create_response(success_response(users))
    except Exception as e:
        return create_response(error_response(str(e)), 400)

def get_user(user_id):
    try:
        doc = get_db().collection('users').document(user_id).get()
        if not doc.exists:
            return create_response(error_response("User not found", 404), 404)
        return create_response(success_response(serialize_firestore_doc(doc)))
    except Exception as e:
        return create_response(error_response(str(e)), 400)

def create_user(data):
    try:
        user_id = data.get('id') or generate_id('user')
        data['id'] = user_id
        data['createdAt'] = datetime.now().isoformat()
        get_db().collection('users').document(user_id).set(data)
        return create_response(success_response(data), 201)
    except Exception as e:
        return create_response(error_response(str(e)), 400)

def update_user(user_id, data):
    try:
        doc_ref = get_db().collection('users').document(user_id)
        if not doc_ref.get().exists:
            return create_response(error_response("User not found", 404), 404)
        data['updatedAt'] = datetime.now().isoformat()
        doc_ref.update(data)
        return create_response(success_response(serialize_firestore_doc(doc_ref.get())))
    except Exception as e:
        return create_response(error_response(str(e)), 400)

def delete_user(user_id):
    try:
        get_db().collection('users').document(user_id).delete()
        return create_response(success_response(None, "Deleted"))
    except Exception as e:
        return create_response(error_response(str(e)), 400)

def handle_login(data):
    """Login user with email and password - checks all collections"""
    try:
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return create_response(error_response("Email and password required", 400), 400)
        
        print(f"🔐 Login attempt for email: {email}")
        
        # Check all role-specific collections
        collections = ['auctioneers', 'teams', 'players', 'guests', 'matches']
        
        for collection_name in collections:
            try:
                docs = list(get_db().collection(collection_name).where('email', '==', email).stream())
                
                if docs:
                    user_doc = docs[0]
                    user_data = user_doc.to_dict()
                    
                    # Check password
                    if user_data.get('password') != password:
                        print(f"❌ Password mismatch for {email}")
                        continue
                    
                    print(f"✅ Login successful for {email} from {collection_name}")
                    # Return user data (excluding password)
                    response_data = {k: v for k, v in user_data.items() if k != 'password'}
                    response_data['id'] = user_doc.id
                    response_data['collection'] = collection_name
                    
                    # Set role based on collection
                    if collection_name == 'auctioneers' and 'role' not in response_data:
                        response_data['role'] = 'AUCTIONEER'
                    elif collection_name == 'teams' and 'role' not in response_data:
                        response_data['role'] = 'TEAM_REP'
                    elif collection_name == 'players' and 'role' not in response_data:
                        response_data['role'] = 'PLAYER'
                    elif collection_name == 'guests' and 'role' not in response_data:
                        response_data['role'] = 'GUEST'
                    elif collection_name == 'matches' and 'role' not in response_data:
                        response_data['role'] = 'ADMIN'  # Admins are stored in matches collection
                    
                    return create_response(success_response({'user': response_data}, "Login successful"))
            except Exception as e:
                print(f"Error checking {collection_name}: {e}")
                continue
        
        print(f"❌ User not found: {email}")
        return create_response(error_response("Invalid email or password", 401), 401)
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        return create_response(error_response(f"Login failed: {str(e)}", 500), 500)

def handle_auth_register(data):
    """Register user via auth endpoint"""
    try:
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'GUEST').upper()
        
        if not email or not password:
            return create_response(error_response("Email and password required", 400), 400)
        
        # Map role to collection
        role_collection_map = {
            'AUCTIONEER': 'auctioneers',
            'TEAM_REP': 'teams',
            'PLAYER': 'players',
            'GUEST': 'guests'
        }
        
        collection_name = role_collection_map.get(role, 'guests')
        
        # Check if user already exists
        docs = list(get_db().collection(collection_name).where('email', '==', email).stream())
        if docs:
            return create_response(error_response("User already exists", 409), 409)
        
        # Create user
        user_data = {
            'email': email,
            'password': password,
            'role': role,
            'createdAt': datetime.now().isoformat(),
            'profileComplete': False
        }
        
        user_id = data.get('id') or generate_id('user')
        user_data['id'] = user_id
        
        get_db().collection(collection_name).document(user_id).set(user_data)
        
        response_data = {k: v for k, v in user_data.items() if k != 'password'}
        response_data['collection'] = collection_name
        
        return create_response(success_response({'user': response_data}, "Registration successful"), 201)
    except Exception as e:
        return create_response(error_response(f"Registration failed: {str(e)}", 500), 500)

def get_auth_users(data):
    """Get all registered users from all collections"""
    try:
        all_users = []
        collections = ['auctioneers', 'teams', 'players', 'guests', 'users']
        
        for collection_name in collections:
            docs = list(get_db().collection(collection_name).stream())
            for doc in docs:
                user_data = serialize_firestore_doc(doc)
                # Remove password from response
                user_data = {k: v for k, v in user_data.items() if k != 'password'}
                user_data['collection'] = collection_name
                all_users.append(user_data)
        
        return create_response(success_response(all_users, "Users retrieved successfully"))
    except Exception as e:
        return create_response(error_response(f"Failed to retrieve users: {str(e)}", 500), 500)

def complete_auth_profile(data):
    """Complete user profile after registration"""
    try:
        user_id = data.get('id')
        email = data.get('email')
        
        if not user_id or not email:
            return create_response(error_response("User ID and email required", 400), 400)
        
        # Try to find and update user in all collections
        collections = ['auctioneers', 'teams', 'players', 'guests', 'users']
        
        for collection_name in collections:
            try:
                doc_ref = get_db().collection(collection_name).document(user_id)
                if doc_ref.get().exists:
                    update_data = {
                        **data,
                        'profileComplete': True,
                        'updatedAt': datetime.now().isoformat()
                    }
                    # Remove password if provided
                    update_data.pop('password', None)
                    
                    doc_ref.update(update_data)
                    updated_doc = doc_ref.get()
                    response_data = serialize_firestore_doc(updated_doc)
                    response_data = {k: v for k, v in response_data.items() if k != 'password'}
                    
                    return create_response(success_response(response_data, "Profile completed successfully"))
            except Exception as e:
                print(f"Error updating {collection_name}: {e}")
                continue
        
        return create_response(error_response("User not found", 404), 404)
    except Exception as e:
        return create_response(error_response(f"Profile completion failed: {str(e)}", 500), 500)

# ===== AUCTIONEER HANDLERS =====
def get_auctioneers(data):
    """Get auctioneers with optional filtering"""
    try:
        query = get_db().collection('auctioneers')
        
        # Filter by email if provided
        if data.get('email'):
            query = query.where('email', '==', data.get('email'))
        
        # Filter by matchId if provided
        if data.get('matchId'):
            query = query.where('matchId', '==', data.get('matchId'))
        
        docs = list(query.stream())
        auctioneers = [serialize_firestore_doc(doc) for doc in docs]
        
        return create_response(success_response(auctioneers, "Auctioneers retrieved successfully"))
    except Exception as e:
        return create_response(error_response(f"Failed to retrieve auctioneers: {str(e)}", 500), 500)

def get_auctioneer(auctioneer_id):
    """Get single auctioneer by ID"""
    try:
        doc = get_db().collection('auctioneers').document(auctioneer_id).get()
        if not doc.exists:
            return create_response(error_response("Auctioneer not found", 404), 404)
        return create_response(success_response(serialize_firestore_doc(doc)))
    except Exception as e:
        return create_response(error_response(str(e)), 400)

def create_auctioneer(data):
    """Create new auctioneer"""
    try:
        auctioneer_id = data.get('id') or generate_id('auctioneer')
        data['id'] = auctioneer_id
        data['createdAt'] = datetime.now().isoformat()
        data['approvalStatus'] = 'PENDING'  # New auctioneers start as pending
        
        get_db().collection('auctioneers').document(auctioneer_id).set(data)
        return create_response(success_response(data), 201)
    except Exception as e:
        return create_response(error_response(str(e)), 400)

def update_auctioneer(auctioneer_id, data):
    """Update auctioneer"""
    try:
        doc_ref = get_db().collection('auctioneers').document(auctioneer_id)
        if not doc_ref.get().exists:
            return create_response(error_response("Auctioneer not found", 404), 404)
        
        data['updatedAt'] = datetime.now().isoformat()
        doc_ref.update(data)
        
        return create_response(success_response(serialize_firestore_doc(doc_ref.get())))
    except Exception as e:
        return create_response(error_response(str(e)), 400)

def delete_auctioneer(auctioneer_id):
    """Delete auctioneer"""
    try:
        get_db().collection('auctioneers').document(auctioneer_id).delete()
        return create_response(success_response(None, "Deleted"))
    except Exception as e:
        return create_response(error_response(str(e)), 400)

def approve_auctioneer(data):
    """Approve pending auctioneer"""
    try:
        auctioneer_id = data.get('id')
        if not auctioneer_id:
            return create_response(error_response("Auctioneer ID required", 400), 400)
        
        doc_ref = get_db().collection('auctioneers').document(auctioneer_id)
        if not doc_ref.get().exists:
            return create_response(error_response("Auctioneer not found", 404), 404)
        
        doc_ref.update({
            'approvalStatus': 'APPROVED',
            'approvedAt': datetime.now().isoformat()
        })
        
        updated_doc = serialize_firestore_doc(doc_ref.get())
        return create_response(success_response(updated_doc, "Auctioneer approved successfully"))
    except Exception as e:
        return create_response(error_response(str(e)), 400)

def reject_auctioneer(data):
    """Reject pending auctioneer"""
    try:
        auctioneer_id = data.get('id')
        reason = data.get('reason', 'No reason provided')
        
        if not auctioneer_id:
            return create_response(error_response("Auctioneer ID required", 400), 400)
        
        doc_ref = get_db().collection('auctioneers').document(auctioneer_id)
        if not doc_ref.get().exists:
            return create_response(error_response("Auctioneer not found", 404), 404)
        
        doc_ref.update({
            'approvalStatus': 'REJECTED',
            'rejectionReason': reason,
            'rejectedAt': datetime.now().isoformat()
        })
        
        updated_doc = serialize_firestore_doc(doc_ref.get())
        return create_response(success_response(updated_doc, "Auctioneer rejected successfully"))
    except Exception as e:
        return create_response(error_response(str(e)), 400)

def get_teams(data):
    match_id = data.get('matchId')
    query = get_db().collection('teams')
    if match_id:
        query = query.where('matchId', '==', match_id)
    docs = query.stream()
    return create_response(success_response(serialize_firestore_docs(docs)))

def get_team(team_id):
    doc = get_db().collection('teams').document(team_id).get()
    if not doc.exists:
        return create_response(error_response("Not found", 404), 404)
    return create_response(success_response(serialize_firestore_doc(doc)))

def create_team(data):
    team_id = data.get('id') or generate_id('team')
    data['id'] = team_id
    data['createdAt'] = datetime.now().isoformat()
    get_db().collection('teams').document(team_id).set(data)
    return create_response(success_response(data), 201)

def update_team(team_id, data):
    doc_ref = get_db().collection('teams').document(team_id)
    if not doc_ref.get().exists:
        return create_response(error_response("Not found", 404), 404)
    data['updatedAt'] = datetime.now().isoformat()
    doc_ref.update(data)
    return create_response(success_response(serialize_firestore_doc(doc_ref.get())))

def delete_team(team_id):
    get_db().collection('teams').document(team_id).delete()
    return create_response(success_response(None, "Deleted"))

def get_players(data):
    match_id = data.get('matchId')
    email = data.get('email')
    query = get_db().collection('players')
    if match_id:
        query = query.where('matchId', '==', match_id)
    if email:
        query = query.where('email', '==', email)
    docs = query.stream()
    return create_response(success_response(serialize_firestore_docs(docs)))

def get_player(player_id):
    doc = get_db().collection('players').document(player_id).get()
    if not doc.exists:
        return create_response(error_response("Not found", 404), 404)
    return create_response(success_response(serialize_firestore_doc(doc)))

def create_player(data):
    player_id = data.get('id') or generate_id('player')
    data['id'] = player_id
    data['createdAt'] = datetime.now().isoformat()
    get_db().collection('players').document(player_id).set(data)
    return create_response(success_response(data), 201)

def update_player(player_id, data):
    doc_ref = get_db().collection('players').document(player_id)
    if not doc_ref.get().exists:
        return create_response(error_response("Not found", 404), 404)
    data['updatedAt'] = datetime.now().isoformat()
    doc_ref.update(data)
    return create_response(success_response(serialize_firestore_doc(doc_ref.get())))

def delete_player(player_id):
    get_db().collection('players').document(player_id).delete()
    return create_response(success_response(None, "Deleted"))

def get_matches(data):
    docs = get_db().collection('matches').stream()
    return create_response(success_response(serialize_firestore_docs(docs)))

def get_match(match_id):
    doc = get_db().collection('matches').document(match_id).get()
    if not doc.exists:
        return create_response(error_response("Not found", 404), 404)
    return create_response(success_response(serialize_firestore_doc(doc)))

def create_match(data):
    match_id = data.get('id') or generate_id('match')
    data['id'] = match_id
    data['createdAt'] = datetime.now().isoformat()
    get_db().collection('matches').document(match_id).set(data)
    return create_response(success_response(data), 201)

def update_match(match_id, data):
    doc_ref = get_db().collection('matches').document(match_id)
    if not doc_ref.get().exists:
        return create_response(error_response("Not found", 404), 404)
    data['updatedAt'] = datetime.now().isoformat()
    doc_ref.update(data)
    emit_realtime_event('auctionState', serialize_firestore_doc(doc_ref.get()), match_id)
    return create_response(success_response(serialize_firestore_doc(doc_ref.get())))

def delete_match(match_id):
    get_db().collection('matches').document(match_id).delete()
    return create_response(success_response(None, "Deleted"))

def get_bids(data):
    season_id = data.get('seasonId')
    query = get_db().collection('bids')
    if season_id:
        query = query.where('seasonId', '==', season_id)
    docs = query.stream()
    return create_response(success_response(serialize_firestore_docs(docs)))

def create_bid(data):
    """Create a new bid and update auction state"""
    try:
        season_id = data.get('seasonId')
        team_id = data.get('teamId')
        amount = data.get('amount', 0)
        
        if not season_id or not team_id or not amount:
            return create_response(error_response("Missing required fields: seasonId, teamId, amount"), 400)
        
        # Get team to validate budget
        team_doc = get_db().collection('teams').document(team_id).get()
        if not team_doc.exists:
            return create_response(error_response("Team not found"), 404)
        
        team_data = serialize_firestore_doc(team_doc)
        
        # Validate budget (prefer remainingBudget if present)
        remaining_budget = team_data.get('remainingBudget')
        if remaining_budget is None:
            remaining_budget = team_data.get('budget', 0)

        if amount > remaining_budget:
            return create_response(error_response(
                f"Insufficient budget. Team has ₹{remaining_budget/100000:.1f}L remaining"
            ), 400)

        # Get current player from canonical Firestore doc (source of truth)
        player_id = None
        current_player_doc = get_db().collection('liveAuctions').document(season_id).collection('currentPlayer').document('active').get()
        if current_player_doc.exists:
            cp = current_player_doc.to_dict() or {}
            player_obj = cp.get('player') or {}
            player_id = cp.get('playerId') or player_obj.get('id')

        # Fallback: find any LIVE player if currentPlayer doc missing
        if not player_id:
            players_query = (
                get_db().collection('players')
                .where('matchId', '==', season_id)
                .where('status', '==', 'LIVE')
                .limit(1)
            )
            live_players = list(players_query.stream())
            if not live_players:
                return create_response(error_response("No active player bidding"), 404)
            player_doc = live_players[0]
        else:
            player_doc = get_db().collection('players').document(player_id).get()

        if not player_doc.exists:
            return create_response(error_response("Active player not found"), 404)

        player_data = serialize_firestore_doc(player_doc)
        
        # Validate bid amount is higher than current bid
        current_bid = player_data.get('currentBid', player_data.get('basePrice', 0))
        if amount <= current_bid:
            return create_response(error_response(f"Bid must be higher than current bid of ₹{current_bid/100000:.1f}L"), 400)
        
        # Create bid record
        bid_id = generate_id('bid')
        bid_data = {
            'id': bid_id,
            'seasonId': season_id,
            'teamId': team_id,
            'teamName': team_data.get('name', 'Unknown Team'),
            'playerId': player_data.get('id') or player_doc.id,
            'playerName': player_data.get('name', 'Unknown Player'),
            'amount': amount,
            'timestamp': datetime.now().isoformat(),
            'createdAt': firestore.SERVER_TIMESTAMP
        }
        
        get_db().collection('bids').document(bid_id).set(bid_data)
        
        # Update player with new bid
        target_player_id = player_data.get('id') or player_doc.id
        get_db().collection('players').document(target_player_id).update({
            'currentBid': amount,
            'leadingTeamId': team_id,
            'leadingTeamName': team_data.get('name', 'Unknown Team'),
            'updatedAt': datetime.now().isoformat()
        })

        # Update canonical live auction state docs so all dashboards converge
        _set_live_auction_state(season_id, {
            'status': 'LIVE',
            'currentPlayerId': target_player_id,
            'currentPlayerName': player_data.get('name'),
            'currentBid': amount,
            'leadingTeamId': team_id,
            'leadingTeamName': team_data.get('name'),
            'biddingActive': True
        })

        try:
            # Keep currentPlayer/active doc fresh for any consumers
            refreshed_player = serialize_firestore_doc(get_db().collection('players').document(target_player_id).get())
            _set_current_player(season_id, refreshed_player, refreshed_player.get('basePrice', 0))
        except Exception as e:
            print(f"✗ Failed to refresh currentPlayer doc after bid: {e}")
        
        # Emit real-time event
        emit_realtime_event('bid_placed', {
            'bidId': bid_id,
            'playerId': target_player_id,
            'playerName': player_data.get('name'),
            'teamId': team_id,
            'teamName': team_data.get('name'),
            'amount': amount,
            'seasonId': season_id
        }, season_id)
        
        return create_response(success_response(bid_data, "Bid placed successfully"), 201)
    except Exception as e:
        return create_response(error_response(f"Failed to place bid: {str(e)}"), 400)

def start_auction(data):
    match_id = data.get('matchId')
    if not match_id:
        return create_response(error_response("matchId required"), 400)
    
    doc_ref = get_db().collection('matches').document(match_id)
    doc_ref.update({'status': 'ONGOING', 'startedAt': datetime.now().isoformat()})
    
    match_data = serialize_firestore_doc(doc_ref.get())
    emit_realtime_event('auctionState', match_data, match_id)
    return create_response(success_response(match_data))

def place_bid(data):
    return create_bid(data)

def pause_auction(data):
    match_id = data.get('matchId')
    get_db().collection('matches').document(match_id).update({'status': 'PAUSED'})
    emit_realtime_event('auctionPaused', data, match_id)
    return create_response(success_response(data))

def resume_auction(data):
    match_id = data.get('matchId')
    get_db().collection('matches').document(match_id).update({'status': 'ONGOING'})
    emit_realtime_event('auctionResumed', data, match_id)
    return create_response(success_response(data))

def end_auction(data):
    match_id = data.get('matchId')
    get_db().collection('matches').document(match_id).update({
        'status': 'COMPLETED',
        'endedAt': datetime.now().isoformat()
    })
    emit_realtime_event('auctionEnded', data, match_id)
    return create_response(success_response(data))

def get_history(data):
    season_id = data.get('seasonId')
    query = get_db().collection('history')
    if season_id:
        query = query.where('seasonId', '==', season_id)
    docs = query.stream()
    return create_response(success_response(serialize_firestore_docs(docs)))

def get_auction_state(season_id):
    try:
        doc = get_db().collection('matches').document(season_id).get()
        if not doc.exists:
            return create_response(error_response("Auction not found", 404), 404)
        return create_response(success_response(serialize_firestore_doc(doc)))
    except Exception as e:
        return create_response(error_response(str(e)), 400)
def sync_team_player_ids(team_id: str):
    """Synchronize team's playerIds from players marked as SOLD to that team"""
    try:
        print(f'Syncing playerIds for team: {team_id}')
        players_query = get_db().collection('players').where('soldTo', '==', team_id)
        all_players = list(players_query.stream())
        
        print(f'  Found {len(all_players)} players with soldTo={team_id}')
        
        sold_players = [p for p in all_players if p.to_dict().get('status') == 'SOLD']
        sold_player_ids = [p.id for p in sold_players]
        
        print(f'  Filtered to {len(sold_player_ids)} SOLD players: {sold_player_ids}')
        
        get_db().collection('teams').document(team_id).update({
            'playerIds': sold_player_ids
        })
        print(f'  Updated team {team_id}: playerIds = {sold_player_ids}')
        
        return sold_player_ids
    except Exception as e:
        print(f'Error syncing team playerIds for {team_id}: {e}')
        import traceback
        traceback.print_exc()
        return []

def handle_register_admin(data):
    """Register an admin user in matches collection"""
    try:
        required_fields = ['fullName', 'email', 'password']
        if not all(field in data for field in required_fields):
            return create_response(error_response(f"Missing required fields: {required_fields}"), 400)
        
        email = data.get('email', '').lower().strip()
        
        # Check if email already exists in any collection
        for collection in ['matches', 'auctioneers', 'teams', 'players', 'guests']:
            existing = list(get_db().collection(collection).where('email', '==', email).stream())
            if existing:
                return create_response(error_response(f"Email {email} already registered", 409), 409)
        
        # Create admin user in 'matches' collection
        user_id = generate_id('admin')
        user_data = {
            'id': user_id,
            'name': data.get('fullName'),
            'email': email,
            'password': data.get('password'),
            'phone': data.get('phone', ''),
            'role': 'ADMIN',
            'adminId': user_id,
            'organizationName': data.get('organizationName', ''),
            'organizationType': data.get('organizationType', ''),
            'adminApprovalStatus': 'APPROVED',  # Auto-approve admins
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        
        get_db().collection('matches').document(user_id).set(user_data)
        print(f"✅ Admin registered in matches collection: {email}")
        
        # Return user data without password
        response_data = {k: v for k, v in user_data.items() if k != 'password'}
        return create_response(success_response(response_data, "Admin registered successfully"), 201)
    except Exception as e:
        print(f"❌ Error registering admin: {str(e)}")
        return create_response(error_response(str(e), 500), 500)

def handle_register_auctioneer(data):
    """Register an auctioneer for a specific match"""
    try:
        required_fields = ['fullName', 'email', 'password', 'seasonId']
        if not all(field in data for field in required_fields):
            return create_response(error_response(f"Missing required fields: {required_fields}"), 400)
        
        for collection in ['auctioneers', 'teams', 'players', 'guests', 'matches', 'users']:
            existing = list(get_db().collection(collection).where('email', '==', data['email']).stream())
            if existing:
                return create_response(error_response(f"Email {data['email']} already registered", 409), 409)
        
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
        
        print(f"✅ Creating auctioneer: {user_id} - {data['email']}")
        get_db().collection('auctioneers').document(user_id).set(user_data)
        print(f"✅ Auctioneer registered successfully in Firebase")
        
        return create_response(success_response({'userId': user_id, 'auctioneerId': user_id}, "Auctioneer registered successfully"), 201)
    except Exception as e:
        return create_response(error_response(f"Failed to register auctioneer: {str(e)}"), 400)

def handle_register_team(data):
    """Register a team representative and create team for a specific match"""
    try:
        required_fields = ['fullName', 'email', 'password', 'seasonId', 'teamName']
        if not all(field in data for field in required_fields):
            return create_response(error_response(f"Missing required fields: {required_fields}"), 400)
        
        for collection in ['auctioneers', 'teams', 'players', 'guests', 'matches', 'users']:
            existing = list(get_db().collection(collection).where('email', '==', data['email']).stream())
            if existing:
                return create_response(error_response(f"Email {data['email']} already registered", 409), 409)
        
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
        
        get_db().collection('teams').document(team_id).set(team_data)
        
        return create_response(success_response({'teamId': team_id}, "Team registered successfully"), 201)
    except Exception as e:
        return create_response(error_response(f"Failed to register team: {str(e)}"), 400)

def handle_register_player(data):
    """Register a player for a specific match"""
    try:
        required_fields = ['fullName', 'email', 'password', 'seasonId', 'basePrice', 'playingRole']
        if not all(field in data for field in required_fields):
            return create_response(error_response(f"Missing required fields: {required_fields}"), 400)
        
        for collection in ['auctioneers', 'teams', 'players', 'guests', 'matches', 'users']:
            existing = list(get_db().collection(collection).where('email', '==', data['email']).stream())
            if existing:
                return create_response(error_response(f"Email {data['email']} already registered", 409), 409)
        
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
        
        get_db().collection('players').document(player_id).set(player_data)
        
        return create_response(success_response({'playerId': player_id}, "Player registered successfully"), 201)
    except Exception as e:
        return create_response(error_response(f"Failed to register player: {str(e)}"), 400)

def handle_register_guest(data):
    """Register a guest for a specific match"""
    try:
        required_fields = ['fullName', 'email', 'password', 'seasonId']
        if not all(field in data for field in required_fields):
            return create_response(error_response(f"Missing required fields: {required_fields}"), 400)
        
        for collection in ['auctioneers', 'teams', 'players', 'guests', 'matches', 'users']:
            existing = list(get_db().collection(collection).where('email', '==', data['email']).stream())
            if existing:
                return create_response(error_response(f"Email {data['email']} already registered", 409), 409)
        
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
        
        get_db().collection('guests').document(user_id).set(user_data)
        
        return create_response(success_response({'guestId': user_id}, "Guest registered successfully"), 201)
    except Exception as e:
        return create_response(error_response(f"Failed to register guest: {str(e)}"), 400)

def get_user_by_email(email):
    try:
        docs = list(get_db().collection('users').where('email', '==', email).stream())
        if not docs:
            return create_response(error_response(f"User with email {email} not found", 404), 404)
        return create_response(success_response(serialize_firestore_doc(docs[0])))
    except Exception as e:
        return create_response(error_response(str(e)), 400)

def update_team_budget(team_id, data):
    """Update team's remaining budget after a purchase"""
    try:
        amount = data.get('amount')
        if amount is None:
            return create_response(error_response("Missing 'amount' field"), 400)
        
        team_ref = get_db().collection('teams').document(team_id)
        team = team_ref.get()
        
        if not team.exists:
            return create_response(error_response(f"Team {team_id} not found", 404), 404)
        
        current_budget = team.get('remainingBudget', 0)
        new_budget = current_budget - amount
        
        if new_budget < 0:
            return create_response(error_response("Insufficient budget", 400), 400)
        
        team_ref.update({
            'remainingBudget': new_budget,
            'updatedAt': datetime.now().isoformat()
        })
        
        updated = team_ref.get()
        return create_response(success_response(serialize_firestore_doc(updated), "Budget updated successfully"))
    except Exception as e:
        return create_response(error_response(str(e)), 400)

def start_player_bidding(data):
    """Start bidding for a specific player"""
    try:
        season_id = data.get('seasonId')
        player_id = data.get('playerId')
        base_price = data.get('basePrice', 0)
        
        if not season_id or not player_id:
            return create_response(error_response("Missing seasonId or playerId"), 400)
        
        # Ensure only ONE player is LIVE at a time for this season.
        # If previous runs left multiple players as LIVE, normalize them back to AVAILABLE.
        live_players = list(
            get_db()
            .collection('players')
            .where('matchId', '==', season_id)
            .where('status', '==', 'LIVE')
            .stream()
        )
        for doc in live_players:
            if doc.id != player_id:
                get_db().collection('players').document(doc.id).update({
                    'status': 'AVAILABLE',
                    'updatedAt': datetime.now().isoformat()
                })

        # Update player status to LIVE and reset bid data
        player_ref = get_db().collection('players').document(player_id)
        player_ref.update({
            'status': 'LIVE',
            'currentBid': base_price,
            'basePrice': base_price,
            'leadingTeamId': None,
            'leadingTeamName': None,
            'updatedAt': datetime.now().isoformat()
        })

        # Fetch updated player so we can broadcast a full object
        updated_player = serialize_firestore_doc(player_ref.get())

        # Canonical current player doc (all dashboards listen here)
        _set_current_player(season_id, updated_player, base_price)

        # Update canonical live auction state doc (all dashboards listen here)
        _set_live_auction_state(season_id, {
            'status': 'LIVE',
            'currentPlayerId': player_id,
            'currentPlayerName': updated_player.get('name'),
            'currentBid': base_price,
            'leadingTeamId': None,
            'leadingTeamName': None,
            'biddingActive': True,
            'remainingSeconds': 0
        })
        
        # Emit real-time event
        emit_realtime_event('player_bidding_started', {
            'player': updated_player,
            'playerId': player_id,
            'basePrice': base_price,
            'seasonId': season_id
        }, season_id)
        
        return create_response(success_response({
            'playerId': player_id,
            'status': 'LIVE',
            'basePrice': base_price
        }, "Player bidding started"))
    except Exception as e:
        return create_response(error_response(f"Failed to start player bidding: {str(e)}"), 400)

def close_player_bidding(data):
    """Close bidding for current player"""
    try:
        season_id = data.get('seasonId')
        sold = data.get('sold', False)
        
        if not season_id:
            return create_response(error_response("Missing seasonId"), 400)
        
        # Get current player from canonical doc first
        player_id = None
        current_player_doc = get_db().collection('liveAuctions').document(season_id).collection('currentPlayer').document('active').get()
        if current_player_doc.exists:
            cp = current_player_doc.to_dict() or {}
            player_obj = cp.get('player') or {}
            player_id = cp.get('playerId') or player_obj.get('id')

        if player_id:
            player_doc = get_db().collection('players').document(player_id).get()
            if not player_doc.exists:
                return create_response(error_response("Active player not found"), 404)
        else:
            players_query = (
                get_db().collection('players')
                .where('matchId', '==', season_id)
                .where('status', '==', 'LIVE')
                .limit(1)
            )
            live_players = list(players_query.stream())
            if not live_players:
                return create_response(error_response("No active player bidding found"), 404)
            player_doc = live_players[0]

        player_data = serialize_firestore_doc(player_doc)
        
        # Update player status (preserve currentBid and team data)
        new_status = 'SOLD' if sold else 'UNSOLD'
        target_player_id = player_data.get('id') or player_doc.id
        player_ref = get_db().collection('players').document(target_player_id)
        update_data = {
            'status': new_status,
            'updatedAt': datetime.now().isoformat()
        }
        # If unsold, clear bid data
        if not sold:
            update_data['currentBid'] = player_data.get('basePrice', 0)
            update_data['leadingTeamId'] = None
            update_data['leadingTeamName'] = None
        player_ref.update(update_data)

        # Update live auction state + clear current player
        _set_live_auction_state(season_id, {
            'currentPlayerId': None,
            'currentPlayerName': None,
            'biddingActive': False,
            'leadingTeamId': None,
            'leadingTeamName': None
        })

        # Clear canonical current player doc to prevent stale hydration
        _clear_current_player(season_id)

        # Write stable event docs used by existing listeners
        if sold:
            _emit_named_event_doc(season_id, 'playerSold', {
                'playerId': target_player_id,
                'playerName': player_data.get('name'),
                'teamId': player_data.get('leadingTeamId'),
                'teamName': player_data.get('leadingTeamName'),
                'finalAmount': player_data.get('currentBid', 0),
                'seasonId': season_id
            })
        else:
            _emit_named_event_doc(season_id, 'playerUnsold', {
                'playerId': target_player_id,
                'playerName': player_data.get('name'),
                'finalAmount': player_data.get('basePrice', 0),
                'seasonId': season_id
            })
        
        # Emit real-time event
        emit_realtime_event('player_bidding_closed', {
            'playerId': target_player_id,
            'status': new_status,
            'sold': sold,
            'finalBid': player_data.get('currentBid', 0),
            'teamId': player_data.get('teamId'),
            'seasonId': season_id
        }, season_id)
        
        return create_response(success_response({
            'playerId': target_player_id,
            'status': new_status,
            'sold': sold
        }, f"Player bidding closed - {new_status}"))
    except Exception as e:
        return create_response(error_response(f"Failed to close player bidding: {str(e)}"), 400)


def reset_live_auction(data):
    """Admin/Auctioneer utility: clear live auction state and remove currentPlayer/active without touching player records."""
    try:
        season_id = data.get('seasonId')
        if not season_id:
            return create_response(error_response("Missing seasonId"), 400)

        # Normalize any lingering LIVE players back to AVAILABLE.
        try:
            live_players = list(
                get_db().collection('players')
                .where('matchId', '==', season_id)
                .where('status', '==', 'LIVE')
                .stream()
            )
            for pdoc in live_players:
                pdata = pdoc.to_dict() or {}
                base_price = pdata.get('basePrice') or 0
                get_db().collection('players').document(pdoc.id).update({
                    'status': 'AVAILABLE',
                    'currentBid': base_price,
                    'leadingTeamId': None,
                    'leadingTeamName': None,
                    'updatedAt': datetime.now().isoformat()
                })
        except Exception as e:
            print(f"✗ Reset normalization warning: {e}")

        _set_live_auction_state(season_id, {
            'currentPlayerId': None,
            'currentPlayerName': None,
            'currentBid': 0,
            'leadingTeamId': None,
            'leadingTeamName': None,
            'biddingActive': False,
        })
        _clear_current_player(season_id)

        emit_realtime_event('auction_reset', {
            'seasonId': season_id,
            'reason': data.get('reason') or 'manual_reset'
        }, season_id)

        return create_response(success_response({'seasonId': season_id}, 'Live auction reset'))
    except Exception as e:
        return create_response(error_response(f"Failed to reset live auction: {str(e)}"), 400)

def debug_sync_all_teams(data):
    """DEBUG: Force sync all teams with their sold players"""
    try:
        teams_docs = get_db().collection('teams').stream()
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
        
        return create_response(success_response(results, "Synced all teams"))
    except Exception as e:
        print(f'Error in debug sync: {e}')
        import traceback
        traceback.print_exc()
        return create_response(error_response(f"Debug sync failed: {str(e)}"), 400)

def debug_all_players(data):
    """DEBUG: Get all SOLD players with their team assignments"""
    try:
        players_query = get_db().collection('players').where('status', '==', 'SOLD')
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
        
        return create_response(success_response(player_list, f"Found {len(player_list)} sold players"))
    except Exception as e:
        return create_response(error_response(f"Failed to get players: {str(e)}"), 400)

# ===== AUCTION CRUD HANDLERS =====
def get_auctions(data):
    """Get all auctions with optional filtering"""
    try:
        query = get_db().collection('auctions')
        
        # Filter by matchId if provided
        if data.get('matchId'):
            query = query.where('matchId', '==', data.get('matchId'))
        
        docs = list(query.stream())
        auctions = [serialize_firestore_doc(doc) for doc in docs]
        
        return create_response(success_response(auctions, "Auctions retrieved successfully"))
    except Exception as e:
        return create_response(error_response(f"Failed to retrieve auctions: {str(e)}", 500), 500)

def get_auction(auction_id):
    """Get single auction by ID"""
    try:
        doc = get_db().collection('auctions').document(auction_id).get()
        if not doc.exists:
            return create_response(error_response("Auction not found", 404), 404)
        return create_response(success_response(serialize_firestore_doc(doc)))
    except Exception as e:
        return create_response(error_response(str(e)), 400)

def create_auction(data):
    """Create new auction"""
    try:
        auction_id = data.get('id') or generate_id('auction')
        data['id'] = auction_id
        data['createdAt'] = datetime.now().isoformat()
        data['status'] = data.get('status', 'PENDING')
        
        get_db().collection('auctions').document(auction_id).set(data)
        return create_response(success_response(data), 201)
    except Exception as e:
        return create_response(error_response(str(e)), 400)

def update_auction(auction_id, data):
    """Update auction"""
    try:
        doc_ref = get_db().collection('auctions').document(auction_id)
        if not doc_ref.get().exists:
            return create_response(error_response("Auction not found", 404), 404)
        
        data['updatedAt'] = datetime.now().isoformat()
        doc_ref.update(data)
        
        return create_response(success_response(serialize_firestore_doc(doc_ref.get())))
    except Exception as e:
        return create_response(error_response(str(e)), 400)

def delete_auction(auction_id):
    """Delete auction"""
    try:
        get_db().collection('auctions').document(auction_id).delete()
        return create_response(success_response(None, "Deleted"))
    except Exception as e:
        return create_response(error_response(str(e)), 400)

def get_sports(data):
    """Get all sports data aggregated from Firestore"""
    try:
        sports_data = []
        
        # Get all matches with their associated players and teams
        matches_docs = get_db().collection('matches').stream()
        
        for match_doc in matches_docs:
            match_data = serialize_firestore_doc(match_doc)
            
            # Get players for this match
            players_docs = get_db().collection('players').where('matchId', '==', match_doc.id).stream()
            players = [serialize_firestore_doc(p) for p in players_docs]
            
            # Get teams for this match
            teams_docs = get_db().collection('teams').where('matchId', '==', match_doc.id).stream()
            teams = [serialize_firestore_doc(t) for t in teams_docs]
            
            # Get bid history for this match
            bids_docs = get_db().collection('bids').where('matchId', '==', match_doc.id).stream()
            history = [serialize_firestore_doc(b) for b in bids_docs]
            
            # Add players, teams, and history to match data
            match_data['players'] = players
            match_data['teams'] = teams
            match_data['history'] = history
            
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
        
        return create_response(success_response(sports_data, "Sports data retrieved successfully"))
    except Exception as e:
        return create_response(error_response(f"Failed to retrieve sports data: {str(e)}"), 400)

def save_sports(data):
    """Save all sports data to Firestore"""
    try:
        sports_list = data if isinstance(data, list) else []
        
        # Process each sport's matches, players, and teams
        for sport_data in sports_list:
            sport_type = sport_data.get('sportType', 'CUSTOM')
            
            for match in sport_data.get('matches', []):
                match_id = match.get('id')
                
                # Save match (exclude nested arrays and prevent duplicate fields)
                match_to_save = {k: v for k, v in match.items() if k not in ['players', 'teams', 'history']}
                match_to_save['sport'] = sport_type
                match_to_save['updatedAt'] = datetime.now().isoformat()
                
                get_db().collection('matches').document(match_id).set(match_to_save, merge=True)
                
                # Save players
                for player in match.get('players', []):
                    player_id = player.get('id')
                    player_to_save = {**player, 'matchId': match_id, 'updatedAt': datetime.now().isoformat()}
                    get_db().collection('players').document(player_id).set(player_to_save, merge=True)
                
                # Save teams
                for team in match.get('teams', []):
                    team_id = team.get('id')
                    team_to_save = {**team, 'matchId': match_id, 'updatedAt': datetime.now().isoformat()}
                    get_db().collection('teams').document(team_id).set(team_to_save, merge=True)
        
        return create_response(success_response({"saved": True}, "Sports data saved successfully"))
    except Exception as e:
        return create_response(error_response(f"Failed to save sports data: {str(e)}"), 400)

def get_state(data):
    """Get current application state"""
    try:
        doc = get_db().collection('appState').document('current').get()
        
        if doc.exists:
            state = serialize_firestore_doc(doc)
            return create_response(success_response(state, "App state retrieved successfully"))
        else:
            # Return default state
            default_state = {
                'currentSport': None,
                'currentAuctionId': None,
                'currentMatchId': None
            }
            return create_response(success_response(default_state, "Default app state"))
    except Exception as e:
        return create_response(error_response(f"Failed to retrieve app state: {str(e)}"), 400)

def save_state(data):
    """Update application state"""
    try:
        state_data = {
            **data,
            'updatedAt': datetime.now().isoformat()
        }
        
        get_db().collection('appState').document('current').set(state_data, merge=True)
        
        return create_response(success_response(state_data, "App state updated successfully"))
    except Exception as e:
        return create_response(error_response(f"Failed to update app state: {str(e)}"), 400)

def debug_seed_test_users():
    """Create test users for development/testing"""
    try:
        # Create test admin user
        admin_user = {
            'id': 'admin_test_001',
            'email': 'admin@test.com',
            'password': 'admin123',  # In production, never store plain passwords!
            'name': 'Test Admin',
            'role': 'ADMIN',
            'organizationName': 'HypeHammer Admin',
            'adminApprovalStatus': 'APPROVED',
            'createdAt': datetime.now().isoformat()
        }
        get_db().collection('users').document('admin_test_001').set(admin_user)
        print('✓ Created test admin user')
        
        # Create test auctioneer user with APPROVED status
        auctioneer_user = {
            'id': 'auctioneer_test_001',
            'email': 'auctioneer@test.com',
            'password': 'auctioneer123',
            'name': 'Test Auctioneer',
            'role': 'AUCTIONEER',
            'approvalStatus': 'APPROVED',  # Set to APPROVED
            'approvedAt': datetime.now().isoformat(),
            'auctioneerLicense': 'TEST123',
            'experience': '5 years',
            'createdAt': datetime.now().isoformat()
        }
        get_db().collection('auctioneers').document('auctioneer_test_001').set(auctioneer_user)
        print('✓ Created test auctioneer user (APPROVED)')
        
        # Create test team rep
        team_rep_user = {
            'id': 'team_rep_test_001',
            'email': 'teamrep@test.com',
            'password': 'teamrep123',
            'name': 'Test Team Rep',
            'role': 'TEAM_REP',
            'teamName': 'Test Team',
            'teamApprovalStatus': 'APPROVED',
            'createdAt': datetime.now().isoformat()
        }
        get_db().collection('teams').document('team_rep_test_001').set(team_rep_user)
        print('✓ Created test team rep user')
        
        # Create test player
        player_user = {
            'id': 'player_test_001',
            'email': 'player@test.com',
            'password': 'player123',
            'name': 'Test Player',
            'role': 'PLAYER',
            'playerRole': 'Batsman',
            'playerApprovalStatus': 'APPROVED',
            'createdAt': datetime.now().isoformat()
        }
        get_db().collection('players').document('player_test_001').set(player_user)
        print('✓ Created test player user')
        
        return create_response(success_response({
            'admin': admin_user,
            'auctioneer': auctioneer_user,
            'teamRep': team_rep_user,
            'player': player_user
        }, "Test users created successfully"))
    except Exception as e:
        print(f"Error seeding test users: {e}")
        return create_response(error_response(f"Failed to seed users: {str(e)}", 500), 500)

