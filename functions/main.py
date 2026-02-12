"""
HypeHammer Firebase Cloud Functions - Unified API
Single Cloud Function with all routes handled via path routing
"""

from firebase_functions import https_fn, options
from firebase_admin import credentials, firestore, initialize_app, storage
from datetime import datetime
from typing import Dict, Any
import uuid
import json
import traceback
import os
from werkzeug.utils import secure_filename

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

# Lazy initialize Storage bucket
_bucket = None

def get_storage_bucket():
    global _bucket
    if _bucket is None:
        _bucket = storage.bucket()
    return _bucket

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
# FILE UPLOAD FUNCTIONS
# ====================

ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
ALLOWED_PDF_EXTENSIONS = {'pdf'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

def validate_file(file, file_type: str = 'image'):
    """Validate file size and extension"""
    allowed_extensions = ALLOWED_IMAGE_EXTENSIONS if file_type == 'image' else ALLOWED_PDF_EXTENSIONS
    
    if file.content_length and file.content_length > MAX_FILE_SIZE:
        raise ValueError(f"File size exceeds {MAX_FILE_SIZE / (1024*1024)}MB limit")
    
    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
    if ext not in allowed_extensions:
        raise ValueError(f"File type .{ext} not allowed. Allowed: {', '.join(allowed_extensions)}")
    
    return filename, ext

def upload_file_to_storage(file, folder: str, file_type: str = 'image') -> str:
    """
    Upload file to Firebase Storage and return download URL
    
    Args:
        file: Flask file object
        folder: Storage folder (e.g., 'players/photos', 'documents')
        file_type: 'image' or 'pdf'
    
    Returns:
        Download URL of the uploaded file
    """
    try:
        # Validate file
        filename, ext = validate_file(file, file_type)
        
        # Generate unique filename with timestamp
        timestamp = int(datetime.now().timestamp() * 1000)
        unique_filename = f"{timestamp}_{uuid.uuid4().hex[:8]}.{ext}"
        storage_path = f"{folder}/{unique_filename}"
        
        # Get storage bucket
        bucket = get_storage_bucket()
        blob = bucket.blob(storage_path)
        
        # Upload file
        print(f"📤 Uploading file: {storage_path}")
        blob.upload_from_string(
            file.read(),
            content_type=file.content_type
        )
        
        # Make blob publicly readable for getting download URL
        blob.make_public()
        
        download_url = blob.public_url
        print(f"✅ File uploaded successfully: {download_url}")
        
        return download_url
    
    except ValueError as e:
        raise ValueError(f"File validation error: {str(e)}")
    except Exception as e:
        print(f"❌ File upload error: {e}")
        raise Exception(f"Failed to upload file: {str(e)}")

def handle_file_upload(req: https_fn.Request, folder: str, file_type: str = 'image'):
    """Handle file upload request"""
    try:
        if 'file' not in req.files:
            return create_response(error_response("No file provided"), 400)
        
        file = req.files['file']
        
        if file.filename == '':
            return create_response(error_response("No file selected"), 400)
        
        # Upload to Firebase Storage
        download_url = upload_file_to_storage(file, folder, file_type)
        
        response_data = {
            'success': True,
            'url': download_url,
            'filename': file.filename,
            'fileType': file_type,
            'uploadedAt': datetime.now().isoformat()
        }
        
        return create_response(response_data, 200)
    
    except ValueError as e:
        return create_response(error_response(str(e)), 400)
    except Exception as e:
        print(f"❌ Upload handler error: {e}")
        return create_response(error_response(f"Upload failed: {str(e)}"), 500)

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
            elif (action == 'debug-admins' or resource_id == 'debug-admins') and method == 'GET':
                # Debug endpoint - list all admin documents
                try:
                    docs = list(get_db().collection('matches').where('role', '==', 'ADMIN').stream())
                    admins = []
                    for doc in docs:
                        data = doc.to_dict()
                        admins.append({
                            'id': doc.id,
                            'email': data.get('email'),
                            'name': data.get('name'),
                            'password': data.get('password'),
                            'role': data.get('role'),
                            'has_password': 'password' in data
                        })
                    return create_response(success_response(admins, f"Found {len(admins)} admins"))
                except Exception as e:
                    return create_response(error_response(f"Debug error: {str(e)}"), 500)
        
        # ===== REGISTRATION ROUTES =====
        elif resource == 'register':
            # Handle both /register/admin and /register/admin as resource_id
            reg_type = action or resource_id
            print(f"📝 REGISTER: reg_type={reg_type}, action={action}, resource_id={resource_id}, method={method}")
            if reg_type == 'admin' and method == 'POST':
                print(f"✓ Handling admin registration")
                return handle_register_admin(data)
            elif reg_type == 'auctioneer' and method == 'POST':
                print(f"✓ Handling auctioneer registration")
                return handle_register_auctioneer(data)
            elif reg_type == 'team' and method == 'POST':
                print(f"✓ Handling team registration")
                return handle_register_team(data)
            elif reg_type == 'player' and method == 'POST':
                print(f"✓ Handling player registration")
                return handle_register_player(data)
            elif reg_type == 'guest' and method == 'POST':
                print(f"✓ Handling guest registration")
                return handle_register_guest(data)
            else:
                print(f"✗ No matching registration type for: {reg_type}")
        
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
            if resource_id == 'approve' and method == 'POST':
                return approve_auctioneer(data)
            elif resource_id == 'reject' and method == 'POST':
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
            # For routes like /player/start, /player/close, /player/unsold, /player/next
            if resource_id == 'start' and method == 'POST':
                return start_player_bidding(data)
            elif resource_id == 'close' and method == 'POST':
                return close_player_bidding(data)
            elif resource_id == 'unsold' and method == 'POST':
                return mark_player_unsold(data)
            elif resource_id == 'next' and method == 'POST':
                return get_next_player(data)
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
        
        # ===== MATCH STATUS UPDATE (Admin only) =====
        elif resource == 'match-status' and method == 'PUT' and resource_id:
            return update_match_status(resource_id, data)
        
        # ===== AUCTION (OLD STRUCTURE) =====
        elif resource == 'auction':
            # For routes like /auction/start, /auction/player/start
            auction_action = resource_id
            auction_subaction = action
            
            # Player-specific auction actions: /auction/player/start, /auction/player/close, /auction/player/unsold, /auction/player/next
            if auction_action == 'player':
                if auction_subaction == 'start' and method == 'POST':
                    return start_player_bidding(data)
                elif auction_subaction == 'close' and method == 'POST':
                    return close_player_bidding(data)
                elif auction_subaction == 'unsold' and method == 'POST':
                    return mark_player_unsold(data)
                elif auction_subaction == 'next' and method == 'POST':
                    return get_next_player(data)
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
        
        # ===== RE-AUCTION ROUTES =====
        elif resource == 'reauction':
            if resource_id == 'start' and method == 'POST':
                return start_reauction_unsold(data)
        
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
            elif action == 'migrate-sold-players' and method == 'POST':
                return migrate_sold_players_data(data)
        
        # ===== SPORTS ROUTES =====
        elif resource == 'sports':
            if method == 'GET':
                return get_sports(data)
            elif method == 'POST':
                return save_sports(data)
        
        # ===== FILE UPLOAD ROUTES =====
        elif resource == 'upload':
            if method == 'POST':
                upload_type = resource_id  # e.g., 'player-photo', 'team-logo', 'document', 'custom'
                
                if upload_type == 'player-photo':
                    return handle_file_upload(req, 'players/photos', 'image')
                elif upload_type == 'team-logo':
                    return handle_file_upload(req, 'teams/logos', 'image')
                elif upload_type == 'profile-picture':
                    return handle_file_upload(req, 'users/profiles', 'image')
                elif upload_type == 'auction-recording':
                    return handle_file_upload(req, 'auctions/recordings', 'video')
                elif upload_type == 'auction-replay':
                    return handle_file_upload(req, 'auctions/replays', 'video')
                elif upload_type == 'document':
                    return handle_file_upload(req, 'documents', 'pdf')
                elif upload_type == 'match-highlight':
                    return handle_file_upload(req, 'matches/highlights', 'video')
                elif upload_type == 'custom':
                    # Custom folder upload: /upload/custom?folder=folder_name&type=image
                    folder = data.get('folder') or req.args.get('folder')
                    file_type = data.get('type') or req.args.get('type', 'image')
                    if not folder:
                        return create_response(error_response("folder query parameter required for custom uploads"), 400)
                    return handle_file_upload(req, folder, file_type)
                else:
                    return create_response(error_response(f"Unknown upload type: {upload_type}"), 400)
            else:
                return create_response(error_response("Use POST method for file uploads"), 405)
        
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
        email = data.get('email', '').lower().strip()
        password = data.get('password')
        
        if not email or not password:
            return create_response(error_response("Email and password required", 400), 400)
        
        print(f"🔐 Login attempt for email: {email}")
        
        # Check all role-specific collections
        collections = ['auctioneers', 'teams', 'players', 'guests', 'matches']
        
        for collection_name in collections:
            try:
                print(f"🔍 Searching in {collection_name} for email={email}")
                # Query by email first
                docs = list(get_db().collection(collection_name).where('email', '==', email).stream())
                
                # For matches collection, also check adminEmail and organizerEmail fields
                if collection_name == 'matches' and not docs:
                    print(f"🔍 Not found by 'email', trying 'adminEmail' and 'organizerEmail'")
                    admin_docs = list(get_db().collection(collection_name).where('adminEmail', '==', email).stream())
                    org_docs = list(get_db().collection(collection_name).where('organizerEmail', '==', email).stream())
                    docs = admin_docs + org_docs
                
                print(f"📦 Found {len(docs)} documents in {collection_name}")
                
                if docs:
                    user_doc = docs[0]
                    user_data = user_doc.to_dict()
                    
                    # Get password from various possible fields
                    stored_password = user_data.get('password') or user_data.get('organizerPassword')
                    doc_id = user_doc.id
                    is_admin = user_data.get('role') == 'ADMIN' or collection_name == 'matches'
                    
                    print(f"📋 Found user in {collection_name}: id={doc_id}, is_admin={is_admin}, has_password={'Yes' if stored_password else 'No'}")
                    
                    # For matches collection, accept as admin if it's a match document
                    if collection_name == 'matches':
                        # This is a match document - treat as admin login
                        if stored_password != password:
                            print(f"❌ Password mismatch: stored='{stored_password}', provided='{password}'")
                            continue
                        
                        print(f"✅ Login successful for {email} from {collection_name} (match document)")
                        response_data = {k: v for k, v in user_data.items() if k not in ['password', 'organizerPassword']}
                        response_data['id'] = doc_id
                        response_data['collection'] = collection_name
                        response_data['role'] = 'ADMIN'
                        # Ensure email field exists for frontend consistency
                        response_data['email'] = response_data.get('email') or response_data.get('adminEmail') or response_data.get('organizerEmail') or email
                        
                        return create_response(success_response({'user': response_data}, "Login successful"))
                    else:
                        # Check password for other collections
                        if stored_password != password:
                            print(f"❌ Password mismatch for {email} in {collection_name}")
                            continue
                        
                        print(f"✅ Login successful for {email} from {collection_name}")
                        response_data = {k: v for k, v in user_data.items() if k != 'password'}
                        response_data['id'] = doc_id
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
                        
                        return create_response(success_response({'user': response_data}, "Login successful"))
            except Exception as e:
                print(f"Error checking {collection_name}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        print(f"❌ User not found: {email}")
        return create_response(error_response("Invalid email or password", 401), 401)
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_response(error_response(f"Login failed: {str(e)}", 500), 500)

def handle_auth_register(data):
    """Register user via auth endpoint"""
    try:
        email = data.get('email', '').lower().strip()
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
        
        # Filter by matchId/seasonId if provided (accept both for backward compatibility)
        match_id = data.get('matchId') or data.get('seasonId')
        if match_id:
            query = query.where('matchId', '==', match_id)
        
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
            'status': 'approved',
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
            'status': 'rejected',
            'rejectionReason': reason,
            'rejectedAt': datetime.now().isoformat()
        })
        
        updated_doc = serialize_firestore_doc(doc_ref.get())
        return create_response(success_response(updated_doc, "Auctioneer rejected successfully"))
    except Exception as e:
        return create_response(error_response(str(e)), 400)

def get_teams(data):
    # Accept both 'matchId' and 'seasonId' for backward compatibility
    match_id = data.get('matchId') or data.get('seasonId')
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
    # Accept both 'matchId' and 'seasonId' for backward compatibility
    match_id = data.get('matchId') or data.get('seasonId')
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
    """Get all match documents (excluding admin user documents)"""
    docs = list(get_db().collection('matches').stream())
    # Filter out admin user documents - keep only actual match documents
    match_docs = [doc for doc in docs if doc.to_dict().get('role') != 'ADMIN']
    return create_response(success_response(serialize_firestore_docs(match_docs)))

def get_match(match_id):
    """Get match details and include current live auction state"""
    try:
        doc = get_db().collection('matches').document(match_id).get()
        if not doc.exists:
            return create_response(error_response("Not found", 404), 404)
        
        match_data = serialize_firestore_doc(doc)
        
        # Also fetch the live auction state if it exists
        try:
            live_auction_doc = get_db().collection('liveAuctions').document(match_id).get()
            if live_auction_doc.exists:
                live_state = live_auction_doc.to_dict() or {}
                # Merge live auction state into match data
                match_data.update({
                    'status': live_state.get('status', match_data.get('status', 'READY')),
                    'currentPlayerId': live_state.get('currentPlayerId'),
                    'currentPlayerName': live_state.get('currentPlayerName'),
                    'currentBid': live_state.get('currentBid', 0),
                    'leadingTeamId': live_state.get('leadingTeamId'),
                    'leadingTeamName': live_state.get('leadingTeamName'),
                    'biddingActive': live_state.get('biddingActive', False),
                    'remainingSeconds': live_state.get('remainingSeconds', 0)
                })
                
                # If there's a current player, fetch fresh data from the player doc to ensure bid is up-to-date
                current_player_id = live_state.get('currentPlayerId')
                if current_player_id:
                    try:
                        player_doc = get_db().collection('players').document(current_player_id).get()
                        if player_doc.exists:
                            player_data = player_doc.to_dict() or {}
                            # Override with fresh player data to ensure currentBid and leadingTeam are latest
                            match_data.update({
                                'currentBid': player_data.get('currentBid', match_data.get('currentBid', 0)),
                                'leadingTeamId': player_data.get('leadingTeamId', match_data.get('leadingTeamId')),
                                'leadingTeamName': player_data.get('leadingTeamName', match_data.get('leadingTeamName'))
                            })
                            print(f"✓ Refreshed currentBid from player doc: ₹{match_data['currentBid']}")
                    except Exception as e:
                        print(f"⚠ Warning fetching current player for refresh: {e}")
                
                print(f"✓ Merged live auction state into match data")
        except Exception as e:
            print(f"⚠ Warning fetching live auction state: {e}")
        
        return create_response(success_response(match_data))
    except Exception as e:
        return create_response(error_response(str(e), 500), 500)

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
    player_id = data.get('playerId')
    query = get_db().collection('bids')
    if season_id:
        query = query.where('seasonId', '==', season_id)
    if player_id:
        query = query.where('playerId', '==', player_id)
    docs = list(query.stream())
    # Sort by timestamp descending (most recent first)
    bids_list = serialize_firestore_docs(docs)
    bids_list.sort(key=lambda b: b.get('timestamp', ''), reverse=True)
    return create_response(success_response(bids_list))

def create_bid(data):
    """Create a new bid and update auction state"""
    try:
        season_id = data.get('seasonId')
        team_id = data.get('teamId')
        amount = data.get('amount', 0)
        
        print(f"📋 Create bid request: season={season_id}, team={team_id}, amount={amount}")
        
        if not season_id or not team_id or not amount:
            return create_response(error_response("Missing required fields: seasonId, teamId, amount"), 400)
        
        # Get team to validate budget
        try:
            team_doc = get_db().collection('teams').document(team_id).get()
            if not team_doc.exists:
                error_msg = f"Team {team_id} not found"
                print(f"❌ {error_msg}")
                return create_response(error_response(error_msg), 404)
        except Exception as e:
            print(f"❌ Failed to fetch team: {e}")
            return create_response(error_response(f"Failed to fetch team: {str(e)}"), 400)
        
        team_data = serialize_firestore_doc(team_doc)
        
        # Validate budget (prefer remainingBudget if present)
        remaining_budget = team_data.get('remainingBudget')
        if remaining_budget is None:
            remaining_budget = team_data.get('budget', 0)

        if amount > remaining_budget:
            budget_msg = f"Insufficient budget. Team has ₹{remaining_budget/100000:.1f}L remaining"
            print(f"⚠ Bid rejected: {budget_msg}")
            return create_response(error_response(budget_msg), 400)

        # Get current player from canonical Firestore doc (source of truth)
        player_id = None
        try:
            current_player_doc = get_db().collection('liveAuctions').document(season_id).collection('currentPlayer').document('active').get()
            if current_player_doc.exists:
                cp = current_player_doc.to_dict() or {}
                player_obj = cp.get('player') or {}
                player_id = cp.get('playerId') or player_obj.get('id')
                print(f"✓ Found player from canonical doc: {player_id}")
        except Exception as e:
            print(f"⚠ Failed to fetch canonical player doc: {e}")

        # Fallback: find any LIVE player if currentPlayer doc missing
        if not player_id:
            try:
                players_query = (
                    get_db().collection('players')
                    .where('matchId', '==', season_id)
                    .where('status', '==', 'LIVE')
                    .limit(1)
                )
                live_players = list(players_query.stream())
                if not live_players:
                    error_msg = "No active player bidding"
                    print(f"❌ {error_msg}")
                    return create_response(error_response(error_msg), 404)
                player_doc = live_players[0]
                print(f"✓ Found LIVE player via fallback query: {player_doc.id}")
            except Exception as e:
                print(f"❌ Failed to find active player: {e}")
                return create_response(error_response(f"Failed to find active player: {str(e)}"), 400)
        else:
            try:
                player_doc = get_db().collection('players').document(player_id).get()
            except Exception as e:
                print(f"❌ Failed to fetch player: {e}")
                return create_response(error_response(f"Failed to fetch player: {str(e)}"), 400)

        if not player_doc.exists:
            error_msg = "Active player not found"
            print(f"❌ {error_msg}")
            return create_response(error_response(error_msg), 404)

        player_data = serialize_firestore_doc(player_doc)
        
        # Validate bid amount is higher than current bid
        current_bid = player_data.get('currentBid', player_data.get('basePrice', 0))
        if amount <= current_bid:
            bid_msg = f"Bid must be higher than current bid of ₹{current_bid/100000:.1f}L"
            print(f"⚠ Bid rejected: {bid_msg}")
            return create_response(error_response(bid_msg), 400)
        
        # Create bid record
        try:
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
            print(f"✓ Created bid record: {bid_id}")
        except Exception as e:
            print(f"❌ Failed to create bid record: {e}")
            return create_response(error_response(f"Failed to create bid: {str(e)}"), 400)
        
        # Update player with new bid
        try:
            target_player_id = player_data.get('id') or player_doc.id
            get_db().collection('players').document(target_player_id).update({
                'currentBid': amount,
                'leadingTeamId': team_id,
                'leadingTeamName': team_data.get('name', 'Unknown Team'),
                'updatedAt': datetime.now().isoformat()
            })
            print(f"✓ Updated player bid data")
        except Exception as e:
            print(f"❌ Failed to update player bid: {e}")
            return create_response(error_response(f"Failed to update player bid: {str(e)}"), 400)

        # Update canonical live auction state docs so all dashboards converge
        try:
            _set_live_auction_state(season_id, {
                'status': 'LIVE',
                'currentPlayerId': target_player_id,
                'currentPlayerName': player_data.get('name'),
                'currentBid': amount,
                'leadingTeamId': team_id,
                'leadingTeamName': team_data.get('name'),
                'biddingActive': True
            })
            print(f"✓ Updated live auction state")
        except Exception as e:
            print(f"⚠ Warning updating auction state: {e}")

        try:
            # Keep currentPlayer/active doc fresh for any consumers
            refreshed_player = serialize_firestore_doc(get_db().collection('players').document(target_player_id).get())
            _set_current_player(season_id, refreshed_player, refreshed_player.get('basePrice', 0))
            print(f"✓ Refreshed canonical current player doc")
        except Exception as e:
            print(f"⚠ Failed to refresh currentPlayer doc after bid: {e}")
        
        # Emit real-time event
        try:
            emit_realtime_event('bid_placed', {
                'bidId': bid_id,
                'playerId': target_player_id,
                'playerName': player_data.get('name'),
                'teamId': team_id,
                'teamName': team_data.get('name'),
                'amount': amount,
                'seasonId': season_id
            }, season_id)
            print(f"✓ Emitted bid_placed event")
        except Exception as e:
            print(f"⚠ Warning emitting event: {e}")
        
        print(f"✅ Successfully placed bid: {amount} by {team_data.get('name')}")
        return create_response(success_response(bid_data, "Bid placed successfully"), 201)
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Unexpected error in create_bid: {error_msg}")
        import traceback
        traceback.print_exc()
        return create_response(error_response(f"Failed to place bid: {error_msg}"), 400)

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

def update_match_status(match_id, data):
    """Update match status (SETUP, ONGOING, or COMPLETED) - Admin/Auctioneer only"""
    try:
        new_status = data.get('status')
        if not new_status or new_status not in ['SETUP', 'ONGOING', 'COMPLETED']:
            return create_response(error_response(f"Invalid status. Must be SETUP, ONGOING, or COMPLETED"), 400)
        
        doc_ref = get_db().collection('matches').document(match_id)
        if not doc_ref.get().exists:
            return create_response(error_response(f"Match {match_id} not found", 404), 404)
        
        # Update the status
        doc_ref.update({
            'status': new_status,
            'updatedAt': datetime.now().isoformat(),
            'statusUpdatedBy': data.get('updatedBy', 'system'),
            'statusUpdatedAt': datetime.now().isoformat()
        })
        
        print(f"✅ Match {match_id} status updated to {new_status}")
        emit_realtime_event('matchStatusUpdated', {'status': new_status}, match_id)
        return create_response(success_response({'status': new_status}, f"Match status updated to {new_status}"))
    except Exception as e:
        print(f"❌ Error updating match status: {str(e)}")
        return create_response(error_response(f"Failed to update match status: {str(e)}"), 500)

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
        
        # 🔐 CRITICAL: Check if email is ALREADY USED in ANY collection for ANY match/role
        print(f"\n🔐 ADMIN EMAIL VALIDATION - checking if {email} exists in ANY collection...")
        
        # Check matches collection (other admins)
        matches_with_email = list(get_db().collection('matches').where('email', '==', email).stream())
        if matches_with_email:
            match_doc = matches_with_email[0].to_dict()
            existing_match_id = match_doc.get('id', 'unknown')
            return create_response(error_response(
                f"❌ EMAIL ALREADY IN USE: {email} is already registered as an ADMIN for another match (ID: {existing_match_id}). One email can only be used for ONE match.",
                409
            ), 409)
        
        # Check auctioneers collection
        auctioneers_with_email = list(get_db().collection('auctioneers').where('email', '==', email).stream())
        if auctioneers_with_email:
            auctioneer_doc = auctioneers_with_email[0].to_dict()
            existing_match_id = auctioneer_doc.get('matchId', 'unknown')
            return create_response(error_response(
                f"❌ EMAIL ALREADY IN USE: {email} is already registered as an AUCTIONEER in another match (ID: {existing_match_id}). One email can only be used for ONE match.",
                409
            ), 409)
        
        # Check teams collection
        teams_with_email = list(get_db().collection('teams').where('email', '==', email).stream())
        if teams_with_email:
            team_doc = teams_with_email[0].to_dict()
            existing_match_id = team_doc.get('matchId', 'unknown')
            return create_response(error_response(
                f"❌ EMAIL ALREADY IN USE: {email} is already registered as a TEAM in another match (ID: {existing_match_id}). One email can only be used for ONE match.",
                409
            ), 409)
        
        # Check players collection
        players_with_email = list(get_db().collection('players').where('email', '==', email).stream())
        if players_with_email:
            player_doc = players_with_email[0].to_dict()
            existing_match_id = player_doc.get('matchId', 'unknown')
            return create_response(error_response(
                f"❌ EMAIL ALREADY IN USE: {email} is already registered as a PLAYER in another match (ID: {existing_match_id}). One email can only be used for ONE match.",
                409
            ), 409)
        
        print(f"✅ Email {email} is unique - no conflicts found in any match")
        
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
        print("=" * 80)
        print("AUCTIONEER REGISTRATION HANDLER STARTED")
        print("=" * 80)
        
        print(f"📦 Received data keys: {list(data.keys())}")
        print(f"📦 Full data object: {data}")
        
        required_fields = ['fullName', 'email', 'password', 'seasonId']
        if not all(field in data for field in required_fields):
            return create_response(error_response(f"Missing required fields: {required_fields}"), 400)
        
        print(f"✅ All required fields present")
        print(f"\n🔍 GOVERNMENT ID FIELDS:")
        print(f"   - 'governmentId' in data: {'governmentId' in data}")
        print(f"   - data.get('governmentId'): {data.get('governmentId')}")
        print(f"   - 'governmentIdFile' in data: {'governmentIdFile' in data}")
        print(f"   - data.get('governmentIdFile'): {data.get('governmentIdFile')}")
        
        season_id = data['seasonId']
        email = data['email'].lower().strip()
        
        # Check if this email is already registered for THIS SPECIFIC MATCH
        existing = list(get_db().collection('auctioneers').where('email', '==', email).where('matchId', '==', season_id).stream())
        if existing:
            return create_response(error_response(f"Email {email} already registered for this match", 409), 409)
        
        # CHECK IF EMAIL IS REGISTERED IN ANY OTHER MATCH (across all collections and matches)
        print(f"\n🔐 DUPLICATE EMAIL CHECK - checking if {email} exists in ANY match...")
        
        # Check auctioneers collection
        auctioneers_with_email = list(get_db().collection('auctioneers').where('email', '==', email).stream())
        if auctioneers_with_email:
            auctioneer_doc = auctioneers_with_email[0].to_dict()
            existing_match_id = auctioneer_doc.get('matchId', 'unknown')
            return create_response(error_response(
                f"❌ EMAIL ALREADY IN USE: {email} is already registered as an AUCTIONEER in another match (ID: {existing_match_id}). One email can only be used for ONE match.",
                409
            ), 409)
        
        # Check teams collection
        teams_with_email = list(get_db().collection('teams').where('email', '==', email).stream())
        if teams_with_email:
            team_doc = teams_with_email[0].to_dict()
            existing_match_id = team_doc.get('matchId', 'unknown')
            return create_response(error_response(
                f"❌ EMAIL ALREADY IN USE: {email} is already registered as a TEAM in another match (ID: {existing_match_id}). One email can only be used for ONE match.",
                409
            ), 409)
        
        # Check players collection
        players_with_email = list(get_db().collection('players').where('email', '==', email).stream())
        if players_with_email:
            player_doc = players_with_email[0].to_dict()
            existing_match_id = player_doc.get('matchId', 'unknown')
            return create_response(error_response(
                f"❌ EMAIL ALREADY IN USE: {email} is already registered as a PLAYER in another match (ID: {existing_match_id}). One email can only be used for ONE match.",
                409
            ), 409)
        
        # Check matches collection (admins)
        matches_with_email = list(get_db().collection('matches').where('email', '==', email).stream())
        if matches_with_email:
            match_doc = matches_with_email[0].to_dict()
            existing_match_id = match_doc.get('id', 'unknown')
            return create_response(error_response(
                f"❌ EMAIL ALREADY IN USE: {email} is already registered as an ADMIN for a match (ID: {existing_match_id}). One email can only be used for ONE match.",
                409
            ), 409)
        
        print(f"✅ Email {email} is unique - no conflicts found in any match")
        
        user_id = generate_id('auctioneer')
        user_data = {
            'id': user_id,
            'name': data['fullName'],
            'email': email,
            'password': data['password'],
            'phone': data.get('phone', ''),
            'role': 'AUCTIONEER',
            'auctioneerId': user_id,
            'matchId': data['seasonId'],
            'experienceLevel': data.get('experienceLevel', ''),
            'languages': data.get('languages', []),
            'previousAuctions': data.get('previousAuctions', ''),
            'availability': data.get('availability', 'Yes'),
            'governmentId': data.get('governmentId', ''),
            'governmentIdFile': data.get('governmentIdFile', ''),
            'auctioneerLicense': data.get('auctioneerLicense', ''),
            'experience': data.get('experience', 0),
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat(),
            'status': 'pending',
            'profileComplete': True
        }
        
        print(f"\n✅ Creating auctioneer: {user_id} - {data['email']}")
        print(f"\n📝 USER_DATA TO BE STORED:")
        print(f"   - governmentId: {user_data['governmentId']}")
        print(f"   - governmentIdFile: {user_data['governmentIdFile']}")
        print(f"   - name: {user_data['name']}")
        print(f"   - email: {user_data['email']}")
        
        get_db().collection('auctioneers').document(user_id).set(user_data)
        print(f"✅ Auctioneer registered successfully in Firebase")
        print("=" * 80)
        
        return create_response(success_response({'userId': user_id, 'auctioneerId': user_id}, "Auctioneer registered successfully"), 201)
    except Exception as e:
        return create_response(error_response(f"Failed to register auctioneer: {str(e)}"), 400)

def handle_register_team(data):
    """Register a team representative and create team for a specific match"""
    try:
        required_fields = ['fullName', 'email', 'password', 'seasonId', 'teamName']
        if not all(field in data for field in required_fields):
            return create_response(error_response(f"Missing required fields: {required_fields}"), 400)
        
        season_id = data['seasonId']
        email = data['email'].lower().strip()
        
        # Check if this email is already registered for THIS SPECIFIC MATCH
        existing = list(get_db().collection('teams').where('email', '==', email).where('matchId', '==', season_id).stream())
        if existing:
            return create_response(error_response(f"Email {email} already registered for this match", 409), 409)
        
        # CHECK IF EMAIL IS REGISTERED IN ANY OTHER MATCH (across all collections and matches)
        print(f"\n🔐 DUPLICATE EMAIL CHECK - checking if {email} exists in ANY match...")
        
        # Check auctioneers collection
        auctioneers_with_email = list(get_db().collection('auctioneers').where('email', '==', email).stream())
        if auctioneers_with_email:
            auctioneer_doc = auctioneers_with_email[0].to_dict()
            existing_match_id = auctioneer_doc.get('matchId', 'unknown')
            return create_response(error_response(
                f"❌ EMAIL ALREADY IN USE: {email} is already registered as an AUCTIONEER in another match (ID: {existing_match_id}). One email can only be used for ONE match.",
                409
            ), 409)
        
        # Check teams collection
        teams_with_email = list(get_db().collection('teams').where('email', '==', email).stream())
        if teams_with_email:
            team_doc = teams_with_email[0].to_dict()
            existing_match_id = team_doc.get('matchId', 'unknown')
            return create_response(error_response(
                f"❌ EMAIL ALREADY IN USE: {email} is already registered as a TEAM in another match (ID: {existing_match_id}). One email can only be used for ONE match.",
                409
            ), 409)
        
        # Check players collection
        players_with_email = list(get_db().collection('players').where('email', '==', email).stream())
        if players_with_email:
            player_doc = players_with_email[0].to_dict()
            existing_match_id = player_doc.get('matchId', 'unknown')
            return create_response(error_response(
                f"❌ EMAIL ALREADY IN USE: {email} is already registered as a PLAYER in another match (ID: {existing_match_id}). One email can only be used for ONE match.",
                409
            ), 409)
        
        # Check matches collection (admins)
        matches_with_email = list(get_db().collection('matches').where('email', '==', email).stream())
        if matches_with_email:
            match_doc = matches_with_email[0].to_dict()
            existing_match_id = match_doc.get('id', 'unknown')
            return create_response(error_response(
                f"❌ EMAIL ALREADY IN USE: {email} is already registered as an ADMIN for a match (ID: {existing_match_id}). One email can only be used for ONE match.",
                409
            ), 409)
        
        print(f"✅ Email {email} is unique - no conflicts found in any match")
        
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
            'email': email,
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
        
        season_id = data['seasonId']
        email = data['email'].lower().strip()
        
        # Check if this email is already registered for THIS SPECIFIC MATCH
        existing = list(get_db().collection('players').where('email', '==', email).where('matchId', '==', season_id).stream())
        if existing:
            return create_response(error_response(f"Email {email} already registered for this match", 409), 409)
        
        # CHECK IF EMAIL IS REGISTERED IN ANY OTHER MATCH (across all collections and matches)
        print(f"\n🔐 DUPLICATE EMAIL CHECK - checking if {email} exists in ANY match...")
        
        # Check auctioneers collection
        auctioneers_with_email = list(get_db().collection('auctioneers').where('email', '==', email).stream())
        if auctioneers_with_email:
            auctioneer_doc = auctioneers_with_email[0].to_dict()
            existing_match_id = auctioneer_doc.get('matchId', 'unknown')
            return create_response(error_response(
                f"❌ EMAIL ALREADY IN USE: {email} is already registered as an AUCTIONEER in another match (ID: {existing_match_id}). One email can only be used for ONE match.",
                409
            ), 409)
        
        # Check teams collection
        teams_with_email = list(get_db().collection('teams').where('email', '==', email).stream())
        if teams_with_email:
            team_doc = teams_with_email[0].to_dict()
            existing_match_id = team_doc.get('matchId', 'unknown')
            return create_response(error_response(
                f"❌ EMAIL ALREADY IN USE: {email} is already registered as a TEAM in another match (ID: {existing_match_id}). One email can only be used for ONE match.",
                409
            ), 409)
        
        # Check players collection
        players_with_email = list(get_db().collection('players').where('email', '==', email).stream())
        if players_with_email:
            player_doc = players_with_email[0].to_dict()
            existing_match_id = player_doc.get('matchId', 'unknown')
            return create_response(error_response(
                f"❌ EMAIL ALREADY IN USE: {email} is already registered as a PLAYER in another match (ID: {existing_match_id}). One email can only be used for ONE match.",
                409
            ), 409)
        
        # Check matches collection (admins)
        matches_with_email = list(get_db().collection('matches').where('email', '==', email).stream())
        if matches_with_email:
            match_doc = matches_with_email[0].to_dict()
            existing_match_id = match_doc.get('id', 'unknown')
            return create_response(error_response(
                f"❌ EMAIL ALREADY IN USE: {email} is already registered as an ADMIN for a match (ID: {existing_match_id}). One email can only be used for ONE match.",
                409
            ), 409)
        
        print(f"✅ Email {email} is unique - no conflicts found in any match")
        
        player_id = generate_id('player')
        player_data = {
            'id': player_id,
            'name': data['fullName'],
            'email': email,
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
        
        season_id = data['seasonId']
        email = data['email'].lower().strip()
        
        # Check if this email is already registered for THIS SPECIFIC MATCH
        existing = list(get_db().collection('guests').where('email', '==', email).where('matchId', '==', season_id).stream())
        if existing:
            return create_response(error_response(f"Email {email} already registered for this match", 409), 409)
        
        user_id = generate_id('guest')
        user_data = {
            'id': user_id,
            'name': data['fullName'],
            'email': email,
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
        
        print(f"📋 Start player bidding request: season={season_id}, player={player_id}, basePrice={base_price}")
        
        if not season_id or not player_id:
            return create_response(error_response("Missing seasonId or playerId"), 400)
        
        # Verify player exists first
        player_ref = get_db().collection('players').document(player_id)
        player_doc = player_ref.get()
        if not player_doc.exists:
            error_msg = f"Player {player_id} not found in database"
            print(f"❌ {error_msg}")
            return create_response(error_response(error_msg), 404)
        
        player_current_data = serialize_firestore_doc(player_doc)
        is_resuming_live = player_current_data.get('status') == 'LIVE'
        
        # Ensure only ONE player is LIVE at a time for this season.
        # If previous runs left multiple players as LIVE, normalize them back to AVAILABLE.
        try:
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
                    print(f"✓ Cleared LIVE status from previous player: {doc.id}")
        except Exception as e:
            print(f"⚠ Warning clearing previous LIVE players: {e}")

        # Determine if we should preserve existing bid or reset to base price
        should_preserve_bid = False
        existing_current_bid = player_current_data.get('currentBid')
        
        if is_resuming_live and existing_current_bid and existing_current_bid > base_price:
            # If resuming and player already has bids above basePrice, preserve them
            should_preserve_bid = True
            print(f"📌 Resuming LIVE player with existing bid ₹{existing_current_bid} - preserving bid state")
        else:
            # Otherwise, check if there are any bids in history for this player
            try:
                existing_bids = list(
                    get_db()
                    .collection('bids')
                    .where('seasonId', '==', season_id)
                    .where('playerId', '==', player_id)
                    .order_by('timestamp', direction=firestore.Query.DESCENDING)
                    .limit(1)
                    .stream()
                )
                if existing_bids:
                    latest_bid_doc = existing_bids[0]
                    latest_bid = serialize_firestore_doc(latest_bid_doc)
                    latest_bid_amount = latest_bid.get('amount', 0)
                    if latest_bid_amount > base_price:
                        should_preserve_bid = True
                        existing_current_bid = latest_bid_amount
                        print(f"⚠️ Found existing bid ₹{latest_bid_amount} in history - will preserve if resuming")
            except Exception as e:
                print(f"⚠ Warning checking bid history: {e}")
        
        # Update player status to LIVE (preserve or reset bid data based on above logic)
        try:
            update_data = {
                'status': 'LIVE',
                'basePrice': base_price,
                'updatedAt': datetime.now().isoformat()
            }
            
            if should_preserve_bid and existing_current_bid:
                # PRESERVE existing bid state
                update_data['currentBid'] = existing_current_bid
                print(f"✓ Preserved existing bid: ₹{existing_current_bid}")
            else:
                # RESET to base price for new bidding
                update_data['currentBid'] = base_price
                update_data['leadingTeamId'] = None
                update_data['leadingTeamName'] = None
                print(f"✓ Reset bidding to base price: ₹{base_price}")
            
            player_ref.update(update_data)
            print(f"✓ Updated player {player_id} to LIVE")
        except Exception as e:
            print(f"❌ Failed to update player: {e}")
            return create_response(error_response(f"Failed to update player status: {str(e)}"), 400)

        # Fetch updated player so we can broadcast a full object
        try:
            updated_player = serialize_firestore_doc(player_ref.get())
            print(f"✓ Fetched updated player: {updated_player.get('name')}")
        except Exception as e:
            print(f"❌ Failed to fetch updated player: {e}")
            return create_response(error_response(f"Failed to fetch updated player: {str(e)}"), 400)

        # Canonical current player doc (all dashboards listen here)
        # Use the actual currentBid that was set (preserved or reset)
        actual_current_bid = existing_current_bid if (should_preserve_bid and existing_current_bid) else base_price
        try:
            _set_current_player(season_id, updated_player, actual_current_bid)
            print(f"✓ Set canonical current player doc with currentBid={actual_current_bid}")
        except Exception as e:
            print(f"❌ Failed to set current player doc: {e}")
            return create_response(error_response(f"Failed to set current player: {str(e)}"), 400)

        # Update canonical live auction state doc (all dashboards listen here)
        try:
            _set_live_auction_state(season_id, {
                'status': 'LIVE',
                'currentPlayerId': player_id,
                'currentPlayerName': updated_player.get('name'),
                'currentBid': actual_current_bid,
                'leadingTeamId': updated_player.get('leadingTeamId') if should_preserve_bid else None,
                'leadingTeamName': updated_player.get('leadingTeamName') if should_preserve_bid else None,
                'biddingActive': True,
                'remainingSeconds': 0
            })
            print(f"✓ Updated live auction state with currentBid={actual_current_bid}")
        except Exception as e:
            print(f"❌ Failed to update auction state: {e}")
            return create_response(error_response(f"Failed to update auction state: {str(e)}"), 400)
        
        # Emit real-time event
        try:
            emit_realtime_event('player_bidding_started', {
                'player': updated_player,
                'playerId': player_id,
                'basePrice': base_price,
                'seasonId': season_id
            }, season_id)
            print(f"✓ Emitted player_bidding_started event")
        except Exception as e:
            print(f"⚠ Warning emitting event: {e}")
        
        print(f"✅ Successfully started bidding for player {player_id}")
        return create_response(success_response({
            'playerId': player_id,
            'status': 'LIVE',
            'basePrice': base_price
        }, "Player bidding started"))
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Unexpected error in start_player_bidding: {error_msg}")
        import traceback
        traceback.print_exc()
        return create_response(error_response(f"Failed to start player bidding: {error_msg}"), 400)

def close_player_bidding(data):
    """Close bidding for current player"""
    try:
        season_id = data.get('seasonId')
        sold = data.get('sold', False)
        
        print(f"📋 Close player bidding request: season={season_id}, sold={sold}")
        
        if not season_id:
            return create_response(error_response("Missing seasonId"), 400)
        
        # Get current player from canonical doc first
        player_id = None
        try:
            current_player_doc = get_db().collection('liveAuctions').document(season_id).collection('currentPlayer').document('active').get()
            if current_player_doc.exists:
                cp = current_player_doc.to_dict() or {}
                player_obj = cp.get('player') or {}
                player_id = cp.get('playerId') or player_obj.get('id')
                print(f"✓ Found player from canonical doc: {player_id}")
        except Exception as e:
            print(f"⚠ Failed to fetch canonical player doc: {e}")

        if player_id:
            try:
                player_doc = get_db().collection('players').document(player_id).get()
                if not player_doc.exists:
                    error_msg = f"Player {player_id} not found"
                    print(f"❌ {error_msg}")
                    return create_response(error_response(error_msg), 404)
            except Exception as e:
                print(f"❌ Failed to fetch player: {e}")
                return create_response(error_response(f"Failed to fetch player: {str(e)}"), 400)
        else:
            # Fallback: find LIVE player
            try:
                players_query = (
                    get_db().collection('players')
                    .where('matchId', '==', season_id)
                    .where('status', '==', 'LIVE')
                    .limit(1)
                )
                live_players = list(players_query.stream())
                if not live_players:
                    error_msg = "No active player bidding found"
                    print(f"❌ {error_msg}")
                    return create_response(error_response(error_msg), 404)
                player_doc = live_players[0]
                print(f"✓ Found LIVE player via query: {player_doc.id}")
            except Exception as e:
                print(f"❌ Failed to find LIVE player: {e}")
                return create_response(error_response(f"Failed to find active player: {str(e)}"), 400)

        try:
            player_data = serialize_firestore_doc(player_doc)
        except Exception as e:
            print(f"❌ Failed to serialize player: {e}")
            return create_response(error_response(f"Failed to process player data: {str(e)}"), 400)
        
        # Update player status (preserve currentBid and team data)
        new_status = 'SOLD' if sold else 'UNSOLD'
        target_player_id = player_data.get('id') or player_doc.id
        player_ref = get_db().collection('players').document(target_player_id)
        update_data = {
            'status': new_status,
            'updatedAt': datetime.now().isoformat()
        }
        # If sold, add sold-to team and amount
        if sold:
            update_data['soldTo'] = player_data.get('leadingTeamId')
            update_data['soldAmount'] = player_data.get('currentBid', 0)
            update_data['soldAt'] = datetime.now().isoformat()
            print(f"✓ Recording SOLD: soldTo={player_data.get('leadingTeamId')}, soldAmount={player_data.get('currentBid')}")
        # If unsold, clear bid data and increment unsold count
        else:
            unsold_count = player_data.get('unsoldCount', 0) + 1
            update_data['currentBid'] = player_data.get('basePrice', 0)
            update_data['leadingTeamId'] = None
            update_data['leadingTeamName'] = None
            update_data['unsoldCount'] = unsold_count
            print(f"✓ Recording UNSOLD: count={unsold_count}")
        
        try:
            player_ref.update(update_data)
            print(f"✓ Updated player {target_player_id} status to {new_status}")
        except Exception as e:
            print(f"❌ Failed to update player status: {e}")
            return create_response(error_response(f"Failed to update player: {str(e)}"), 400)

        # Update auction state - add to unsold list if unsold
        auction_updates = {
            'currentPlayerId': None,
            'currentPlayerName': None,
            'biddingActive': False,
            'leadingTeamId': None,
            'leadingTeamName': None
        }
        
        # Track unsold players
        if not sold:
            try:
                auction_doc = get_db().collection('liveAuctions').document(season_id).get()
                auction_state = auction_doc.to_dict() if auction_doc.exists else {}
                unsold_players = auction_state.get('unsoldPlayers', [])
                if target_player_id not in unsold_players:
                    unsold_players.append(target_player_id)
                auction_updates['unsoldPlayers'] = unsold_players
                print(f"✓ Added player to unsold list (total: {len(unsold_players)})")
            except Exception as e:
                print(f"⚠ Warning tracking unsold player: {e}")

        # Update live auction state + clear current player
        try:
            _set_live_auction_state(season_id, auction_updates)
            print(f"✓ Updated live auction state")
        except Exception as e:
            print(f"⚠ Warning updating auction state: {e}")

        # Clear canonical current player doc to prevent stale hydration
        try:
            _clear_current_player(season_id)
            print(f"✓ Cleared canonical current player doc")
        except Exception as e:
            print(f"⚠ Warning clearing current player: {e}")

        # Write stable event docs used by existing listeners
        try:
            if sold:
                _emit_named_event_doc(season_id, 'playerSold', {
                    'playerId': target_player_id,
                    'playerName': player_data.get('name'),
                    'teamId': player_data.get('leadingTeamId'),
                    'teamName': player_data.get('leadingTeamName'),
                    'finalAmount': player_data.get('currentBid', 0),
                    'seasonId': season_id
                })
                print(f"✓ Emitted playerSold event")
            else:
                _emit_named_event_doc(season_id, 'playerUnsold', {
                    'playerId': target_player_id,
                    'playerName': player_data.get('name'),
                    'finalAmount': player_data.get('basePrice', 0),
                    'seasonId': season_id
                })
                print(f"✓ Emitted playerUnsold event")
        except Exception as e:
            print(f"⚠ Warning emitting event docs: {e}")
        
        # Emit real-time event
        try:
            emit_realtime_event('player_bidding_closed', {
                'playerId': target_player_id,
                'status': new_status,
                'sold': sold,
                'finalBid': player_data.get('currentBid', 0),
                'teamId': player_data.get('teamId'),
                'seasonId': season_id
            }, season_id)
            print(f"✓ Emitted player_bidding_closed event")
        except Exception as e:
            print(f"⚠ Warning emitting realtime event: {e}")
        
        print(f"✅ Successfully closed bidding for player {target_player_id} - {new_status}")
        return create_response(success_response({
            'playerId': target_player_id,
            'status': new_status,
            'sold': sold
        }, f"Player bidding closed - {new_status}"))
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Unexpected error in close_player_bidding: {error_msg}")
        import traceback
        traceback.print_exc()
        return create_response(error_response(f"Failed to close player bidding: {error_msg}"), 400)


def mark_player_unsold(data):
    """Mark current player as unsold without closing bidding - adds to unsold list"""
    try:
        season_id = data.get('seasonId')
        
        print(f"📋 Mark player unsold request: season={season_id}")
        
        if not season_id:
            return create_response(error_response("Missing seasonId"), 400)
        
        # Get current player from canonical doc
        player_id = None
        try:
            current_player_doc = get_db().collection('liveAuctions').document(season_id).collection('currentPlayer').document('active').get()
            if current_player_doc.exists:
                cp = current_player_doc.to_dict() or {}
                player_obj = cp.get('player') or {}
                player_id = cp.get('playerId') or player_obj.get('id')
                player_name = cp.get('playerName') or player_obj.get('name', 'Unknown')
                print(f"✓ Found player from canonical doc: {player_id}")
            else:
                return create_response(error_response("No player currently up for bidding"), 404)
        except Exception as e:
            print(f"❌ Failed to fetch canonical player doc: {e}")
            return create_response(error_response(f"Failed to fetch player: {str(e)}"), 400)
        
        # Get player doc
        try:
            player_doc = get_db().collection('players').document(player_id).get()
            if not player_doc.exists:
                return create_response(error_response(f"Player {player_id} not found"), 404)
            player_data = serialize_firestore_doc(player_doc)
        except Exception as e:
            print(f"❌ Failed to fetch player: {e}")
            return create_response(error_response(f"Failed to fetch player: {str(e)}"), 400)
        
        # Increment unsold count
        unsold_count = player_data.get('unsoldCount', 0) + 1
        
        # Update player status
        try:
            get_db().collection('players').document(player_id).update({
                'status': 'UNSOLD',
                'unsoldCount': unsold_count,
                'updatedAt': datetime.now().isoformat()
            })
            print(f"✓ Marked player {player_id} as UNSOLD (count: {unsold_count})")
        except Exception as e:
            print(f"❌ Failed to update player: {e}")
            return create_response(error_response(f"Failed to update player: {str(e)}"), 400)
        
        # Update auction state - add to unsold players list (do NOT add to player queue yet)
        try:
            auction_doc = get_db().collection('liveAuctions').document(season_id).get()
            auction_state = auction_doc.to_dict() if auction_doc.exists else {}
            
            unsold_players = auction_state.get('unsoldPlayers', [])
            if player_id not in unsold_players:
                unsold_players.append(player_id)
            
            # Do NOT add to playerQueue - unsold players come later after all AVAILABLE players
            
            _set_live_auction_state(season_id, {
                'currentPlayerId': None,
                'currentPlayerName': None,
                'biddingActive': False,
                'leadingTeamId': None,
                'leadingTeamName': None,
                'currentBid': 0,
                'unsoldPlayers': unsold_players
            })
            print(f"✓ Updated auction state with unsold player (will re-auction later)")
        except Exception as e:
            print(f"⚠ Warning updating auction state: {e}")
        
        # Clear canonical current player doc
        try:
            _clear_current_player(season_id)
            print(f"✓ Cleared canonical current player doc")
        except Exception as e:
            print(f"⚠ Warning clearing current player: {e}")
        
        # Emit player unsold event
        try:
            _emit_named_event_doc(season_id, 'playerUnsold', {
                'playerId': player_id,
                'playerName': player_name,
                'unsoldCount': unsold_count,
                'seasonId': season_id
            })
            print(f"✓ Emitted playerUnsold event")
        except Exception as e:
            print(f"⚠ Warning emitting event: {e}")
        
        print(f"✅ Successfully marked player {player_id} as UNSOLD")
        return create_response(success_response({
            'playerId': player_id,
            'playerName': player_name,
            'unsoldCount': unsold_count
        }, "Player marked as unsold"))
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Unexpected error in mark_player_unsold: {error_msg}")
        import traceback
        traceback.print_exc()
        return create_response(error_response(f"Failed to mark player unsold: {error_msg}"), 400)


def get_next_player(data):
    """Get next available player for auction - prioritizes AVAILABLE players, then UNSOLD for re-auction"""
    try:
        season_id = data.get('seasonId')
        
        print(f"📋 Get next player request: season={season_id}")
        
        if not season_id:
            return create_response(error_response("Missing seasonId"), 400)
        
        # PHASE 1: Try to find AVAILABLE players (never auctioned yet)
        try:
            print(f"🔍 PHASE 1: Searching for AVAILABLE players in season {season_id}...")
            available_players = list(
                get_db()
                .collection('players')
                .where('matchId', '==', season_id)
                .where('status', '==', 'AVAILABLE')
                .limit(1)
                .stream()
            )
            
            print(f"📊 Found {len(available_players)} AVAILABLE players")
            
            if available_players:
                next_player_doc = available_players[0]
                next_player = serialize_firestore_doc(next_player_doc)
                player_id = next_player['id']
                player_name = next_player.get('name', 'Unknown')
                base_price = next_player.get('basePrice', 0)
                
                print(f"✅ Found AVAILABLE player: {player_name} (ID: {player_id})")
                
                # Automatically start bidding for this player
                start_result = start_player_bidding({
                    'seasonId': season_id,
                    'playerId': player_id,
                    'basePrice': base_price
                })
                
                return start_result
            else:
                print("⚠️ No AVAILABLE players found, moving to PHASE 2...")
        except Exception as e:
            print(f"❌ Error finding AVAILABLE players: {e}")
            import traceback
            traceback.print_exc()
        
        # PHASE 2: No AVAILABLE players - check for UNSOLD players for re-auction
        try:
            print(f"🔍 PHASE 2: Searching for UNSOLD players in season {season_id}...")
            unsold_players = list(
                get_db()
                .collection('players')
                .where('matchId', '==', season_id)
                .where('status', '==', 'UNSOLD')
                .limit(1)
                .stream()
            )
            
            print(f"📊 Found {len(unsold_players)} UNSOLD players")
            
            if unsold_players:
                next_player_doc = unsold_players[0]
                next_player = serialize_firestore_doc(next_player_doc)
                player_id = next_player['id']
                player_name = next_player.get('name', 'Unknown')
                base_price = next_player.get('basePrice', 0)
                
                print(f"✅ Found UNSOLD player for re-auction: {player_name} (ID: {player_id})")
                
                # Reset to AVAILABLE for re-auction
                get_db().collection('players').document(player_id).update({
                    'status': 'AVAILABLE',
                    'updatedAt': datetime.now().isoformat()
                })
                
                # Automatically start bidding for this player
                start_result = start_player_bidding({
                    'seasonId': season_id,
                    'playerId': player_id,
                    'basePrice': base_price
                })
                
                return start_result
            else:
                print("⚠️ No UNSOLD players found, moving to PHASE 3...")
        except Exception as e:
            print(f"❌ Error finding UNSOLD players: {e}")
            import traceback
            traceback.print_exc()
        
        # PHASE 3: No players left - auction complete
        print(f"✅ No more players available - auction complete")
        return create_response(success_response({
            'message': 'All players have been auctioned',
            'auctionComplete': True
        }, "Auction complete"))
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Unexpected error in get_next_player: {error_msg}")
        import traceback
        traceback.print_exc()
        return create_response(error_response(f"Failed to get next player: {error_msg}"), 400)


def start_reauction_unsold(data):
    """Start re-auctioning unsold players"""
    try:
        season_id = data.get('seasonId')
        
        print(f"📋 Start re-auction request: season={season_id}")
        
        if not season_id:
            return create_response(error_response("Missing seasonId"), 400)
        
        # Get auction state
        try:
            auction_doc = get_db().collection('liveAuctions').document(season_id).get()
            if not auction_doc.exists:
                return create_response(error_response("Auction state not found"), 404)
            auction_state = auction_doc.to_dict()
        except Exception as e:
            print(f"❌ Failed to fetch auction state: {e}")
            return create_response(error_response(f"Failed to fetch auction state: {str(e)}"), 400)
        
        unsold_players = auction_state.get('unsoldPlayers', [])
        
        if not unsold_players:
            return create_response(error_response("No unsold players to re-auction"), 400)
        
        print(f"✓ Found {len(unsold_players)} unsold players to re-auction")
        
        # Reset unsold players status to AVAILABLE for re-auction
        try:
            for player_id in unsold_players:
                get_db().collection('players').document(player_id).update({
                    'status': 'AVAILABLE',
                    'updatedAt': datetime.now().isoformat()
                })
            print(f"✓ Reset {len(unsold_players)} players to AVAILABLE")
        except Exception as e:
            print(f"❌ Failed to reset player status: {e}")
            return create_response(error_response(f"Failed to reset player status: {str(e)}"), 400)
        
        # Update auction state with unsold players in queue
        try:
            _set_live_auction_state(season_id, {
                'playerQueue': unsold_players,
                'unsoldPlayers': [],  # Clear the unsold list
                'status': 'LIVE'
            })
            print(f"✓ Updated auction state with re-auction queue")
        except Exception as e:
            print(f"❌ Failed to update auction state: {e}")
            return create_response(error_response(f"Failed to update auction state: {str(e)}"), 400)
        
        # Emit re-auction started event
        try:
            emit_realtime_event('reAuctionStarted', {
                'seasonId': season_id,
                'reAuctionPlayerCount': len(unsold_players),
                'playerIds': unsold_players
            }, season_id)
            print(f"✓ Emitted reAuctionStarted event")
        except Exception as e:
            print(f"⚠ Warning emitting event: {e}")
        
        print(f"✅ Successfully started re-auction for {len(unsold_players)} players")
        return create_response(success_response({
            'seasonId': season_id,
            'reAuctionPlayerCount': len(unsold_players),
            'playerIds': unsold_players
        }, "Re-auction started for unsold players"))
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Unexpected error in start_reauction_unsold: {error_msg}")
        import traceback
        traceback.print_exc()
        return create_response(error_response(f"Failed to start re-auction: {error_msg}"), 400)


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

def migrate_sold_players_data(data):
    """
    MIGRATION: Populate missing soldTo, soldAmount, soldAt for already-sold players
    Copies from leadingTeamId, currentBid, updatedAt
    """
    try:
        season_id = data.get('seasonId')
        if not season_id:
            return create_response(error_response("Missing seasonId parameter"), 400)
        
        # Find all SOLD players missing soldTo
        players_query = (
            get_db().collection('players')
            .where('matchId', '==', season_id)
            .where('status', '==', 'SOLD')
        )
        players = list(players_query.stream())
        
        updated_count = 0
        updates_made = []
        
        for p in players:
            p_data = p.to_dict()
            player_id = p.id
            player_name = p_data.get('name', 'Unknown')
            
            # Check if this player is missing soldTo/soldAmount/soldAt
            has_soldTo = 'soldTo' in p_data and p_data.get('soldTo')
            has_soldAmount = 'soldAmount' in p_data and p_data.get('soldAmount')
            has_soldAt = 'soldAt' in p_data and p_data.get('soldAt')
            
            # If already complete, skip
            if has_soldTo and has_soldAmount and has_soldAt:
                print(f"✓ {player_name} already has complete sold data")
                continue
            
            # Get source data
            leading_team_id = p_data.get('leadingTeamId')
            current_bid = p_data.get('currentBid')
            updated_at = p_data.get('updatedAt')
            
            if not leading_team_id or not current_bid:
                print(f"⚠ {player_name} missing leadingTeamId or currentBid, skipping")
                continue
            
            # Prepare update
            update_data = {}
            if not has_soldTo and leading_team_id:
                update_data['soldTo'] = leading_team_id
            if not has_soldAmount and current_bid:
                update_data['soldAmount'] = current_bid
            if not has_soldAt and updated_at:
                update_data['soldAt'] = updated_at
            
            # Apply update
            if update_data:
                get_db().collection('players').document(player_id).update(update_data)
                updated_count += 1
                updates_made.append({
                    'playerId': player_id,
                    'playerName': player_name,
                    'updates': update_data
                })
                print(f"✓ Migrated {player_name}: {list(update_data.keys())}")
        
        return create_response(success_response({
            'updated_count': updated_count,
            'updates_made': updates_made
        }, f"Migration complete: Updated {updated_count} players"))
    
    except Exception as e:
        print(f"❌ Migration error: {e}")
        import traceback
        traceback.print_exc()
        return create_response(error_response(f"Migration failed: {str(e)}"), 400)

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
            
            # Skip admin user documents - only process actual match documents
            # Admin documents have role='ADMIN', actual matches have sport/status fields
            if match_data.get('role') == 'ADMIN':
                print(f"⏭️  Skipping admin document: {match_doc.id}")
                continue
            
            # Skip if doesn't look like a match (no id or name)
            if not match_data.get('id') or not match_data.get('name'):
                print(f"⏭️  Skipping non-match document: {match_doc.id}")
                continue
            
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

