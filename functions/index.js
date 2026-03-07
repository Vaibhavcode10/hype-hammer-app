"use strict";

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const busboy = require("busboy");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");

// ====================
// EMAIL CONFIGURATION (SMTP)
// ====================
// Mirrors Python: EMAIL_SENDER = os.environ.get('EMAIL_SENDER', '')
// NOTE: Secret injection is configured on the exported function when supported.
const EMAIL_SENDER = process.env.EMAIL_SENDER || "";
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || "";
const SMTP_TIMEOUT = 15; // seconds (mirrors Python)

// ====================
// Utility functions (ported 1:1 from Python)
// ====================
function generate_otp() {
  // Python: return str(random.randint(100000, 999999))
  const value = Math.floor(Math.random() * 900000) + 100000;
  return String(value);
}

function generate_id(prefix = "") {
  // Python: uid = uuid.uuid4().hex[:8]; return f"{prefix}_{uid}" if prefix else uid
  const uid = uuidv4().replace(/-/g, "").slice(0, 8);
  return prefix ? `${prefix}_${uid}` : uid;
}

function serialize_firestore_doc(doc) {
  // Python: if hasattr(doc, 'to_dict'): data = doc.to_dict(); data['id'] = doc.id; return data
  if (doc && typeof doc.data === "function") {
    const data = doc.data() || {};
    data.id = doc.id;
    return data;
  }
  return doc;
}

function serialize_firestore_docs(docs) {
  // Python: return [serialize_firestore_doc(doc) for doc in docs]
  const result = [];
  docs.forEach((doc) => result.push(serialize_firestore_doc(doc)));
  return result;
}

// Aliases for camelCase usage
const serializeFirestoreDoc = serialize_firestore_doc;
const serializeFirestoreDocs = serialize_firestore_docs;

function toNumberOrNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizePlayerForApi(playerData) {
  if (!playerData || typeof playerData !== "object") return playerData;

  // Normalize basePrice field name (do NOT invent placeholder values).
  const rawBasePrice =
    playerData.basePrice ??
    playerData.base_price ??
    null;

  const numericBasePrice = toNumberOrNull(rawBasePrice);
  if (numericBasePrice !== null && (playerData.basePrice === undefined || playerData.basePrice === null)) {
    playerData.basePrice = numericBasePrice;
  }

  return playerData;
}

// ====================
// Realtime Event Helpers (mirrors Python)
// ====================
async function emit_realtime_event(eventType, data, seasonId = null) {
  try {
    if (!seasonId && data && data.seasonId) {
      seasonId = data.seasonId;
    }
    if (!seasonId) {
      return;
    }

    const eventDoc = {
      type: eventType,
      data: data,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    };

    // Use subcollection with auto-generated IDs to prevent overwriting
    const basePath = `liveAuctions/${seasonId}/events`;
    await getDb().collection(basePath).add(eventDoc);

    // Also update a single 'latestEvent' document for quick access
    await getDb().collection(basePath).doc('latestEvent').set({
      type: eventType,
      data: data,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✓ Event: ${eventType}`);
  } catch (e) {
    console.log(`✗ Event error: ${e}`);
  }
}

async function _set_live_auction_state(seasonId, updates) {
  /**Upsert the live auction state document used by Firestore listeners.*/
  if (!seasonId) {
    return;
  }
  try {
    updates = { ...updates };
    updates.updatedAt = new Date().toISOString();
    await getDb().collection('liveAuctions').doc(seasonId).set(updates, { merge: true });
  } catch (e) {
    console.log(`✗ Live auction state update error: ${e}`);
  }
}

async function _set_current_player(seasonId, player, basePrice, duration = 120) {
  /**Write the canonical current player document consumed by all dashboards.*/
  if (!seasonId) {
    return;
  }
  try {
    const payload = {
      seasonId: seasonId,
      player: player,
      playerId: player.id,
      playerName: player.name,
      basePrice: basePrice,
      duration: duration,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    };
    await getDb().collection('liveAuctions').doc(seasonId).collection('currentPlayer').doc('active').set(payload);
  } catch (e) {
    console.log(`✗ Current player write error: ${e}`);
  }
}

async function _clear_current_player(seasonId) {
  /**Remove the canonical current player doc so clients don't hydrate stale players.*/
  if (!seasonId) {
    return;
  }
  try {
    await getDb().collection('liveAuctions').doc(seasonId).collection('currentPlayer').doc('active').delete();
  } catch (e) {
    console.log(`✗ Current player delete error: ${e}`);
  }
}

async function _emit_named_event_doc(seasonId, docName, data) {
  /**Write a stable event doc (playerSold/playerUnsold/etc.) for legacy listeners.*/
  if (!seasonId || !docName) {
    return;
  }
  try {
    const payload = { ...data };
    payload.timestamp = admin.firestore.FieldValue.serverTimestamp();
    payload.createdAt = new Date().toISOString();
    await getDb().collection('liveAuctions').doc(seasonId).collection('events').doc(docName).set(payload);
  } catch (e) {
    console.log(`✗ Named event doc error (${docName}): ${e}`);
  }
}

async function emit_realtime_push(collection_name, data) {
  try {
    data = data || {};
    data.timestamp = admin.firestore.FieldValue.serverTimestamp();
    data.createdAt = new Date().toISOString();
    const docRef = getDb().collection(collection_name).doc();
    await docRef.set(data);
    return docRef.id;
  } catch (e) {
    console.log(`✗ Push error: ${e}`);
    return null;
  }
}

async function send_otp_email(to_email, otp) {
  // Python signature: send_otp_email(to_email: str, otp: str) -> dict
  // Returns: { success: boolean, error: string|null }

  if (!EMAIL_SENDER || !EMAIL_PASSWORD) {
    const error_msg =
      "Email not configured. Set EMAIL_SENDER and EMAIL_PASSWORD environment variables.";
    console.log(`❌ ${error_msg}`);
    return { success: false, error: error_msg };
  }

  try {
    const subject = "Your HypeHammer Password Reset Code";

    const text_body = `
HypeHammer - Password Reset Code

Your verification code is: ${otp}

This code expires in 10 minutes.
If you didn't request this, please ignore this email.
        `;

    const html_body = `
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #1e3a5f, #0f1729); padding: 30px; border-radius: 15px;">
                <h1 style="color: #f472b6; text-align: center; margin-bottom: 20px;">HypeHammer</h1>
                <h2 style="color: white; text-align: center;">Password Reset Code</h2>
                <p style="color: #e0e0e0; text-align: center; margin-bottom: 30px;">
                    Use this code to reset your password. It expires in 10 minutes.
                </p>
                <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; text-align: center;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #f472b6;">${otp}</span>
                </div>
                <p style="color: #888; text-align: center; margin-top: 20px; font-size: 12px;">
                    If you didn't request this, please ignore this email.
                </p>
            </div>
        </body>
        </html>
        `;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: EMAIL_SENDER, pass: EMAIL_PASSWORD },
      connectionTimeout: SMTP_TIMEOUT * 1000,
      greetingTimeout: SMTP_TIMEOUT * 1000,
      socketTimeout: SMTP_TIMEOUT * 1000,
    });

    await transporter.sendMail({
      from: `HypeHammer <${EMAIL_SENDER}>`,
      to: to_email,
      subject,
      text: text_body,
      html: html_body,
    });

    console.log(`✅ OTP email sent successfully to ${to_email}`);
    return { success: true, error: null };
  } catch (e) {
    const code = e && typeof e === "object" ? e.code : undefined;
    const responseCode = e && typeof e === "object" ? e.responseCode : undefined;
    const message = e instanceof Error ? e.message : String(e);

    if (code === "EAUTH" || responseCode === 535) {
      const error_msg = "SMTP authentication failed. Check EMAIL_SENDER and EMAIL_PASSWORD.";
      console.log(`❌ ${error_msg}: ${message}`);
      return { success: false, error: error_msg };
    }

    // Nodemailer commonly uses EENVELOPE for invalid recipient.
    if (code === "EENVELOPE") {
      const error_msg = `Invalid recipient email: ${to_email}`;
      console.log(`❌ ${error_msg}: ${message}`);
      return { success: false, error: error_msg };
    }

    if (code === "ETIMEDOUT") {
      const error_msg = "Email server connection timed out. Please try again.";
      console.log(`❌ ${error_msg}`);
      return { success: false, error: error_msg };
    }

    if (code && typeof code === "string" && code.startsWith("E")) {
      const error_msg = `SMTP error: ${message}`;
      console.log(`❌ ${error_msg}`);
      return { success: false, error: error_msg };
    }

    const error_msg = `Failed to send email: ${message}`;
    console.log(`❌ ${error_msg}`);
    console.error(e);
    return { success: false, error: error_msg };
  }
}

// ====================
// LAZY Firebase Admin (mirrors Python getters)
// ====================
let _db = null;
let _bucket = null;

const getAdminApp = () => {
  if (!admin.apps || admin.apps.length === 0) {
    admin.initializeApp();
  }
  return admin;
};

const getDb = () => {
  if (_db == null) {
    _db = getAdminApp().firestore();
  }
  return _db;
};

const getStorageBucket = () => {
  if (_bucket == null) {
    _bucket = getAdminApp().storage().bucket();
  }
  return _bucket;
};

function get_db() {
  return getDb();
}

function get_storage_bucket() {
  return getStorageBucket();
}

// ====================
// Response helpers (match Python shapes)
// ====================
const errorResponse = (message, statusCode = 400) => {
  return { error: message, success: false, status_code: statusCode };
};

const successResponse = (data = null, message = "Success") => {
  const response = { success: true, message };
  if (data !== null && data !== undefined) {
    response.data = data;
  }
  return response;
};

function error_response(message, status_code = 400) {
  return errorResponse(message, status_code);
}

function success_response(data = null, message = "Success") {
  return successResponse(data, message);
}

function create_response(data, status_code = 200) {
  return [data, status_code];
}

const jsonReplacer = (_key, value) => {
  if (value instanceof Date) return value.toISOString();

  // Firestore Timestamp (admin SDK) commonly provides toDate()
  if (value && typeof value === "object" && typeof value.toDate === "function") {
    try {
      const date = value.toDate();
      if (date instanceof Date) return date.toISOString();
    } catch {
      // ignore
    }
  }

  return value;
};

const createResponse = (res, data, statusCode = 200) => {
  res.status(statusCode);
  res.set("Content-Type", "application/json");
  res.send(JSON.stringify(data, jsonReplacer));
};

// ====================
// CORS (match Python options.CorsOptions)
// ====================
const CORS_ALLOWED_ORIGINS = "*";
const CORS_ALLOWED_METHODS = "GET, POST, PUT, DELETE, OPTIONS";

const applyCors = (req, res) => {
  res.set("Access-Control-Allow-Origin", CORS_ALLOWED_ORIGINS);
  res.set("Access-Control-Allow-Methods", CORS_ALLOWED_METHODS);

  // Respond to preflight quickly.
  if (req.method === "OPTIONS") {
    const requestedHeaders = req.get("Access-Control-Request-Headers");
    if (requestedHeaders) {
      res.set("Access-Control-Allow-Headers", requestedHeaders);
    }
    res.status(204).send("");
    return true;
  }

  return false;
};

// ====================
// Unified routing (match Python auction(req))
// ====================
const normalizePathParts = (path) => {
  // Python: req.path.strip('/').split('/')
  const stripped = (path || "").replace(/^\/+|\/+$/g, "");
  const parts = stripped ? stripped.split("/") : [];

  // Python: Remove 'auction' or 'api' from path if present
  if (parts.length > 0 && (parts[0] === "auction" || parts[0] === "api")) {
    parts.shift();
  }

  return parts;
};

const normalizeGetArgs = (query) => {
  // Python uses dict(req.args): values are strings.
  const data = {};
  for (const [key, value] of Object.entries(query || {})) {
    if (Array.isArray(value)) {
      // Werkzeug's dict(MultiDict) behavior keeps the first value.
      data[key] = value.length > 0 ? String(value[0]) : "";
    } else if (value === null || value === undefined) {
      data[key] = "";
    } else {
      data[key] = String(value);
    }
  }
  return data;
};

const notYetMigrated = (name) => {
  return [errorResponse(`Not implemented yet: ${name}`, 501), 501];
};

// ====================
// USER CRUD HANDLERS (ported 1:1 from Python)
// ====================
async function get_users(data) {
  try {
    const role = data.role;
    let query = getDb().collection("users");
    if (role) {
      query = query.where("role", "==", role);
    }
    const snapshot = await query.get();
    const users = serialize_firestore_docs(snapshot.docs);
    return [successResponse(users), 200];
  } catch (e) {
    return [errorResponse(String(e)), 400];
  }
}

async function get_user(user_id) {
  try {
    const doc = await getDb().collection("users").doc(user_id).get();
    if (!doc.exists) {
      return [errorResponse("User not found", 404), 404];
    }
    return [successResponse(serialize_firestore_doc(doc)), 200];
  } catch (e) {
    return [errorResponse(String(e)), 400];
  }
}

async function get_user_by_email(email) {
  try {
    const snapshot = await getDb().collection("users").where("email", "==", email).get();
    if (snapshot.empty) {
      return [errorResponse(`User with email ${email} not found`, 404), 404];
    }
    return [successResponse(serialize_firestore_doc(snapshot.docs[0])), 200];
  } catch (e) {
    return [errorResponse(String(e)), 400];
  }
}

async function create_user(data) {
  try {
    const user_id = data.id || generate_id("user");
    data.id = user_id;
    data.createdAt = new Date().toISOString();
    await getDb().collection("users").doc(user_id).set(data);
    return [successResponse(data), 201];
  } catch (e) {
    return [errorResponse(String(e)), 400];
  }
}

async function update_user(user_id, data) {
  try {
    const doc_ref = getDb().collection("users").doc(user_id);
    const doc = await doc_ref.get();
    if (!doc.exists) {
      return [errorResponse("User not found", 404), 404];
    }
    data.updatedAt = new Date().toISOString();
    await doc_ref.update(data);
    const updated = await doc_ref.get();
    return [successResponse(serialize_firestore_doc(updated)), 200];
  } catch (e) {
    return [errorResponse(String(e)), 400];
  }
}

async function delete_user(user_id) {
  try {
    await getDb().collection("users").doc(user_id).delete();
    return [successResponse(null, "Deleted"), 200];
  } catch (e) {
    return [errorResponse(String(e)), 400];
  }
}

// ====================
// AUTH HANDLERS (ported 1:1 from Python)
// ====================
async function handle_login(data) {
  try {
    const email = (data.email || "").toLowerCase().trim();
    const password = data.password;

    if (!email || !password) {
      return [errorResponse("Email and password required", 400), 400];
    }

    console.log(`🔐 Login attempt for email: ${email}`);

    // Check all role-specific collections (SAME ORDER as Python)
    const collections = ["auctioneers", "teams", "players", "guests", "matches"];

    for (const collection_name of collections) {
      try {
        console.log(`🔍 Searching in ${collection_name} for email=${email}`);
        let snapshot = await getDb().collection(collection_name).where("email", "==", email).get();
        let docs = snapshot.docs;

        // For matches collection, also check adminEmail and organizerEmail fields
        if (collection_name === "matches" && docs.length === 0) {
          console.log(`🔍 Not found by 'email', trying 'adminEmail' and 'organizerEmail'`);
          const adminSnapshot = await getDb().collection(collection_name).where("adminEmail", "==", email).get();
          const orgSnapshot = await getDb().collection(collection_name).where("organizerEmail", "==", email).get();
          docs = [...adminSnapshot.docs, ...orgSnapshot.docs];
        }

        console.log(`📦 Found ${docs.length} documents in ${collection_name}`);

        if (docs.length > 0) {
          const user_doc = docs[0];
          const user_data = user_doc.data() || {};

          // Get password from various possible fields
          const stored_password = user_data.password || user_data.organizerPassword;
          const doc_id = user_doc.id;
          const is_admin = user_data.role === "ADMIN" || collection_name === "matches";

          console.log(`📋 Found user in ${collection_name}: id=${doc_id}, is_admin=${is_admin}, has_password=${stored_password ? "Yes" : "No"}`);

          if (collection_name === "matches") {
            // This is a match document - treat as admin login
            if (stored_password !== password) {
              console.log(`❌ Password mismatch: stored='${stored_password}', provided='${password}'`);
              continue;
            }

            console.log(`✅ Login successful for ${email} from ${collection_name} (match document)`);
            const response_data = {};
            for (const [k, v] of Object.entries(user_data)) {
              if (k !== "password" && k !== "organizerPassword") {
                response_data[k] = v;
              }
            }
            response_data.id = doc_id;
            response_data.collection = collection_name;
            response_data.role = "ADMIN";
            // Ensure email field exists for frontend consistency
            response_data.email = response_data.email || response_data.adminEmail || response_data.organizerEmail || email;

            return [successResponse({ user: response_data }, "Login successful"), 200];
          } else {
            // Check password for other collections
            if (stored_password !== password) {
              console.log(`❌ Password mismatch for ${email} in ${collection_name}`);
              continue;
            }

            console.log(`✅ Login successful for ${email} from ${collection_name}`);
            const response_data = {};
            for (const [k, v] of Object.entries(user_data)) {
              if (k !== "password") {
                response_data[k] = v;
              }
            }
            response_data.id = doc_id;
            response_data.collection = collection_name;

            // Set role based on collection
            if (collection_name === "auctioneers" && !response_data.role) {
              response_data.role = "AUCTIONEER";
            } else if (collection_name === "teams" && !response_data.role) {
              response_data.role = "TEAM_REP";
            } else if (collection_name === "players" && !response_data.role) {
              response_data.role = "PLAYER";
            } else if (collection_name === "guests" && !response_data.role) {
              response_data.role = "GUEST";
            }

            return [successResponse({ user: response_data }, "Login successful"), 200];
          }
        }
      } catch (e) {
        console.log(`Error checking ${collection_name}: ${e}`);
        continue;
      }
    }

    console.log(`❌ User not found: ${email}`);
    return [errorResponse("Invalid email or password", 401), 401];
  } catch (e) {
    console.log(`❌ Login error: ${String(e)}`);
    return [errorResponse(`Login failed: ${String(e)}`, 500), 500];
  }
}

async function handle_auth_register(data) {
  try {
    const email = (data.email || "").toLowerCase().trim();
    const password = data.password;
    const role = (data.role || "GUEST").toUpperCase();

    if (!email || !password) {
      return [errorResponse("Email and password required", 400), 400];
    }

    // Map role to collection
    const role_collection_map = {
      AUCTIONEER: "auctioneers",
      TEAM_REP: "teams",
      PLAYER: "players",
      GUEST: "guests",
    };

    const collection_name = role_collection_map[role] || "guests";

    // Check if user already exists
    const snapshot = await getDb().collection(collection_name).where("email", "==", email).get();
    if (!snapshot.empty) {
      return [errorResponse("User already exists", 409), 409];
    }

    // Create user
    const user_id = data.id || generate_id("user");
    const user_data = {
      email: email,
      password: password,
      role: role,
      createdAt: new Date().toISOString(),
      profileComplete: false,
      id: user_id,
    };

    await getDb().collection(collection_name).doc(user_id).set(user_data);

    const response_data = {};
    for (const [k, v] of Object.entries(user_data)) {
      if (k !== "password") {
        response_data[k] = v;
      }
    }
    response_data.collection = collection_name;

    return [successResponse({ user: response_data }, "Registration successful"), 201];
  } catch (e) {
    return [errorResponse(`Registration failed: ${String(e)}`, 500), 500];
  }
}

async function handle_reset_password(data) {
  try {
    const email = (data.email || "").toLowerCase().trim();
    const new_password = data.newPassword;
    const otp = (data.otp || "").trim();

    if (!email || !new_password) {
      return [errorResponse("Email and new password required", 400), 400];
    }

    if (new_password.length < 6) {
      return [errorResponse("Password must be at least 6 characters", 400), 400];
    }

    console.log(`🔐 Password reset for email: ${email}`);

    // Verify OTP first
    const otp_doc_id = email.replace("@", "_at_").replace(/\./g, "_dot_");
    const otp_ref = getDb().collection("password_reset_otps").doc(otp_doc_id);
    const otp_doc = await otp_ref.get();

    if (otp_doc.exists) {
      const otp_data = otp_doc.data() || {};

      // If OTP is provided, verify it
      if (otp) {
        if (otp_data.used) {
          return [errorResponse("This reset code has already been used.", 400), 400];
        }

        const expiry = new Date(otp_data.expiresAt || "2000-01-01");
        if (new Date() > expiry) {
          return [errorResponse("Reset code has expired. Please request a new one.", 400), 400];
        }

        if (otp_data.otp !== otp) {
          return [errorResponse("Invalid verification code.", 400), 400];
        }
      } else if (!otp_data.verified) {
        // Check if OTP was verified (either just now or previously)
        return [errorResponse("Please verify your email first.", 400), 400];
      }
    }

    // Check all role-specific collections
    const collections = ["auctioneers", "teams", "players", "guests", "matches"];

    for (const collection_name of collections) {
      try {
        let snapshot = await getDb().collection(collection_name).where("email", "==", email).get();
        let docs = snapshot.docs;

        // For matches collection, also check adminEmail and organizerEmail fields
        if (collection_name === "matches" && docs.length === 0) {
          const adminSnapshot = await getDb().collection(collection_name).where("adminEmail", "==", email).get();
          const orgSnapshot = await getDb().collection(collection_name).where("organizerEmail", "==", email).get();
          docs = [...adminSnapshot.docs, ...orgSnapshot.docs];
        }

        if (docs.length > 0) {
          const user_doc = docs[0];
          const doc_id = user_doc.id;
          const user_data = user_doc.data() || {};

          // Determine which password field to update
          let update_data;
          if (collection_name === "matches") {
            // For match documents, update organizerPassword
            update_data = {
              organizerPassword: new_password,
              updatedAt: new Date().toISOString(),
            };
            // Also update password if it exists
            if ("password" in user_data) {
              update_data.password = new_password;
            }
          } else {
            update_data = {
              password: new_password,
              updatedAt: new Date().toISOString(),
            };
          }

          await getDb().collection(collection_name).doc(doc_id).update(update_data);

          // Mark OTP as used
          if (otp_doc.exists) {
            await otp_ref.update({ used: true, usedAt: new Date().toISOString() });
          }

          console.log(`✅ Password reset successful for ${email} in ${collection_name}`);
          return [successResponse(null, "Password reset successful"), 200];
        }
      } catch (e) {
        console.log(`Error checking ${collection_name}: ${e}`);
        continue;
      }
    }

    console.log(`❌ User not found for password reset: ${email}`);
    return [errorResponse("User not found", 404), 404];
  } catch (e) {
    console.log(`❌ Password reset error: ${String(e)}`);
    return [errorResponse(`Password reset failed: ${String(e)}`, 500), 500];
  }
}

async function handle_check_email(data) {
  try {
    const email = (data.email || "").toLowerCase().trim();

    if (!email) {
      return [errorResponse("Email required", 400), 400];
    }

    console.log(`🔍 Checking if email exists: ${email}`);

    // Check all role-specific collections
    const collections = ["auctioneers", "teams", "players", "guests", "matches"];
    let found_collection = null;

    for (const collection_name of collections) {
      try {
        let snapshot = await getDb().collection(collection_name).where("email", "==", email).get();
        let docs = snapshot.docs;

        // For matches collection, also check adminEmail and organizerEmail fields
        if (collection_name === "matches" && docs.length === 0) {
          const adminSnapshot = await getDb().collection(collection_name).where("adminEmail", "==", email).get();
          const orgSnapshot = await getDb().collection(collection_name).where("organizerEmail", "==", email).get();
          docs = [...adminSnapshot.docs, ...orgSnapshot.docs];
        }

        if (docs.length > 0) {
          found_collection = collection_name;
          break;
        }
      } catch (e) {
        console.log(`Error checking ${collection_name}: ${e}`);
        continue;
      }
    }

    if (!found_collection) {
      console.log(`❌ Email not found: ${email}`);
      return [errorResponse("No account found with this email address", 404), 404];
    }

    // Generate OTP
    const otp = generate_otp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in Firestore
    const otp_data = {
      email: email,
      otp: otp,
      expiresAt: expiry.toISOString(),
      createdAt: new Date().toISOString(),
      used: false,
    };

    const otp_doc_id = email.replace("@", "_at_").replace(/\./g, "_dot_");
    await getDb().collection("password_reset_otps").doc(otp_doc_id).set(otp_data);

    // Send OTP email
    const email_result = await send_otp_email(email, otp);

    if (email_result.success) {
      console.log(`✅ OTP sent to ${email}`);
      return [
        successResponse(
          {
            exists: true,
            collection: found_collection,
            otpSent: true,
            message: "A 6-digit verification code has been sent to your email.",
          },
          "Verification code sent"
        ),
        200,
      ];
    } else {
      // Email failed - return error so user knows
      const error_msg = email_result.error || "Failed to send verification email";
      console.log(`❌ Email sending failed for ${email}: ${error_msg}`);
      return [errorResponse(`Could not send verification email. ${error_msg}`, 500), 500];
    }
  } catch (e) {
    console.log(`❌ Check email error: ${String(e)}`);
    return [errorResponse(`Check failed: ${String(e)}`, 500), 500];
  }
}

async function handle_verify_otp(data) {
  try {
    const email = (data.email || "").toLowerCase().trim();
    const otp = (data.otp || "").trim();

    if (!email || !otp) {
      return [errorResponse("Email and OTP required", 400), 400];
    }

    console.log(`🔍 Verifying OTP for: ${email}`);

    // Get stored OTP
    const otp_doc_id = email.replace("@", "_at_").replace(/\./g, "_dot_");
    const otp_ref = getDb().collection("password_reset_otps").doc(otp_doc_id);
    const otp_doc = await otp_ref.get();

    if (!otp_doc.exists) {
      return [errorResponse("No verification code found. Please request a new one.", 404), 404];
    }

    const otp_data = otp_doc.data() || {};

    // Check if already used
    if (otp_data.used) {
      return [errorResponse("This code has already been used. Please request a new one.", 400), 400];
    }

    // Check if expired
    const expiry = new Date(otp_data.expiresAt || "2000-01-01");
    if (new Date() > expiry) {
      return [errorResponse("Verification code has expired. Please request a new one.", 400), 400];
    }

    // Check OTP match
    if (otp_data.otp !== otp) {
      return [errorResponse("Invalid verification code. Please try again.", 400), 400];
    }

    // Mark as verified (but not used yet - will be used when password is actually reset)
    await otp_ref.update({ verified: true, verifiedAt: new Date().toISOString() });

    console.log(`✅ OTP verified for ${email}`);
    return [successResponse({ verified: true }, "Verification successful"), 200];
  } catch (e) {
    console.log(`❌ OTP verification error: ${String(e)}`);
    return [errorResponse(`Verification failed: ${String(e)}`, 500), 500];
  }
}

async function get_auth_users(data) {
  try {
    const all_users = [];
    const collections = ["auctioneers", "teams", "players", "guests", "users"];

    for (const collection_name of collections) {
      const snapshot = await getDb().collection(collection_name).get();
      snapshot.docs.forEach((doc) => {
        const user_data = serialize_firestore_doc(doc);
        const filtered = {};
        for (const [k, v] of Object.entries(user_data)) {
          if (k !== "password") {
            filtered[k] = v;
          }
        }
        filtered.collection = collection_name;
        all_users.push(filtered);
      });
    }

    return [successResponse(all_users, "Users retrieved successfully"), 200];
  } catch (e) {
    return [errorResponse(`Failed to retrieve users: ${String(e)}`, 500), 500];
  }
}

async function complete_auth_profile(data) {
  try {
    const user_id = data.id;
    const email = data.email;

    if (!user_id || !email) {
      return [errorResponse("User ID and email required", 400), 400];
    }

    // Try to find and update user in all collections
    const collections = ["auctioneers", "teams", "players", "guests", "users"];

    for (const collection_name of collections) {
      try {
        const doc_ref = getDb().collection(collection_name).doc(user_id);
        const doc = await doc_ref.get();

        if (doc.exists) {
          const update_data = { ...data };
          update_data.profileComplete = true;
          update_data.updatedAt = new Date().toISOString();
          // Remove password if provided
          delete update_data.password;

          await doc_ref.update(update_data);
          const updated_doc = await doc_ref.get();
          const response_data = serialize_firestore_doc(updated_doc);
          const filtered = {};
          for (const [k, v] of Object.entries(response_data)) {
            if (k !== "password") {
              filtered[k] = v;
            }
          }

          return [successResponse(filtered, "Profile completed successfully"), 200];
        }
      } catch (e) {
        console.log(`Error updating ${collection_name}: ${e}`);
        continue;
      }
    }

    return [errorResponse("User not found", 404), 404];
  } catch (e) {
    return [errorResponse(`Profile completion failed: ${String(e)}`, 500), 500];
  }
}

async function handle_register_admin(data) {
  /**
   * Register an admin user in matches collection
   */
  try {
    const requiredFields = ['fullName', 'email', 'password'];
    if (!requiredFields.every(field => field in data)) {
      return [errorResponse(`Missing required fields: ${JSON.stringify(requiredFields)}`), 400];
    }

    const email = (data.email || '').toLowerCase().trim();

    // 🔐 CRITICAL: Check if email is ALREADY USED in ANY collection for ANY match/role
    console.log(`\n🔐 ADMIN EMAIL VALIDATION - checking if ${email} exists in ANY collection...`);

    // Check matches collection (other admins)
    const matchesWithEmail = await getDb().collection('matches').where('email', '==', email).get();
    if (!matchesWithEmail.empty) {
      const matchDoc = matchesWithEmail.docs[0].data();
      const existingMatchId = matchDoc.id || 'unknown';
      return [errorResponse(
        `❌ EMAIL ALREADY IN USE: ${email} is already registered as an ADMIN for another match (ID: ${existingMatchId}). One email can only be used for ONE match.`,
        409
      ), 409];
    }

    // Check auctioneers collection
    const auctioneersWithEmail = await getDb().collection('auctioneers').where('email', '==', email).get();
    if (!auctioneersWithEmail.empty) {
      const auctioneerDoc = auctioneersWithEmail.docs[0].data();
      const existingMatchId = auctioneerDoc.matchId || 'unknown';
      return [errorResponse(
        `❌ EMAIL ALREADY IN USE: ${email} is already registered as an AUCTIONEER in another match (ID: ${existingMatchId}). One email can only be used for ONE match.`,
        409
      ), 409];
    }

    // Check teams collection
    const teamsWithEmail = await getDb().collection('teams').where('email', '==', email).get();
    if (!teamsWithEmail.empty) {
      const teamDoc = teamsWithEmail.docs[0].data();
      const existingMatchId = teamDoc.matchId || 'unknown';
      return [errorResponse(
        `❌ EMAIL ALREADY IN USE: ${email} is already registered as a TEAM in another match (ID: ${existingMatchId}). One email can only be used for ONE match.`,
        409
      ), 409];
    }

    // Check players collection
    const playersWithEmail = await getDb().collection('players').where('email', '==', email).get();
    if (!playersWithEmail.empty) {
      const playerDoc = playersWithEmail.docs[0].data();
      const existingMatchId = playerDoc.matchId || 'unknown';
      return [errorResponse(
        `❌ EMAIL ALREADY IN USE: ${email} is already registered as a PLAYER in another match (ID: ${existingMatchId}). One email can only be used for ONE match.`,
        409
      ), 409];
    }

    console.log(`✅ Email ${email} is unique - no conflicts found in any match`);

    // Create admin user in 'matches' collection
    const userId = generate_id('admin');

    // Handle organizer type - use custom text if "Other" was selected
    let organizerType = data.organizerType || '';
    if (organizerType === 'Other' && data.organizerTypeOther) {
      organizerType = data.organizerTypeOther;
    }

    // Handle sport type - use custom text if "Custom" was selected
    let sportType = data.sportType || '';
    if (sportType === 'Custom' && data.sportTypeCustom) {
      sportType = data.sportTypeCustom;
    }

    // ❌ REQUIRED: All auction configuration must be explicitly provided
    if (!data.maxTeams || data.maxTeams < 2) {
      return [errorResponse('maxTeams is required and must be at least 2 teams', 400), 400];
    }
    if (!data.maxPlayersPerTeam || data.maxPlayersPerTeam < 1) {
      return [errorResponse('maxPlayersPerTeam is required and must be at least 1 player', 400), 400];
    }
    if (!data.baseBudgetPerTeam || data.baseBudgetPerTeam <= 0) {
      return [errorResponse('baseBudgetPerTeam is required and must be greater than 0', 400), 400];
    }

    const maxTeams = data.maxTeams;
    const maxPlayers = data.maxPlayersPerTeam;
    const baseBudget = data.baseBudgetPerTeam;
    
    // ❌ REQUIRED: bidIncrement must be explicitly provided
    if (!data.bidIncrement || data.bidIncrement <= 0) {
      return [errorResponse('bidIncrement is required and must be > 0', 400), 400];
    }
    const bidIncrement = data.bidIncrement;

    // 🔁 SYNC place, venue, and venueLocation - keep them always in sync
    const finalVenue = data.place || data.venue || data.venueLocation || '';

    const userData = {
      id: userId,
      name: data.fullName,
      email: email,
      password: data.password,
      phone: data.phone || '',
      role: 'ADMIN',
      adminId: userId,
      organizationName: data.organizationName || '',
      organizationType: organizerType,
      seasonName: data.seasonName || '',
      sportType: sportType,
      sport: sportType,  // For consistency with match format
      auctionDateTime: data.auctionDateTime || '',
      venueMode: data.venueMode || '',
      place: finalVenue,
      venue: finalVenue,
      venueLocation: finalVenue,
      maxTeams: maxTeams,
      maxPlayersPerTeam: maxPlayers,
      baseBudgetPerTeam: baseBudget,
      bidIncrement: bidIncrement,
      status: 'SETUP',  // Match status
      config: {
        baseTeamBudget: baseBudget,
        totalBudget: baseBudget,
        maxTeams: maxTeams,
        maxSquad: maxPlayers,
        bidIncrement: bidIncrement,
      },
      players: [],
      teams: [],
      history: [],
      adminApprovalStatus: 'APPROVED',  // Auto-approve admins
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await getDb().collection('matches').doc(userId).set(userData);
    console.log(`✅ Admin registered in matches collection: ${email}`);

    // Return user data without password
    const responseData = { ...userData };
    delete responseData.password;
    return [successResponse(responseData, "Admin registered successfully"), 201];
  } catch (e) {
    console.log(`❌ Error registering admin: ${String(e)}`);
    return [errorResponse(String(e), 500), 500];
  }
}

async function handle_register_auctioneer(data) {
  /**
   * Register an auctioneer for a specific match
   */
  try {
    console.log("=".repeat(80));
    console.log("AUCTIONEER REGISTRATION HANDLER STARTED");
    console.log("=".repeat(80));

    console.log(`📦 Received data keys: ${JSON.stringify(Object.keys(data))}`);
    console.log(`📦 Full data object: ${JSON.stringify(data)}`);

    const requiredFields = ['fullName', 'email', 'password', 'seasonId'];
    if (!requiredFields.every(field => field in data)) {
      return [errorResponse(`Missing required fields: ${JSON.stringify(requiredFields)}`), 400];
    }

    console.log(`✅ All required fields present`);
    console.log(`\n🔍 GOVERNMENT ID FIELDS:`);
    console.log(`   - 'governmentId' in data: ${'governmentId' in data}`);
    console.log(`   - data.governmentId: ${data.governmentId}`);
    console.log(`   - 'governmentIdFile' in data: ${'governmentIdFile' in data}`);
    console.log(`   - data.governmentIdFile: ${data.governmentIdFile}`);

    const seasonId = data.seasonId;
    const email = data.email.toLowerCase().trim();

    // Check if this email is already registered for THIS SPECIFIC MATCH
    const existing = await getDb().collection('auctioneers').where('email', '==', email).where('matchId', '==', seasonId).get();
    if (!existing.empty) {
      return [errorResponse(`Email ${email} already registered for this match`, 409), 409];
    }

    // CHECK IF EMAIL IS REGISTERED IN ANY OTHER MATCH (across all collections and matches)
    console.log(`\n🔐 DUPLICATE EMAIL CHECK - checking if ${email} exists in ANY match...`);

    // Check auctioneers collection
    const auctioneersWithEmail = await getDb().collection('auctioneers').where('email', '==', email).get();
    if (!auctioneersWithEmail.empty) {
      const auctioneerDoc = auctioneersWithEmail.docs[0].data();
      const existingMatchId = auctioneerDoc.matchId || 'unknown';
      return [errorResponse(
        `❌ EMAIL ALREADY IN USE: ${email} is already registered as an AUCTIONEER in another match (ID: ${existingMatchId}). One email can only be used for ONE match.`,
        409
      ), 409];
    }

    // Check teams collection
    const teamsWithEmail = await getDb().collection('teams').where('email', '==', email).get();
    if (!teamsWithEmail.empty) {
      const teamDoc = teamsWithEmail.docs[0].data();
      const existingMatchId = teamDoc.matchId || 'unknown';
      return [errorResponse(
        `❌ EMAIL ALREADY IN USE: ${email} is already registered as a TEAM in another match (ID: ${existingMatchId}). One email can only be used for ONE match.`,
        409
      ), 409];
    }

    // Check players collection
    const playersWithEmail = await getDb().collection('players').where('email', '==', email).get();
    if (!playersWithEmail.empty) {
      const playerDoc = playersWithEmail.docs[0].data();
      const existingMatchId = playerDoc.matchId || 'unknown';
      return [errorResponse(
        `❌ EMAIL ALREADY IN USE: ${email} is already registered as a PLAYER in another match (ID: ${existingMatchId}). One email can only be used for ONE match.`,
        409
      ), 409];
    }

    // Check matches collection (admins)
    const matchesWithEmail = await getDb().collection('matches').where('email', '==', email).get();
    if (!matchesWithEmail.empty) {
      const matchDoc = matchesWithEmail.docs[0].data();
      const existingMatchId = matchDoc.id || 'unknown';
      return [errorResponse(
        `❌ EMAIL ALREADY IN USE: ${email} is already registered as an ADMIN for a match (ID: ${existingMatchId}). One email can only be used for ONE match.`,
        409
      ), 409];
    }

    console.log(`✅ Email ${email} is unique - no conflicts found in any match`);

    const userId = generate_id('auctioneer');
    const userData = {
      id: userId,
      name: data.fullName,
      email: email,
      password: data.password,
      phone: data.phone || '',
      role: 'AUCTIONEER',
      auctioneerId: userId,
      matchId: data.seasonId,
      experienceLevel: data.experienceLevel || '',
      languages: data.languages || [],
      previousAuctions: data.previousAuctions || '',
      availability: data.availability || 'Yes',
      governmentId: data.governmentId || '',
      governmentIdFile: data.governmentIdFile || '',
      auctioneerPhoto: data.auctioneerPhoto || '',
      auctioneerLicense: data.auctioneerLicense || '',
      experience: data.experience || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'pending',
      profileComplete: true
    };

    console.log(`\n✅ Creating auctioneer: ${userId} - ${data.email}`);
    console.log(`\n📝 USER_DATA TO BE STORED:`);
    console.log(`   - governmentId: ${userData.governmentId}`);
    console.log(`   - governmentIdFile: ${userData.governmentIdFile}`);
    console.log(`   - auctioneerPhoto: ${userData.auctioneerPhoto}`);
    console.log(`   - name: ${userData.name}`);
    console.log(`   - email: ${userData.email}`);

    await getDb().collection('auctioneers').doc(userId).set(userData);
    console.log(`✅ Auctioneer registered successfully in Firebase`);
    console.log("=".repeat(80));

    return [successResponse({ userId: userId, auctioneerId: userId }, "Auctioneer registered successfully"), 201];
  } catch (e) {
    return [errorResponse(`Failed to register auctioneer: ${String(e)}`), 400];
  }
}

async function handle_register_team(data) {
  /**
   * Register a team representative and create team for a specific match
   */
  try {
    // 🚨 SAFETY: Remove undefined values before Firestore write
    Object.keys(data).forEach(key => {
      if (data[key] === undefined || data[key] === null) {
        delete data[key];
      }
    });
    
    // Validate budget - REQUIRED field
    if (!data.budget || data.budget <= 0) {
      return [errorResponse(`budget is required and must be greater than 0. Received: ${data.budget}`), 400];
    }
    
    const requiredFields = ['fullName', 'email', 'seasonId', 'teamName', 'budget'];
    if (!requiredFields.every(field => field in data)) {
      return [errorResponse(`Missing required fields: ${JSON.stringify(requiredFields)}`), 400];
    }

    const seasonId = data.seasonId;
    const email = data.email.toLowerCase().trim();

    // Check if this email is already registered for THIS SPECIFIC MATCH
    const existing = await getDb().collection('teams').where('email', '==', email).where('matchId', '==', seasonId).get();
    if (!existing.empty) {
      return [errorResponse(`Email ${email} already registered for this match`, 409), 409];
    }

    // CHECK IF EMAIL IS REGISTERED IN ANY OTHER MATCH (across all collections and matches)
    console.log(`\n🔐 DUPLICATE EMAIL CHECK - checking if ${email} exists in ANY match...`);

    // Check auctioneers collection
    const auctioneersWithEmail = await getDb().collection('auctioneers').where('email', '==', email).get();
    if (!auctioneersWithEmail.empty) {
      const auctioneerDoc = auctioneersWithEmail.docs[0].data();
      const existingMatchId = auctioneerDoc.matchId || 'unknown';
      return [errorResponse(
        `❌ EMAIL ALREADY IN USE: ${email} is already registered as an AUCTIONEER in another match (ID: ${existingMatchId}). One email can only be used for ONE match.`,
        409
      ), 409];
    }

    // Check teams collection
    const teamsWithEmail = await getDb().collection('teams').where('email', '==', email).get();
    if (!teamsWithEmail.empty) {
      const teamDoc = teamsWithEmail.docs[0].data();
      const existingMatchId = teamDoc.matchId || 'unknown';
      return [errorResponse(
        `❌ EMAIL ALREADY IN USE: ${email} is already registered as a TEAM in another match (ID: ${existingMatchId}). One email can only be used for ONE match.`,
        409
      ), 409];
    }

    // Check players collection
    const playersWithEmail = await getDb().collection('players').where('email', '==', email).get();
    if (!playersWithEmail.empty) {
      const playerDoc = playersWithEmail.docs[0].data();
      const existingMatchId = playerDoc.matchId || 'unknown';
      return [errorResponse(
        `❌ EMAIL ALREADY IN USE: ${email} is already registered as a PLAYER in another match (ID: ${existingMatchId}). One email can only be used for ONE match.`,
        409
      ), 409];
    }

    // Check matches collection (admins)
    const matchesWithEmail = await getDb().collection('matches').where('email', '==', email).get();
    if (!matchesWithEmail.empty) {
      const matchDoc = matchesWithEmail.docs[0].data();
      const existingMatchId = matchDoc.id || 'unknown';
      return [errorResponse(
        `❌ EMAIL ALREADY IN USE: ${email} is already registered as an ADMIN for a match (ID: ${existingMatchId}). One email can only be used for ONE match.`,
        409
      ), 409];
    }

    console.log(`✅ Email ${email} is unique - no conflicts found in any match`);

    // VALIDATE AGAINST MATCH CONFIG - Check maxTeams limit
    try {
      const matchDoc = await getDb().collection('matches').doc(seasonId).get();
      if (matchDoc.exists) {
        const matchData = matchDoc.data();
        
        // 🔄 REMOVED: Team registration limit - unlimited teams can register
        // Limit will be enforced during auction phase, not registration phase
        console.log(`✅ Team registration allowed (limit enforced at auction time)`);
      }
    } catch (e) {
      console.log(`⚠️ Warning: Could not validate team limit: ${e}`);
    }

    const teamId = generate_id('team');

    // Use budget from frontend if provided, otherwise try to get from matchSettings
    let teamBudget = data.budget;  // Frontend-provided budget (standard case)
    
    if (!teamBudget) {
      // Fallback: Get purse from matchSettings if budget not provided
      try {
        const matchDoc = await getDb().collection('matches').doc(seasonId).get();
        if (matchDoc.exists) {
          const matchData = matchDoc.data();
          const matchSettings = matchData.matchSettings || {};
          teamBudget = matchSettings.pursePerTeam || (matchData.config || {}).baseTeamBudget;
          
          if (!teamBudget) {
            throw new Error('Match purse is not configured. Admin must set baseBudgetPerTeam in match config.');
          }
        }
      } catch (e) {
        console.log(`Warning: Could not fetch match purse: ${e}`);
      }
    }

    const teamData = {
      id: teamId,
      name: data.teamName,
      shortCode: data.teamShortCode || data.teamName.slice(0, 3).toUpperCase(),
      logo: data.teamLogo || '',
      homeCity: data.homeCity || '',
      budget: teamBudget,
      remainingBudget: teamBudget,
      matchId: data.seasonId,
      players: [],
      ownerName: data.fullName,
      email: email,
      phone: data.phone || '',
      role: 'TEAM_REP',
      roleInTeam: data.roleInTeam || '',
      governmentId: data.governmentId || '',
      governmentIdURL: data.governmentIdURL || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profileComplete: true
    };

    await getDb().collection('teams').doc(teamId).set(teamData);

    // ===== LOCK MATCH SETTINGS AFTER FIRST TEAM REGISTERS =====
    // This ensures matchSettings become read-only and cannot be changed
    try {
      const matchRef = getDb().collection('matches').doc(seasonId);
      const matchDoc = await matchRef.get();
      if (matchDoc.exists) {
        const matchData = matchDoc.data();
        const matchSettings = matchData.matchSettings || {};

        // Only lock if not already locked
        if (!matchSettings.isLocked) {
          await matchRef.update({
            'matchSettings.isLocked': true,
            'matchSettings.lockedAt': new Date().toISOString(),
            'matchSettings.lockedReason': 'First team registered'
          });
          console.log(`🔒 MATCH SETTINGS LOCKED: First team (${data.teamName}) registered for match ${seasonId}`);
        }
      }
    } catch (e) {
      console.log(`⚠️ Warning: Could not lock matchSettings: ${e}`);
    }

    return [successResponse({ teamId: teamId }, "Team registered successfully"), 201];
  } catch (e) {
    return [errorResponse(`Failed to register team: ${String(e)}`), 400];
  }
}

async function handle_register_player(data) {
  /**
   * Register a player for a specific match
   */
  try {
    const requiredFields = ['fullName', 'email', 'seasonId', 'basePrice', 'playingRole'];
    if (!requiredFields.every(field => field in data)) {
      return [errorResponse(`Missing required fields: ${JSON.stringify(requiredFields)}`), 400];
    }

    const seasonId = data.seasonId;
    const email = data.email.toLowerCase().trim();

    // Check if this email is already registered for THIS SPECIFIC MATCH
    const existing = await getDb().collection('players').where('email', '==', email).where('matchId', '==', seasonId).get();
    if (!existing.empty) {
      return [errorResponse(`Email ${email} already registered for this match`, 409), 409];
    }

    // CHECK IF EMAIL IS REGISTERED IN ANY OTHER MATCH (across all collections and matches)
    console.log(`\n🔐 DUPLICATE EMAIL CHECK - checking if ${email} exists in ANY match...`);

    // Check auctioneers collection
    const auctioneersWithEmail = await getDb().collection('auctioneers').where('email', '==', email).get();
    if (!auctioneersWithEmail.empty) {
      const auctioneerDoc = auctioneersWithEmail.docs[0].data();
      const existingMatchId = auctioneerDoc.matchId || 'unknown';
      return [errorResponse(
        `❌ EMAIL ALREADY IN USE: ${email} is already registered as an AUCTIONEER in another match (ID: ${existingMatchId}). One email can only be used for ONE match.`,
        409
      ), 409];
    }

    // Check teams collection
    const teamsWithEmail = await getDb().collection('teams').where('email', '==', email).get();
    if (!teamsWithEmail.empty) {
      const teamDoc = teamsWithEmail.docs[0].data();
      const existingMatchId = teamDoc.matchId || 'unknown';
      return [errorResponse(
        `❌ EMAIL ALREADY IN USE: ${email} is already registered as a TEAM in another match (ID: ${existingMatchId}). One email can only be used for ONE match.`,
        409
      ), 409];
    }

    // Check players collection
    const playersWithEmail = await getDb().collection('players').where('email', '==', email).get();
    if (!playersWithEmail.empty) {
      const playerDoc = playersWithEmail.docs[0].data();
      const existingMatchId = playerDoc.matchId || 'unknown';
      return [errorResponse(
        `❌ EMAIL ALREADY IN USE: ${email} is already registered as a PLAYER in another match (ID: ${existingMatchId}). One email can only be used for ONE match.`,
        409
      ), 409];
    }

    // Check matches collection (admins)
    const matchesWithEmail = await getDb().collection('matches').where('email', '==', email).get();
    if (!matchesWithEmail.empty) {
      const matchDoc = matchesWithEmail.docs[0].data();
      const existingMatchId = matchDoc.id || 'unknown';
      return [errorResponse(
        `❌ EMAIL ALREADY IN USE: ${email} is already registered as an ADMIN for a match (ID: ${existingMatchId}). One email can only be used for ONE match.`,
        409
      ), 409];
    }

    console.log(`✅ Email ${email} is unique - no conflicts found in any match`);

    // ===== VALIDATE BASE PRICE AGAINST MATCH SETTINGS =====
    // HARD BLOCK: Base price must not exceed maxBasePrice
    const basePrice = parseInt(data.basePrice);
    let maxBasePrice = null;
    let avgPlayerValue = null;

    try {
      const matchDoc = await getDb().collection('matches').doc(seasonId).get();
      if (matchDoc.exists) {
        const matchData = matchDoc.data();
        const matchSettings = matchData.matchSettings || {};
        maxBasePrice = matchSettings.maxBasePrice;
        avgPlayerValue = matchSettings.avgPlayerValue;
        const pursePerTeam = matchSettings.pursePerTeam;
        const playersPerTeam = matchSettings.maxPlayersPerTeam;

        // HARD BLOCK: Reject if base price exceeds maxBasePrice
        if (maxBasePrice && basePrice > maxBasePrice) {
          return [errorResponse(
            `Base price is too high for the given team purse and squad size. ` +
            `Maximum allowed: ₹${maxBasePrice.toLocaleString()}. Your base price: ₹${basePrice.toLocaleString()}. ` +
            `(Team purse: ₹${pursePerTeam.toLocaleString()} | Squad size: ${playersPerTeam})`,
            400
          ), 400];
        }

        console.log(`✅ Base price validation passed: ₹${basePrice.toLocaleString()} <= ₹${maxBasePrice.toLocaleString()}`);
      }
    } catch (e) {
      console.log(`⚠️ Warning: Could not validate base price against matchSettings: ${e}`);
    }

    const playerId = generate_id('player');
    const playerData = {
      id: playerId,
      name: data.fullName,
      email: email,
      phone: data.phone || '',
      role: 'PLAYER',
      roleId: data.playingRole || '',
      basePrice: basePrice,
      isOverseas: data.isOverseas || false,
      status: 'PENDING',
      matchId: data.seasonId,
      age: data.age || 25,
      nationality: data.nationality || '',
      dateOfBirth: data.dateOfBirth || '',
      gender: data.gender || '',
      battingStyle: data.battingStyle || '',
      bowlingStyle: data.bowlingStyle || '',
      experienceLevel: data.experienceLevel || '',
      previousTeams: data.previousTeams || '',
      playerCategory: data.playerCategory || '',
      availability: data.availability || 'Yes',
      imageUrl: data.imageUrl || '',
      bio: data.bio || '',
      stats: data.stats || '',
      governmentId: data.governmentId || '',
      governmentIdURL: data.governmentIdURL || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profileComplete: true
    };

    await getDb().collection('players').doc(playerId).set(playerData);

    return [successResponse({ playerId: playerId }, "Player registered successfully"), 201];
  } catch (e) {
    return [errorResponse(`Failed to register player: ${String(e)}`), 400];
  }
}

async function handle_register_guest(data) {
  /**
   * Register a guest for a specific match
   */
  try {
    const requiredFields = ['fullName', 'email', 'password', 'seasonId'];
    if (!requiredFields.every(field => field in data)) {
      return [errorResponse(`Missing required fields: ${JSON.stringify(requiredFields)}`), 400];
    }

    const seasonId = data.seasonId;
    const email = data.email.toLowerCase().trim();

    // Check if this email is already registered for THIS SPECIFIC MATCH
    const existing = await getDb().collection('guests').where('email', '==', email).where('matchId', '==', seasonId).get();
    if (!existing.empty) {
      return [errorResponse(`Email ${email} already registered for this match`, 409), 409];
    }

    const userId = generate_id('guest');
    const userData = {
      id: userId,
      name: data.fullName,
      email: email,
      password: data.password,
      phone: data.phone || '',
      role: 'GUEST',
      matchId: data.seasonId,
      favoriteSport: data.favoriteSport || '',
      favoriteTeam: data.favoriteTeam || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profileComplete: true
    };

    await getDb().collection('guests').doc(userId).set(userData);

    return [successResponse({ guestId: userId }, "Guest registered successfully"), 201];
  } catch (e) {
    return [errorResponse(`Failed to register guest: ${String(e)}`), 400];
  }
}

async function get_teams(data) {
  // Accept both 'matchId' and 'seasonId' for backward compatibility
  const matchId = data.matchId || data.seasonId;
  const approvalStatus = data.approvalStatus;
  
  let query = getDb().collection('teams');
  if (matchId) {
    query = query.where('matchId', '==', matchId);
  }
  
  // Support approvalStatus filter for Guest/Spectator views
  if (approvalStatus) {
    // Filter by approval status: 'accepted', 'pending', 'declined'
    // 'pending' includes both explicit 'pending' AND missing approvalStatus field
    if (approvalStatus === 'pending') {
      // For pending, we need to get all and filter in JS
      const snapshot = await query.get();
      const filteredDocs = [];
      for (const doc of snapshot.docs) {
        const docData = doc.data();
        const status = docData.approvalStatus;
        if (status === undefined || status === null || status === 'pending') {
          filteredDocs.push(serializeFirestoreDoc(doc));
        }
      }
      return [successResponse(filteredDocs), 200];
    } else {
      query = query.where('approvalStatus', '==', approvalStatus);
    }
  }
  
  const snapshot = await query.get();
  return [successResponse(serializeFirestoreDocs(snapshot.docs)), 200];
}

async function get_team(teamId) {
  const doc = await getDb().collection('teams').doc(teamId).get();
  if (!doc.exists) {
    return [errorResponse("Not found", 404), 404];
  }
  return [successResponse(serializeFirestoreDoc(doc)), 200];
}

async function create_team(data) {
  const teamId = data.id || generate_id('team');
  data.id = teamId;
  data.createdAt = new Date().toISOString();
  await getDb().collection('teams').doc(teamId).set(data);
  return [successResponse(data), 201];
}

async function update_team(teamId, data) {
  const docRef = getDb().collection('teams').doc(teamId);
  const doc = await docRef.get();
  if (!doc.exists) {
    return [errorResponse("Not found", 404), 404];
  }
  data.updatedAt = new Date().toISOString();
  await docRef.update(data);
  const updatedDoc = await docRef.get();
  return [successResponse(serializeFirestoreDoc(updatedDoc)), 200];
}

async function delete_team(teamId) {
  await getDb().collection('teams').doc(teamId).delete();
  return [successResponse(null, "Deleted"), 200];
}

async function update_team_budget(teamId, data) {
  /**
   * Update team's remaining budget after a purchase
   */
  try {
    const amount = data.amount;
    if (amount === undefined || amount === null) {
      return [errorResponse("Missing 'amount' field"), 400];
    }

    const teamRef = getDb().collection('teams').doc(teamId);
    const team = await teamRef.get();

    if (!team.exists) {
      return [errorResponse(`Team ${teamId} not found`, 404), 404];
    }

    const teamData = team.data();
    const currentBudget = teamData.remainingBudget || 0;
    const newBudget = currentBudget - amount;

    if (newBudget < 0) {
      return [errorResponse("Insufficient budget", 400), 400];
    }

    await teamRef.update({
      remainingBudget: newBudget,
      updatedAt: new Date().toISOString()
    });

    const updated = await teamRef.get();
    return [successResponse(serializeFirestoreDoc(updated), "Budget updated successfully"), 200];
  } catch (e) {
    return [errorResponse(String(e)), 400];
  }
}

async function update_team_approval(teamId, status) {
  /**
   * Update team approval status (pending | accepted | declined)
   */
  try {
    const docRef = getDb().collection('teams').doc(teamId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return [errorResponse("Team not found", 404), 404];
    }

    await docRef.update({
      approvalStatus: status,
      approvalUpdatedAt: new Date().toISOString()
    });

    const updatedDoc = await docRef.get();
    const teamData = serializeFirestoreDoc(updatedDoc);

    console.log(`✓ Team ${teamId} approval status updated to: ${status}`);
    return [successResponse(teamData, `Team ${status} successfully`), 200];
  } catch (e) {
    console.log(`✗ Error updating team approval: ${e}`);
    return [errorResponse(String(e), 500), 500];
  }
}

async function get_auctioneers(data) {
  /**
   * Get auctioneers with optional filtering
   */
  try {
    let query = getDb().collection('auctioneers');

    // Filter by email if provided
    if (data.email) {
      query = query.where('email', '==', data.email);
    }

    // Filter by matchId/seasonId if provided (accept both for backward compatibility)
    const matchId = data.matchId || data.seasonId;
    if (matchId) {
      query = query.where('matchId', '==', matchId);
    }

    const snapshot = await query.get();
    const auctioneers = snapshot.docs.map(doc => serializeFirestoreDoc(doc));

    return [successResponse(auctioneers, "Auctioneers retrieved successfully"), 200];
  } catch (e) {
    return [errorResponse(`Failed to retrieve auctioneers: ${String(e)}`, 500), 500];
  }
}

async function get_auctioneer(auctioneer_id) {
  /**Get single auctioneer by ID*/
  try {
    const doc = await getDb().collection('auctioneers').doc(auctioneer_id).get();
    if (!doc.exists) {
      return [errorResponse("Auctioneer not found", 404), 404];
    }
    return [successResponse(serializeFirestoreDoc(doc)), 200];
  } catch (e) {
    return [errorResponse(String(e)), 400];
  }
}

async function create_auctioneer(data) {
  /**
   * Create new auctioneer
   */
  try {
    const auctioneerId = data.id || generate_id('auctioneer');
    data.id = auctioneerId;
    data.createdAt = new Date().toISOString();
    data.approvalStatus = 'PENDING';  // New auctioneers start as pending

    await getDb().collection('auctioneers').doc(auctioneerId).set(data);
    return [successResponse(data), 201];
  } catch (e) {
    return [errorResponse(String(e)), 400];
  }
}

async function update_auctioneer(auctioneerId, data) {
  /**
   * Update auctioneer
   */
  try {
    const docRef = getDb().collection('auctioneers').doc(auctioneerId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return [errorResponse("Auctioneer not found", 404), 404];
    }

    data.updatedAt = new Date().toISOString();
    await docRef.update(data);

    const updatedDoc = await docRef.get();
    return [successResponse(serializeFirestoreDoc(updatedDoc)), 200];
  } catch (e) {
    return [errorResponse(String(e)), 400];
  }
}

async function delete_auctioneer(auctioneerId) {
  /**
   * Delete auctioneer
   */
  try {
    await getDb().collection('auctioneers').doc(auctioneerId).delete();
    return [successResponse(null, "Deleted"), 200];
  } catch (e) {
    return [errorResponse(String(e)), 400];
  }
}

async function get_auctioneer_by_email(email) {
  /**
   * Fetch auctioneer by email from query params
   */
  try {
    const snapshot = await getDb().collection('auctioneers').where('email', '==', email).limit(1).get();
    if (!snapshot.empty) {
      const auctioneerData = snapshot.docs[0].data();
      console.log(`✅ Found auctioneer by email ${email}: ${auctioneerData.name}`);
      return [successResponse(auctioneerData, 'Auctioneer found'), 200];
    }

    console.log(`❌ No auctioneer found with email: ${email}`);
    return [errorResponse("Auctioneer not found", 404), 404];
  } catch (e) {
    console.log(`❌ Error fetching auctioneer by email: ${String(e)}`);
    return [errorResponse(`Error: ${String(e)}`, 500), 500];
  }
}

async function get_auctioneer(identifier, data) {
  /**
   * Fetch auctioneer by ID or email
   */
  try {
    // Try to fetch by ID first
    const auctioneerDoc = await getDb().collection('auctioneers').doc(identifier).get();
    if (auctioneerDoc.exists) {
      return [successResponse(auctioneerDoc.data(), 'Auctioneer found'), 200];
    }

    // If not found by ID, try to fetch by email
    const email = identifier.includes('@') ? identifier : null;
    if (email) {
      const snapshot = await getDb().collection('auctioneers').where('email', '==', email).limit(1).get();
      if (!snapshot.empty) {
        const auctioneerData = snapshot.docs[0].data();
        return [successResponse(auctioneerData, 'Auctioneer found'), 200];
      }
    }

    // Not found
    return [errorResponse("Auctioneer not found", 404), 404];
  } catch (e) {
    console.log(`❌ Error fetching auctioneer: ${String(e)}`);
    return [errorResponse(`Error: ${String(e)}`, 500), 500];
  }
}

async function approve_auctioneer(data) {
  /**
   * Approve pending auctioneer
   * CRITICAL: Update BOTH 'status' (for backward compat) AND 'approvalStatus' (for frontend)
   */
  try {
    const auctioneerId = data.id;
    if (!auctioneerId) {
      return [errorResponse("Auctioneer ID required", 400), 400];
    }

    const docRef = getDb().collection('auctioneers').doc(auctioneerId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return [errorResponse("Auctioneer not found", 404), 404];
    }

    // Update BOTH fields for consistency:
    // - 'status' (lowercase) for AdminDashboard display
    // - 'approvalStatus' (uppercase APPROVED) for frontend auth check
    await docRef.update({
      status: 'approved',
      approvalStatus: 'APPROVED',
      approvedAt: new Date().toISOString()
    });

    console.log(`✅ Auctioneer ${auctioneerId} approved - set status=approved, approvalStatus=APPROVED`);

    const updatedDoc = await docRef.get();
    return [successResponse(serializeFirestoreDoc(updatedDoc), "Auctioneer approved successfully"), 200];
  } catch (e) {
    return [errorResponse(String(e)), 400];
  }
}

async function reject_auctioneer(data) {
  /**
   * Reject pending auctioneer
   * CRITICAL: Update BOTH 'status' (for backward compat) AND 'approvalStatus' (for frontend)
   */
  try {
    const auctioneerId = data.id;
    const reason = data.reason || 'No reason provided';

    if (!auctioneerId) {
      return [errorResponse("Auctioneer ID required", 400), 400];
    }

    const docRef = getDb().collection('auctioneers').doc(auctioneerId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return [errorResponse("Auctioneer not found", 404), 404];
    }

    // Update BOTH fields for consistency:
    // - 'status' (lowercase) for AdminDashboard display
    // - 'approvalStatus' (uppercase REJECTED) for frontend auth check
    await docRef.update({
      status: 'rejected',
      approvalStatus: 'REJECTED',
      rejectionReason: reason,
      rejectedAt: new Date().toISOString()
    });

    console.log(`❌ Auctioneer ${auctioneerId} rejected - set status=rejected, approvalStatus=REJECTED`);

    const updatedDoc = await docRef.get();
    return [successResponse(serializeFirestoreDoc(updatedDoc), "Auctioneer rejected successfully"), 200];
  } catch (e) {
    return [errorResponse(String(e)), 400];
  }
}

async function update_auctioneer_photo(data) {
  /**
   * Update auctioneer profile photo with Firebase Storage URL
   */
  try {
    const auctioneerId = data.id;
    const photoUrl = data.photoUrl;

    if (!auctioneerId || !photoUrl) {
      return [errorResponse("Auctioneer ID and photoUrl required", 400), 400];
    }

    const docRef = getDb().collection('auctioneers').doc(auctioneerId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return [errorResponse(`Auctioneer ${auctioneerId} not found`, 404), 404];
    }

    const currentDoc = serializeFirestoreDoc(doc);

    console.log(`📸 Updating auctioneer photo for ${auctioneerId}`);
    console.log(`   Old photoUrl: ${currentDoc.auctioneerPhoto || 'None'}`);
    console.log(`   New photoUrl: ${photoUrl}`);

    await docRef.update({
      auctioneerPhoto: photoUrl,
      updatedAt: new Date().toISOString()
    });

    const updatedDoc = await docRef.get();

    console.log(`✅ Successfully updated auctioneer photo for ${auctioneerId}`);
    return [successResponse(serializeFirestoreDoc(updatedDoc), "Auctioneer photo updated successfully"), 200];
  } catch (e) {
    console.log(`❌ Error updating auctioneer photo: ${String(e)}`);
    return [errorResponse(`Failed to update auctioneer photo: ${String(e)}`, 500), 500];
  }
}

async function get_players(data) {
  // Accept both 'matchId' and 'seasonId' for backward compatibility
  const matchId = data.matchId || data.seasonId;
  const email = data.email;
  const approvalStatus = data.approvalStatus;

  let query = getDb().collection('players');
  if (matchId) {
    query = query.where('matchId', '==', matchId);
  }
  if (email) {
    query = query.where('email', '==', email);
  }
  if (approvalStatus) {
    // Filter by approval status: 'accepted', 'pending', 'declined'
    // 'pending' includes both explicit 'pending' AND missing approvalStatus field
    if (approvalStatus === 'pending') {
      // For pending, we need to get all and filter in JS
      // because Firestore can't query for null OR value
      const snapshot = await query.get();
      const filteredDocs = [];
      for (const doc of snapshot.docs) {
        const docData = doc.data();
        const status = docData.approvalStatus;
        if (status === undefined || status === null || status === 'pending') {
          filteredDocs.push(normalizePlayerForApi(serializeFirestoreDoc(doc)));
        }
      }

      if (data && (data.debug === '1' || data.debug === 1 || data.debug === true)) {
        console.log(
          'PLAYER API RESPONSE →',
          JSON.stringify(
            {
              count: filteredDocs.length,
              sample: filteredDocs.slice(0, 3).map((p) => ({
                id: p.id,
                name: p.name,
                matchId: p.matchId,
                approvalStatus: p.approvalStatus,
                basePrice: p.basePrice,
                base_price: p.base_price,
              })),
            },
            null,
            2
          )
        );
      }

      return [successResponse(filteredDocs), 200];
    } else {
      query = query.where('approvalStatus', '==', approvalStatus);
    }
  }

  const snapshot = await query.get();
  const players = serializeFirestoreDocs(snapshot.docs).map(normalizePlayerForApi);

  if (data && (data.debug === '1' || data.debug === 1 || data.debug === true)) {
    console.log(
      'PLAYER API RESPONSE →',
      JSON.stringify(
        {
          count: players.length,
          sample: players.slice(0, 3).map((p) => ({
            id: p.id,
            name: p.name,
            matchId: p.matchId,
            approvalStatus: p.approvalStatus,
            basePrice: p.basePrice,
            base_price: p.base_price,
          })),
        },
        null,
        2
      )
    );
  }

  return [successResponse(players), 200];
}

async function get_player(playerId) {
  const doc = await getDb().collection('players').doc(playerId).get();
  if (!doc.exists) {
    return [errorResponse("Not found", 404), 404];
  }
  const player = normalizePlayerForApi(serializeFirestoreDoc(doc));
  return [successResponse(player), 200];
}

async function create_player(data) {
  const playerId = data.id || generate_id('player');
  data.id = playerId;
  data.createdAt = new Date().toISOString();
  await getDb().collection('players').doc(playerId).set(data);
  return [successResponse(data), 201];
}

async function update_player(playerId, data) {
  const docRef = getDb().collection('players').doc(playerId);
  const doc = await docRef.get();
  if (!doc.exists) {
    return [errorResponse("Not found", 404), 404];
  }
  data.updatedAt = new Date().toISOString();
  await docRef.update(data);
  const updatedDoc = await docRef.get();
  return [successResponse(serializeFirestoreDoc(updatedDoc)), 200];
}

async function delete_player(playerId) {
  await getDb().collection('players').doc(playerId).delete();
  return [successResponse(null, "Deleted"), 200];
}

async function update_player_approval(playerId, status) {
  /**
   * Update player approval status (pending | accepted | declined)
   */
  try {
    const docRef = getDb().collection('players').doc(playerId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return [errorResponse("Player not found", 404), 404];
    }

    await docRef.update({
      approvalStatus: status,
      approvalUpdatedAt: new Date().toISOString()
    });

    const updatedDoc = await docRef.get();
    const playerData = serializeFirestoreDoc(updatedDoc);

    console.log(`✓ Player ${playerId} approval status updated to: ${status}`);
    return [successResponse(playerData, `Player ${status} successfully`), 200];
  } catch (e) {
    console.log(`✗ Error updating player approval: ${e}`);
    return [errorResponse(String(e), 500), 500];
  }
}

async function start_player_bidding(data) {
  /**Start bidding for a specific player*/
  try {
    const seasonId = data.seasonId;
    const playerId = data.playerId;
    const basePrice = data.basePrice || 0;

    console.log(`📋 Start player bidding request: season=${seasonId}, player=${playerId}, basePrice=${basePrice}`);

    if (!seasonId || !playerId) {
      return [errorResponse("Missing seasonId or playerId"), 400];
    }

    // Verify player exists first
    const playerRef = getDb().collection('players').doc(playerId);
    const playerDoc = await playerRef.get();
    if (!playerDoc.exists) {
      const errorMsg = `Player ${playerId} not found in database`;
      console.log(`❌ ${errorMsg}`);
      return [errorResponse(errorMsg), 404];
    }

    const playerCurrentData = playerDoc.data() || {};
    const isResumingLive = playerCurrentData.status === 'LIVE';

    // Ensure only ONE player is LIVE at a time for this season.
    // If previous runs left multiple players as LIVE, normalize them back to AVAILABLE.
    try {
      const livePlayersSnap = await getDb()
        .collection('players')
        .where('matchId', '==', seasonId)
        .where('status', '==', 'LIVE')
        .get();
      for (const doc of livePlayersSnap.docs) {
        if (doc.id !== playerId) {
          await getDb().collection('players').doc(doc.id).update({
            status: 'AVAILABLE',
            updatedAt: new Date().toISOString()
          });
          console.log(`✓ Cleared LIVE status from previous player: ${doc.id}`);
        }
      }
    } catch (e) {
      console.log(`⚠ Warning clearing previous LIVE players: ${e}`);
    }

    // Determine if we should preserve existing bid or reset to base price
    let shouldPreserveBid = false;
    let existingCurrentBid = playerCurrentData.currentBid;

    if (isResumingLive && existingCurrentBid && existingCurrentBid > basePrice) {
      // If resuming and player already has bids above basePrice, preserve them
      shouldPreserveBid = true;
      console.log(`📌 Resuming LIVE player with existing bid ₹${existingCurrentBid} - preserving bid state`);
    } else {
      // Otherwise, check if there are any bids in history for this player
      try {
        const existingBidsSnap = await getDb()
          .collection('bids')
          .where('seasonId', '==', seasonId)
          .where('playerId', '==', playerId)
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get();
        if (!existingBidsSnap.empty) {
          const latestBidDoc = existingBidsSnap.docs[0];
          const latestBid = latestBidDoc.data() || {};
          const latestBidAmount = latestBid.amount || 0;
          if (latestBidAmount > basePrice) {
            shouldPreserveBid = true;
            existingCurrentBid = latestBidAmount;
            console.log(`⚠️ Found existing bid ₹${latestBidAmount} in history - will preserve if resuming`);
          }
        }
      } catch (e) {
        console.log(`⚠ Warning checking bid history: ${e}`);
      }
    }

    // Update player status to LIVE (preserve or reset bid data based on above logic)
    try {
      const updateData = {
        status: 'LIVE',
        basePrice: basePrice,
        updatedAt: new Date().toISOString()
      };

      if (shouldPreserveBid && existingCurrentBid) {
        // PRESERVE existing bid state
        updateData.currentBid = existingCurrentBid;
        console.log(`✓ Preserved existing bid: ₹${existingCurrentBid}`);
      } else {
        // RESET to base price for new bidding
        updateData.currentBid = basePrice;
        updateData.leadingTeamId = null;
        updateData.leadingTeamName = null;
        console.log(`✓ Reset bidding to base price: ₹${basePrice}`);
      }

      await playerRef.update(updateData);
      console.log(`✓ Updated player ${playerId} to LIVE`);
    } catch (e) {
      console.log(`❌ Failed to update player: ${e}`);
      return [errorResponse(`Failed to update player status: ${String(e)}`), 400];
    }

    // Fetch updated player so we can broadcast a full object
    let updatedPlayer;
    try {
      const updatedPlayerDoc = await playerRef.get();
      updatedPlayer = { id: updatedPlayerDoc.id, ...updatedPlayerDoc.data() };
      console.log(`✓ Fetched updated player: ${updatedPlayer.name}`);
    } catch (e) {
      console.log(`❌ Failed to fetch updated player: ${e}`);
      return [errorResponse(`Failed to fetch updated player: ${String(e)}`), 400];
    }

    // Canonical current player doc (all dashboards listen here)
    // Use the actual currentBid that was set (preserved or reset)
    const actualCurrentBid = (shouldPreserveBid && existingCurrentBid) ? existingCurrentBid : basePrice;
    try {
      await _set_current_player(seasonId, updatedPlayer, actualCurrentBid);
      console.log(`✓ Set canonical current player doc with currentBid=${actualCurrentBid}`);
    } catch (e) {
      console.log(`❌ Failed to set current player doc: ${e}`);
      return [errorResponse(`Failed to set current player: ${String(e)}`), 400];
    }

    // Update canonical live auction state doc (all dashboards listen here)
    try {
      await _set_live_auction_state(seasonId, {
        status: 'LIVE',
        currentPlayerId: playerId,
        currentPlayerName: updatedPlayer.name,
        currentBid: actualCurrentBid,
        leadingTeamId: shouldPreserveBid ? updatedPlayer.leadingTeamId : null,
        leadingTeamName: shouldPreserveBid ? updatedPlayer.leadingTeamName : null,
        biddingActive: true,
        remainingSeconds: 0
      });
      console.log(`✓ Updated live auction state with currentBid=${actualCurrentBid}`);
    } catch (e) {
      console.log(`❌ Failed to update auction state: ${e}`);
      return [errorResponse(`Failed to update auction state: ${String(e)}`), 400];
    }

    // Emit real-time event
    try {
      await emit_realtime_event('player_bidding_started', {
        player: updatedPlayer,
        playerId: playerId,
        basePrice: basePrice,
        seasonId: seasonId
      }, seasonId);
      console.log(`✓ Emitted player_bidding_started event`);
    } catch (e) {
      console.log(`⚠ Warning emitting event: ${e}`);
    }

    console.log(`✅ Successfully started bidding for player ${playerId}`);
    return [successResponse({
      playerId: playerId,
      status: 'LIVE',
      basePrice: basePrice
    }, "Player bidding started"), 200];

  } catch (e) {
    const errorMsg = String(e);
    console.log(`❌ Unexpected error in start_player_bidding: ${errorMsg}`);
    return [errorResponse(`Failed to start player bidding: ${errorMsg}`), 400];
  }
}

async function close_player_bidding(data) {
  /**Close bidding for current player*/
  try {
    const seasonId = data.seasonId;
    const sold = data.sold || false;

    console.log(`📋 Close player bidding request: season=${seasonId}, sold=${sold}`);

    if (!seasonId) {
      return [errorResponse("Missing seasonId"), 400];
    }

    // Get current player from canonical doc first
    let playerId = null;
    try {
      const currentPlayerDoc = await getDb().collection('liveAuctions').doc(seasonId).collection('currentPlayer').doc('active').get();
      if (currentPlayerDoc.exists) {
        const cp = currentPlayerDoc.data() || {};
        const playerObj = cp.player || {};
        playerId = cp.playerId || playerObj.id;
        console.log(`✓ Found player from canonical doc: ${playerId}`);
      }
    } catch (e) {
      console.log(`⚠ Failed to fetch canonical player doc: ${e}`);
    }

    let playerDoc;
    if (playerId) {
      try {
        playerDoc = await getDb().collection('players').doc(playerId).get();
        if (!playerDoc.exists) {
          const errorMsg = `Player ${playerId} not found`;
          console.log(`❌ ${errorMsg}`);
          return [errorResponse(errorMsg), 404];
        }
      } catch (e) {
        console.log(`❌ Failed to fetch player: ${e}`);
        return [errorResponse(`Failed to fetch player: ${String(e)}`), 400];
      }
    } else {
      // Fallback: find LIVE player
      try {
        const livePlayersSnapshot = await getDb().collection('players')
          .where('matchId', '==', seasonId)
          .where('status', '==', 'LIVE')
          .limit(1)
          .get();

        if (livePlayersSnapshot.empty) {
          const errorMsg = "No active player bidding found";
          console.log(`❌ ${errorMsg}`);
          return [errorResponse(errorMsg), 404];
        }
        playerDoc = livePlayersSnapshot.docs[0];
        console.log(`✓ Found LIVE player via query: ${playerDoc.id}`);
      } catch (e) {
        console.log(`❌ Failed to find LIVE player: ${e}`);
        return [errorResponse(`Failed to find active player: ${String(e)}`), 400];
      }
    }

    let playerData;
    try {
      playerData = serializeFirestoreDoc(playerDoc);
    } catch (e) {
      console.log(`❌ Failed to serialize player: ${e}`);
      return [errorResponse(`Failed to process player data: ${String(e)}`), 400];
    }

    // Update player status (preserve currentBid and team data)
    const newStatus = sold ? 'SOLD' : 'UNSOLD';
    const targetPlayerId = playerData.id || playerDoc.id;
    const playerRef = getDb().collection('players').doc(targetPlayerId);
    const updateData = {
      status: newStatus,
      updatedAt: new Date().toISOString()
    };

    // If sold, add sold-to team and amount
    if (sold) {
      const soldTeamId = playerData.leadingTeamId;
      const soldAmount = playerData.currentBid || 0;

      // VALIDATE SQUAD SIZE LIMIT
      if (soldTeamId) {
        try {
          // Get match config
          const matchDoc = await getDb().collection('matches').doc(seasonId).get();
          if (matchDoc.exists) {
            const matchData = matchDoc.data();
            const config = matchData.config || {};
            const squadSize = config.squadSize || {};
            const maxSquad = config.maxSquad || squadSize.max || matchData.maxPlayersPerTeam;
            
            if (!maxSquad) {
              throw new Error('Match configuration is incomplete: maxSquad not found in config or matchData');
            }

            // Get team's current squad
            const teamDoc = await getDb().collection('teams').doc(soldTeamId).get();
            if (teamDoc.exists) {
              const teamData = serializeFirestoreDoc(teamDoc);
              const currentSquad = teamData.players || [];
              const currentSquadSize = currentSquad.length;

              if (currentSquadSize >= maxSquad) {
                return [errorResponse(
                  `❌ SQUAD LIMIT REACHED: Team ${teamData.name || soldTeamId} already has ${currentSquadSize} players (maximum: ${maxSquad}). Cannot add more players.`,
                  400
                ), 400];
              }

              console.log(`✅ Squad size OK: ${currentSquadSize + 1}/${maxSquad} players`);
            }
          }
        } catch (e) {
          console.log(`⚠️ Warning: Could not validate squad limit: ${e}`);
        }
      }

      updateData.soldTo = soldTeamId;
      updateData.buyingTeamId = soldTeamId;  // Also set buyingTeamId for frontend compatibility
      updateData.soldAmount = soldAmount;
      updateData.soldPrice = soldAmount;  // Also set soldPrice for frontend compatibility
      updateData.soldAt = new Date().toISOString();
      console.log(`✓ Recording SOLD: soldTo=${soldTeamId}, soldAmount=${soldAmount}`);

      // Update team's remaining budget
      if (soldTeamId && soldAmount > 0) {
        try {
          const teamRef = getDb().collection('teams').doc(soldTeamId);
          const teamDoc = await teamRef.get();
          if (teamDoc.exists) {
            const teamData = serializeFirestoreDoc(teamDoc);
            const currentRemaining = teamData.remainingBudget || teamData.budget || 0;
            const newRemaining = currentRemaining - soldAmount;

            await teamRef.update({
              remainingBudget: Math.max(0, newRemaining),
              updatedAt: new Date().toISOString()
            });
            console.log(`✓ Updated team ${soldTeamId} budget: ₹${(currentRemaining/100000).toFixed(1)}L → ₹${(newRemaining/100000).toFixed(1)}L`);
          } else {
            console.log(`⚠ Team ${soldTeamId} not found for budget update`);
          }
        } catch (e) {
          console.log(`⚠ Warning updating team budget: ${e}`);
          // Don't fail the entire operation if budget update fails
        }
      }
    } else {
      // If unsold, clear bid data and increment unsold count
      const unsoldCount = (playerData.unsoldCount || 0) + 1;
      updateData.currentBid = playerData.basePrice || 0;
      updateData.leadingTeamId = null;
      updateData.leadingTeamName = null;
      updateData.unsoldCount = unsoldCount;
      console.log(`✓ Recording UNSOLD: count=${unsoldCount}`);
    }

    try {
      await playerRef.update(updateData);
      console.log(`✓ Updated player ${targetPlayerId} status to ${newStatus}`);
    } catch (e) {
      console.log(`❌ Failed to update player status: ${e}`);
      return [errorResponse(`Failed to update player: ${String(e)}`), 400];
    }

    // Update auction state - add to unsold list if unsold
    const auctionUpdates = {
      currentPlayerId: null,
      currentPlayerName: null,
      biddingActive: false,
      leadingTeamId: null,
      leadingTeamName: null
    };

    // Track unsold players
    if (!sold) {
      try {
        const auctionDoc = await getDb().collection('liveAuctions').doc(seasonId).get();
        const auctionState = auctionDoc.exists ? auctionDoc.data() : {};
        const unsoldPlayers = auctionState.unsoldPlayers || [];
        if (!unsoldPlayers.includes(targetPlayerId)) {
          unsoldPlayers.push(targetPlayerId);
        }
        auctionUpdates.unsoldPlayers = unsoldPlayers;
        console.log(`✓ Added player to unsold list (total: ${unsoldPlayers.length})`);
      } catch (e) {
        console.log(`⚠ Warning tracking unsold player: ${e}`);
      }
    }

    // Update live auction state + clear current player
    try {
      await _set_live_auction_state(seasonId, auctionUpdates);
      console.log(`✓ Updated live auction state`);
    } catch (e) {
      console.log(`⚠ Warning updating auction state: ${e}`);
    }

    // Clear canonical current player doc to prevent stale hydration
    try {
      await _clear_current_player(seasonId);
      console.log(`✓ Cleared canonical current player doc`);
    } catch (e) {
      console.log(`⚠ Warning clearing current player: ${e}`);
    }

    // Write stable event docs used by existing listeners
    try {
      if (sold) {
        await _emit_named_event_doc(seasonId, 'playerSold', {
          playerId: targetPlayerId,
          playerName: playerData.name,
          teamId: playerData.leadingTeamId,
          teamName: playerData.leadingTeamName,
          finalAmount: playerData.currentBid || 0,
          seasonId: seasonId
        });
        console.log(`✓ Emitted playerSold event`);
      } else {
        await _emit_named_event_doc(seasonId, 'playerUnsold', {
          playerId: targetPlayerId,
          playerName: playerData.name,
          finalAmount: playerData.basePrice || 0,
          seasonId: seasonId
        });
        console.log(`✓ Emitted playerUnsold event`);
      }
    } catch (e) {
      console.log(`⚠ Warning emitting event docs: ${e}`);
    }

    // AUTO-SEQUENCE: Get next player (AVAILABLE prioritized, then UNSOLD)
    let nextPlayer = null;
    let nextPlayerId = null;
    try {
      // Priority 1: Find first AVAILABLE player
      const availablePlayersSnapshot = await getDb().collection('players')
        .where('matchId', '==', seasonId)
        .where('status', '==', 'AVAILABLE')
        .limit(1)
        .get();

      if (!availablePlayersSnapshot.empty) {
        nextPlayer = serializeFirestoreDoc(availablePlayersSnapshot.docs[0]);
        nextPlayerId = availablePlayersSnapshot.docs[0].id;
        console.log(`✓ Next player (AVAILABLE): ${nextPlayer.name} (${nextPlayerId})`);
      } else {
        // Priority 2: Find first UNSOLD player (not yet auctioned again)
        const unsoldPlayersSnapshot = await getDb().collection('players')
          .where('matchId', '==', seasonId)
          .where('status', '==', 'UNSOLD')
          .limit(1)
          .get();

        if (!unsoldPlayersSnapshot.empty) {
          nextPlayer = serializeFirestoreDoc(unsoldPlayersSnapshot.docs[0]);
          nextPlayerId = unsoldPlayersSnapshot.docs[0].id;
          console.log(`✓ Next player (UNSOLD): ${nextPlayer.name} (${nextPlayerId})`);
        } else {
          console.log(`ℹ No more players available for auction`);
        }
      }

      // Update auction state with next player info
      if (nextPlayer) {
        auctionUpdates.nextPlayerId = nextPlayerId;
        auctionUpdates.nextPlayerName = nextPlayer.name;
        console.log(`✓ Set next player info: ${nextPlayerId}`);
      }
    } catch (e) {
      console.log(`⚠ Warning getting next player: ${e}`);
    }

    // Emit real-time event
    try {
      const eventData = {
        playerId: targetPlayerId,
        status: newStatus,
        sold: sold,
        finalBid: playerData.currentBid || 0,
        teamId: playerData.teamId,
        seasonId: seasonId
      };
      if (nextPlayer) {
        eventData.nextPlayerId = nextPlayerId;
        eventData.nextPlayerName = nextPlayer.name;
      }
      await emit_realtime_event('player_bidding_closed', eventData, seasonId);
      console.log(`✓ Emitted player_bidding_closed event`);
    } catch (e) {
      console.log(`⚠ Warning emitting realtime event: ${e}`);
    }

    // AUTO-START NEXT PLAYER: If player was SOLD (not UNSOLD) and there's a next player, automatically start bidding
    // Add a small delay to ensure frontend processes the sold event first
    if (sold && nextPlayer && nextPlayerId) {
      console.log(`🚀 AUTO-STARTING next player bidding: ${nextPlayer.name} (${nextPlayerId})`);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));  // 1 second delay

        // Call start_player_bidding for the next player
        await start_player_bidding({
          seasonId: seasonId,
          playerId: nextPlayerId,
          basePrice: nextPlayer.basePrice || 0
        });
        console.log(`✅ Auto-started bidding for next player: ${nextPlayer.name}`);
      } catch (e) {
        console.log(`⚠ Warning auto-starting next player: ${e}`);
        // Don't fail the entire operation if auto-start fails
      }
    } else if (!sold) {
      console.log(`ℹ Player marked UNSOLD - not auto-starting next player (manual trigger required)`);
    }

    console.log(`✅ Successfully closed bidding for player ${targetPlayerId} - ${newStatus}`);
    return [successResponse({
      playerId: targetPlayerId,
      status: newStatus,
      sold: sold,
      nextPlayerId: nextPlayer ? nextPlayerId : null,
      nextPlayerName: nextPlayer ? nextPlayer.name : null,
      autoStarted: sold && nextPlayer !== null
    }, `Player bidding closed - ${newStatus}`), 200];
  } catch (e) {
    const errorMsg = String(e);
    console.log(`❌ Unexpected error in close_player_bidding: ${errorMsg}`);
    return [errorResponse(`Failed to close player bidding: ${errorMsg}`), 400];
  }
}

async function mark_player_unsold(data) {
  /**Mark current player as unsold without closing bidding - adds to unsold list*/
  try {
    const seasonId = data.seasonId;

    console.log(`📋 Mark player unsold request: season=${seasonId}`);

    if (!seasonId) {
      return [errorResponse("Missing seasonId"), 400];
    }

    // Get current player from canonical doc
    let playerId = null;
    let playerName = null;
    try {
      const currentPlayerDoc = await getDb().collection('liveAuctions').doc(seasonId).collection('currentPlayer').doc('active').get();
      if (currentPlayerDoc.exists) {
        const cp = currentPlayerDoc.data() || {};
        const playerObj = cp.player || {};
        playerId = cp.playerId || playerObj.id;
        playerName = cp.playerName || playerObj.name || 'Unknown';
        console.log(`✓ Found player from canonical doc: ${playerId}`);
      } else {
        return [errorResponse("No player currently up for bidding"), 404];
      }
    } catch (e) {
      console.log(`❌ Failed to fetch canonical player doc: ${e}`);
      return [errorResponse(`Failed to fetch player: ${String(e)}`), 400];
    }

    // Get player doc
    let playerData;
    try {
      const playerDoc = await getDb().collection('players').doc(playerId).get();
      if (!playerDoc.exists) {
        return [errorResponse(`Player ${playerId} not found`), 404];
      }
      playerData = serializeFirestoreDoc(playerDoc);
    } catch (e) {
      console.log(`❌ Failed to fetch player: ${e}`);
      return [errorResponse(`Failed to fetch player: ${String(e)}`), 400];
    }

    // Increment unsold count
    const unsoldCount = (playerData.unsoldCount || 0) + 1;

    // Update player status
    try {
      await getDb().collection('players').doc(playerId).update({
        status: 'UNSOLD',
        unsoldCount: unsoldCount,
        updatedAt: new Date().toISOString()
      });
      console.log(`✓ Marked player ${playerId} as UNSOLD (count: ${unsoldCount})`);
    } catch (e) {
      console.log(`❌ Failed to update player: ${e}`);
      return [errorResponse(`Failed to update player: ${String(e)}`), 400];
    }

    // Update auction state - add to unsold players list (do NOT add to player queue yet)
    try {
      const auctionDoc = await getDb().collection('liveAuctions').doc(seasonId).get();
      const auctionState = auctionDoc.exists ? auctionDoc.data() : {};

      const unsoldPlayers = auctionState.unsoldPlayers || [];
      if (!unsoldPlayers.includes(playerId)) {
        unsoldPlayers.push(playerId);
      }

      // Do NOT add to playerQueue - unsold players come later after all AVAILABLE players

      await _set_live_auction_state(seasonId, {
        currentPlayerId: null,
        currentPlayerName: null,
        biddingActive: false,
        leadingTeamId: null,
        leadingTeamName: null,
        currentBid: 0,
        unsoldPlayers: unsoldPlayers
      });
      console.log(`✓ Updated auction state with unsold player (will re-auction later)`);
    } catch (e) {
      console.log(`⚠ Warning updating auction state: ${e}`);
    }

    // Clear canonical current player doc
    try {
      await _clear_current_player(seasonId);
      console.log(`✓ Cleared canonical current player doc`);
    } catch (e) {
      console.log(`⚠ Warning clearing current player: ${e}`);
    }

    // Emit player unsold event
    try {
      await _emit_named_event_doc(seasonId, 'playerUnsold', {
        playerId: playerId,
        playerName: playerName,
        unsoldCount: unsoldCount,
        seasonId: seasonId
      });
      console.log(`✓ Emitted playerUnsold event`);
    } catch (e) {
      console.log(`⚠ Warning emitting event: ${e}`);
    }

    console.log(`✅ Successfully marked player ${playerId} as UNSOLD`);
    return [successResponse({
      playerId: playerId,
      playerName: playerName,
      unsoldCount: unsoldCount
    }, "Player marked as unsold"), 200];
  } catch (e) {
    const errorMsg = String(e);
    console.log(`❌ Unexpected error in mark_player_unsold: ${errorMsg}`);
    return [errorResponse(`Failed to mark unsold: ${errorMsg}`), 400];
  }
}

async function get_next_player(data) {
  /**Get next available player for auction - prioritizes AVAILABLE players, then UNSOLD for re-auction*/
  try {
    const seasonId = data.seasonId;

    console.log(`📋 Get next player request: season=${seasonId}`);

    if (!seasonId) {
      return [errorResponse("Missing seasonId"), 400];
    }

    // PHASE 1: Try to find AVAILABLE or PENDING players (never auctioned yet)
    try {
      console.log(`🔍 PHASE 1: Searching for AVAILABLE/PENDING players in season ${seasonId}...`);
      
      // First try AVAILABLE status
      let availableSnap = await getDb()
        .collection('players')
        .where('matchId', '==', seasonId)
        .where('status', '==', 'AVAILABLE')
        .where('approvalStatus', '==', 'accepted')  // Only approved players
        .limit(1)
        .get();

      console.log(`📊 Found ${availableSnap.size} AVAILABLE players`);

      // If no AVAILABLE found, try PENDING status (players registered but not yet in auction)
      if (availableSnap.empty) {
        console.log(`🔍 No AVAILABLE players, checking PENDING status...`);
        availableSnap = await getDb()
          .collection('players')
          .where('matchId', '==', seasonId)
          .where('status', '==', 'PENDING')
          .where('approvalStatus', '==', 'accepted')  // Only approved players
          .limit(1)
          .get();
        console.log(`📊 Found ${availableSnap.size} PENDING players`);
      }

      if (!availableSnap.empty) {
        const nextPlayerDoc = availableSnap.docs[0];
        const nextPlayer = serializeFirestoreDoc(nextPlayerDoc);
        const playerId = nextPlayer.id;
        const playerName = nextPlayer.name || 'Unknown';
        const basePrice = nextPlayer.basePrice || 0;

        console.log(`✅ Found AVAILABLE player: ${playerName} (ID: ${playerId})`);

        // Automatically start bidding for this player
        const startResult = await start_player_bidding({
          seasonId: seasonId,
          playerId: playerId,
          basePrice: basePrice
        });

        return startResult;
      } else {
        console.log("⚠️ No AVAILABLE players found, moving to PHASE 2...");
      }
    } catch (e) {
      console.log(`❌ Error finding AVAILABLE players: ${e}`);
    }

    // PHASE 2: No AVAILABLE players - check for UNSOLD players for re-auction
    try {
      console.log(`🔍 PHASE 2: Searching for UNSOLD players in season ${seasonId}...`);
      const unsoldSnap = await getDb()
        .collection('players')
        .where('matchId', '==', seasonId)
        .where('status', '==', 'UNSOLD')
        .limit(1)
        .get();

      console.log(`📊 Found ${unsoldSnap.size} UNSOLD players`);

      if (!unsoldSnap.empty) {
        const nextPlayerDoc = unsoldSnap.docs[0];
        const nextPlayer = serializeFirestoreDoc(nextPlayerDoc);
        const playerId = nextPlayer.id;
        const playerName = nextPlayer.name || 'Unknown';
        const basePrice = nextPlayer.basePrice || 0;

        console.log(`✅ Found UNSOLD player for re-auction: ${playerName} (ID: ${playerId})`);

        // Reset to AVAILABLE for re-auction
        await getDb().collection('players').doc(playerId).update({
          status: 'AVAILABLE',
          updatedAt: new Date().toISOString()
        });

        // Automatically start bidding for this player
        const startResult = await start_player_bidding({
          seasonId: seasonId,
          playerId: playerId,
          basePrice: basePrice
        });

        return startResult;
      } else {
        console.log("⚠️ No UNSOLD players found, moving to PHASE 3...");
      }
    } catch (e) {
      console.log(`❌ Error finding UNSOLD players: ${e}`);
    }

    // PHASE 3: No players left - auction complete
    console.log(`✅ No more players available - auction complete`);
    return [successResponse({
      message: 'All players have been auctioned',
      auctionComplete: true
    }, "Auction complete"), 200];

  } catch (e) {
    const errorMsg = String(e);
    console.log(`❌ Unexpected error in get_next_player: ${errorMsg}`);
    return [errorResponse(`Failed to get next player: ${errorMsg}`), 400];
  }
}

async function switch_player(data) {
  /**Switch to a different player during live auction - current player returns to AVAILABLE*/
  try {
    const seasonId = data.seasonId;
    const newPlayerId = data.playerId;

    if (!seasonId || !newPlayerId) {
      return [errorResponse("Missing required fields: seasonId and playerId"), 400];
    }

    console.log(`🔄 Processing player switch to ${newPlayerId} in season ${seasonId}`);

    // Get current player ID from canonical doc
    let currentPlayerId = null;
    try {
      const currentPlayerDoc = await getDb()
        .collection('liveAuctions').doc(seasonId)
        .collection('currentPlayer').doc('active')
        .get();
      if (currentPlayerDoc.exists) {
        const cp = currentPlayerDoc.data() || {};
        const playerObj = cp.player || {};
        currentPlayerId = cp.playerId || playerObj.id;
        console.log(`✓ Found current player from canonical doc: ${currentPlayerId}`);
      }
    } catch (e) {
      console.log(`⚠ Failed to fetch canonical player doc: ${e}`);
    }

    if (!currentPlayerId) {
      // Fallback: find LIVE player
      try {
        const playersQuery = getDb().collection('players')
          .where('matchId', '==', seasonId)
          .where('status', '==', 'LIVE')
          .limit(1);
        const livePlayers = await playersQuery.get();
        if (livePlayers.empty) {
          const errorMsg = "No active player bidding found";
          console.log(`❌ ${errorMsg}`);
          return [errorResponse(errorMsg), 404];
        }
        currentPlayerId = livePlayers.docs[0].id;
        console.log(`✓ Found current player via query: ${currentPlayerId}`);
      } catch (e) {
        console.log(`❌ Failed to find current player: ${e}`);
        return [errorResponse(`Failed to find current player: ${String(e)}`), 400];
      }
    }

    if (currentPlayerId === newPlayerId) {
      const errorMsg = "Cannot switch to the same player";
      console.log(`⚠ ${errorMsg}`);
      return [errorResponse(errorMsg), 400];
    }

    // Get current player data
    const currentPlayerDoc = await getDb().collection('players').doc(currentPlayerId).get();
    if (!currentPlayerDoc.exists) {
      const errorMsg = `Current player ${currentPlayerId} not found`;
      console.log(`❌ ${errorMsg}`);
      return [errorResponse(errorMsg), 404];
    }

    const currentPlayerData = serializeFirestoreDoc(currentPlayerDoc);

    // Get new player data
    const newPlayerDoc = await getDb().collection('players').doc(newPlayerId).get();
    if (!newPlayerDoc.exists) {
      const errorMsg = `New player ${newPlayerId} not found`;
      console.log(`❌ ${errorMsg}`);
      return [errorResponse(errorMsg), 404];
    }

    const newPlayerData = serializeFirestoreDoc(newPlayerDoc);

    console.log(`✓ Switching from ${currentPlayerData.name} to ${newPlayerData.name}`);

    // Mark current player as AVAILABLE (preserve bid history)
    console.log(`📥 Marking current player ${currentPlayerId} as AVAILABLE`);
    await getDb().collection('players').doc(currentPlayerId).update({
      status: 'AVAILABLE',
      updatedAt: new Date().toISOString()
      // Keeps currentBid, leadingTeamId, leadingTeamName intact
    });

    // Mark new player as LIVE with their base price
    console.log(`🎯 Marking new player ${newPlayerId} as LIVE`);
    await getDb().collection('players').doc(newPlayerId).update({
      status: 'LIVE',
      currentBid: newPlayerData.basePrice || 0,
      leadingTeamId: null,
      leadingTeamName: null,
      updatedAt: new Date().toISOString()
    });

    // Update the canonical current player doc
    console.log(`📝 Updating canonical current player doc`);
    await getDb().collection('liveAuctions').doc(seasonId)
      .collection('currentPlayer').doc('active')
      .set({
        playerId: newPlayerId,
        player: {
          id: newPlayerId,
          name: newPlayerData.name || 'Unknown'
        },
        updatedAt: new Date().toISOString()
      });

    // Emit real-time event through Cloud Functions
    try {
      console.log(`📡 Emitting player_switched event`);
      // Store event in latestEvent document (like other events)
      const eventData = {
        type: 'player_switched',
        previousPlayerId: currentPlayerId,
        previousPlayerName: currentPlayerData.name || 'Unknown',
        newPlayerId: newPlayerId,
        newPlayerName: newPlayerData.name || 'Unknown',
        basePrice: newPlayerData.basePrice || 0,
        timestamp: new Date().toISOString()
      };

      await getDb().collection('liveAuctions').doc(seasonId)
        .collection('events').doc('latestEvent')
        .set(eventData);
      console.log(`✅ Player switched event emitted to latestEvent`);
    } catch (e) {
      console.log(`⚠ Warning emitting player switched event: ${e}`);
    }

    console.log(`✅ Successfully switched to player ${newPlayerId}`);
    return [successResponse({
      previousPlayerId: currentPlayerId,
      previousPlayerName: currentPlayerData.name || 'Unknown',
      newPlayerId: newPlayerId,
      newPlayerName: newPlayerData.name || 'Unknown',
      basePrice: newPlayerData.basePrice || 0
    }, "Player switched successfully"), 200];

  } catch (e) {
    const errorMsg = String(e);
    console.log(`❌ Unexpected error in switch_player: ${errorMsg}`);
    return [errorResponse(`Failed to switch player: ${errorMsg}`), 400];
  }
}

async function start_reauction_unsold(data) {
  /**Start re-auctioning unsold players*/
  try {
    const seasonId = data.seasonId;

    console.log(`📋 Start re-auction request: season=${seasonId}`);

    if (!seasonId) {
      return [errorResponse("Missing seasonId"), 400];
    }

    // Get auction state
    let auctionState;
    try {
      const auctionDoc = await getDb().collection('liveAuctions').doc(seasonId).get();
      if (!auctionDoc.exists) {
        return [errorResponse("Auction state not found"), 404];
      }
      auctionState = auctionDoc.data() || {};
    } catch (e) {
      console.log(`❌ Failed to fetch auction state: ${e}`);
      return [errorResponse(`Failed to fetch auction state: ${String(e)}`), 400];
    }

    const unsoldPlayers = auctionState.unsoldPlayers || [];

    if (!unsoldPlayers.length) {
      return [errorResponse("No unsold players to re-auction"), 400];
    }

    console.log(`✓ Found ${unsoldPlayers.length} unsold players to re-auction`);

    // Reset unsold players status to AVAILABLE for re-auction
    try {
      for (const playerId of unsoldPlayers) {
        await getDb().collection('players').doc(playerId).update({
          status: 'AVAILABLE',
          updatedAt: new Date().toISOString()
        });
      }
      console.log(`✓ Reset ${unsoldPlayers.length} players to AVAILABLE`);
    } catch (e) {
      console.log(`❌ Failed to reset player status: ${e}`);
      return [errorResponse(`Failed to reset player status: ${String(e)}`), 400];
    }

    // Update auction state with unsold players in queue
    try {
      await _set_live_auction_state(seasonId, {
        playerQueue: unsoldPlayers,
        unsoldPlayers: [],  // Clear the unsold list
        status: 'LIVE'
      });
      console.log(`✓ Updated auction state with re-auction queue`);
    } catch (e) {
      console.log(`❌ Failed to update auction state: ${e}`);
      return [errorResponse(`Failed to update auction state: ${String(e)}`), 400];
    }

    // Emit re-auction started event
    try {
      await emit_realtime_event('reAuctionStarted', {
        seasonId: seasonId,
        reAuctionPlayerCount: unsoldPlayers.length,
        playerIds: unsoldPlayers
      }, seasonId);
      console.log(`✓ Emitted reAuctionStarted event`);
    } catch (e) {
      console.log(`⚠ Warning emitting event: ${e}`);
    }

    console.log(`✅ Successfully started re-auction for ${unsoldPlayers.length} players`);
    return [successResponse({
      seasonId: seasonId,
      reAuctionPlayerCount: unsoldPlayers.length,
      playerIds: unsoldPlayers
    }, "Re-auction started for unsold players"), 200];

  } catch (e) {
    const errorMsg = String(e);
    console.log(`❌ Unexpected error in start_reauction_unsold: ${errorMsg}`);
    return [errorResponse(`Failed to start re-auction: ${errorMsg}`), 400];
  }
}

async function reset_live_auction(data) {
  /**Admin/Auctioneer utility: clear live auction state and remove currentPlayer/active without touching player records.*/
  try {
    const seasonId = data.seasonId;
    if (!seasonId) {
      return [errorResponse("Missing seasonId"), 400];
    }

    // Normalize any lingering LIVE players back to AVAILABLE.
    try {
      const livePlayersSnap = await getDb().collection('players')
        .where('matchId', '==', seasonId)
        .where('status', '==', 'LIVE')
        .get();
      for (const pdoc of livePlayersSnap.docs) {
        const pdata = pdoc.data() || {};
        const basePrice = pdata.basePrice || 0;
        await getDb().collection('players').doc(pdoc.id).update({
          status: 'AVAILABLE',
          currentBid: basePrice,
          leadingTeamId: null,
          leadingTeamName: null,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.log(`✗ Reset normalization warning: ${e}`);
    }

    await _set_live_auction_state(seasonId, {
      currentPlayerId: null,
      currentPlayerName: null,
      currentBid: 0,
      leadingTeamId: null,
      leadingTeamName: null,
      biddingActive: false
    });
    await _clear_current_player(seasonId);

    await emit_realtime_event('auction_reset', {
      seasonId: seasonId,
      reason: data.reason || 'manual_reset'
    }, seasonId);

    return [successResponse({ seasonId: seasonId }, 'Live auction reset'), 200];
  } catch (e) {
    return [errorResponse(`Failed to reset live auction: ${String(e)}`), 400];
  }
}

async function get_matches(data) {
  /**Get all match documents (excluding admin user documents)*/
  const snapshot = await getDb().collection('matches').get();
  // Filter out admin user documents - keep only actual match documents
  const matchDocs = snapshot.docs.filter(doc => {
    const d = doc.data();
    return d.role !== 'ADMIN';
  });

  const matches = serializeFirestoreDocs(matchDocs);

  if (data && (data.debug === '1' || data.debug === 1 || data.debug === true)) {
    console.log(
      'MATCHES API RESPONSE →',
      JSON.stringify(
        matches.slice(0, 3).map((m) => ({ id: m.id, name: m.name, venue: m.venue })),
        null,
        2
      )
    );
  }

  return [successResponse(matches), 200];
}

async function get_match(matchId, data = {}) {
  /**Get match details and include current live auction state*/
  try {
    const doc = await getDb().collection('matches').doc(matchId).get();
    if (!doc.exists) {
      return [errorResponse("Not found", 404), 404];
    }

    let matchData = serializeFirestoreDoc(doc);

    // Handle admin documents - transform to proper match format
    if (matchData.role === 'ADMIN') {
      // Admin docs store season data - transform to match format
      if (!matchData.name && matchData.seasonName) {
        matchData.name = matchData.seasonName;
      }
      if (!matchData.status) {
        matchData.status = 'SETUP';
      }
      if (matchData.sportType && !matchData.sport) {
        matchData.sport = matchData.sportType;
      }
      // ❌ WARN: Config should NOT be missing for a match
      if (!matchData.config) {
        console.warn(`⚠️ MISSING CONFIG: Match ${matchId} has no config. This should not happen. Match must be properly configured by admin.`);
        // Return match as-is WITHOUT creating defaults
      }
      // Initialize empty arrays if missing
      if (!matchData.players) matchData.players = [];
      if (!matchData.teams) matchData.teams = [];
      if (!matchData.history) matchData.history = [];
    }

    // Also fetch the live auction state if it exists
    try {
      const liveAuctionDoc = await getDb().collection('liveAuctions').doc(matchId).get();
      if (liveAuctionDoc.exists) {
        const liveState = liveAuctionDoc.data() || {};
        // Merge live auction state into match data
        matchData.status = liveState.status || matchData.status || 'READY';
        matchData.currentPlayerId = liveState.currentPlayerId;
        matchData.currentPlayerName = liveState.currentPlayerName;
        matchData.currentBid = liveState.currentBid || 0;
        matchData.leadingTeamId = liveState.leadingTeamId;
        matchData.leadingTeamName = liveState.leadingTeamName;
        matchData.biddingActive = liveState.biddingActive || false;
        matchData.remainingSeconds = liveState.remainingSeconds || 0;

        // If there's a current player, fetch fresh data from the player doc
        const currentPlayerId = liveState.currentPlayerId;
        if (currentPlayerId) {
          try {
            const playerDoc = await getDb().collection('players').doc(currentPlayerId).get();
            if (playerDoc.exists) {
              const playerData = playerDoc.data() || {};
              matchData.currentBid = playerData.currentBid || matchData.currentBid || 0;
              matchData.leadingTeamId = playerData.leadingTeamId || matchData.leadingTeamId;
              matchData.leadingTeamName = playerData.leadingTeamName || matchData.leadingTeamName;
              console.log(`✓ Refreshed currentBid from player doc: ₹${matchData.currentBid}`);
            }
          } catch (e) {
            console.log(`⚠ Warning fetching current player for refresh: ${e}`);
          }
        }

        console.log(`✓ Merged live auction state into match data`);
      }
    } catch (e) {
      console.log(`⚠ Warning fetching live auction state: ${e}`);
    }

    if (data && (data.debug === '1' || data.debug === 1 || data.debug === true)) {
      console.log('MATCH API RESPONSE →', matchData);
    }

    return [successResponse(matchData), 200];
  } catch (e) {
    return [errorResponse(String(e), 500), 500];
  }
}

async function create_match(data) {
  /**Create a new match with comprehensive field tracking and validation*/
  try {
    console.log("=".repeat(80));
    console.log("📝 CREATE MATCH HANDLER STARTED");
    console.log("=".repeat(80));

    console.log(`📦 Received ${Object.keys(data).length} fields in request`);

    // Generate or use provided match ID
    const matchId = data.id || generate_id('match');
    console.log(`\n🆔 Match ID: ${matchId}`);

    // Prepare document - include ALL provided fields
    const matchDoc = {
      id: matchId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Copy all provided fields
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'id') {
        matchDoc[key] = value;
      }
    }

    // Ensure critical fields have defaults
    if (!matchDoc.status) matchDoc.status = 'SETUP';
    if (!matchDoc.players) matchDoc.players = [];
    if (!matchDoc.teams) matchDoc.teams = [];
    if (!matchDoc.history) matchDoc.history = [];

    // Create standardized config object
    if (!matchDoc.config || typeof matchDoc.config !== 'object') {
      matchDoc.config = {};
    }

    const config = matchDoc.config;

    // ❌ REQUIRED: All auction configuration must be explicitly configured
    const baseBudget = config.baseTeamBudget || data.baseBudgetPerTeam || config.totalBudget;
    const bidIncrement = config.bidIncrement || config.minBidIncrement;
    const maxTeams = config.maxTeams || data.maxTeams;
    const maxPlayers = config.maxSquad || data.maxPlayersPerTeam;
    
    if (!baseBudget || baseBudget <= 0) {
      return [errorResponse('baseBudgetPerTeam/baseTeamBudget is required and must be > 0', 400), 400];
    }
    if (!bidIncrement || bidIncrement <= 0) {
      return [errorResponse('bidIncrement must be configured and > 0', 400), 400];
    }
    if (!maxTeams || maxTeams < 2) {
      return [errorResponse('maxTeams is required and must be >= 2', 400), 400];
    }
    if (!maxPlayers || maxPlayers < 1) {
      return [errorResponse('maxPlayersPerTeam/maxSquad is required and must be >= 1', 400), 400];
    }

    // VALIDATION: Match Creation Parameters
    if (baseBudget <= 0) {
      return [errorResponse("Purse per team must be greater than 0", 400), 400];
    }
    if (maxPlayers < 1) {
      return [errorResponse("Players per team must be at least 1", 400), 400];
    }
    if (maxTeams < 2) {
      return [errorResponse("Number of teams must be at least 2", 400), 400];
    }

    // COMPUTE MATCH SETTINGS (Purse Intelligence)
    const avgPlayerValue = Math.round(baseBudget / maxPlayers);
    const maxBasePrice = Math.round(avgPlayerValue * 0.40);
    const recommendedMinBase = Math.round(avgPlayerValue * 0.25);

    console.log(`\n💰 PURSE INTELLIGENCE COMPUTED:`);
    console.log(`   pursePerTeam: ₹${baseBudget.toLocaleString()}`);
    console.log(`   maxPlayersPerTeam: ${maxPlayers}`);
    console.log(`   avgPlayerValue: ₹${avgPlayerValue.toLocaleString()}`);
    console.log(`   maxBasePrice: ₹${maxBasePrice.toLocaleString()}`);

    // Update config with standardized fields (NO MIN SQUAD - only MAX)
    Object.assign(config, {
      baseTeamBudget: baseBudget,
      totalBudget: baseBudget,
      bidIncrement: bidIncrement,
      minBidIncrement: bidIncrement,
      maxTeams: maxTeams,
      maxSquad: maxPlayers
    });

    // CREATE MATCH SETTINGS (Immutable after first team registration)
    const matchSettings = {
      pursePerTeam: baseBudget,
      maxPlayersPerTeam: maxPlayers,
      numberOfTeams: maxTeams,
      avgPlayerValue: avgPlayerValue,
      maxBasePrice: maxBasePrice,
      recommendedMinBase: recommendedMinBase,
      isLocked: false,
      createdAt: new Date().toISOString()
    };

    matchDoc.config = config;
    matchDoc.matchSettings = matchSettings;

    // Also set top-level fields for easy access
    matchDoc.baseBudgetPerTeam = baseBudget;
    matchDoc.maxTeams = maxTeams;
    matchDoc.maxPlayersPerTeam = maxPlayers;

    // 🔁 SYNC place, venue, and venueLocation - keep them always in sync
    const finalVenue = matchDoc.place || matchDoc.venue || matchDoc.venueLocation || "";
    matchDoc.place = finalVenue;
    matchDoc.venue = finalVenue;
    matchDoc.venueLocation = finalVenue;

    console.log(`\n💾 Writing to Firestore: matches/${matchId}`);
    await getDb().collection('matches').doc(matchId).set(matchDoc);

    console.log(`\n✅ Match created successfully!`);
    console.log(`   ID: ${matchId}`);
    console.log("=".repeat(80));

    return [successResponse(matchDoc, "Match created successfully"), 201];

  } catch (e) {
    console.log(`\n❌ ERROR creating match: ${String(e)}`);
    console.log("=".repeat(80));
    return [errorResponse(`Failed to create match: ${String(e)}`, 500), 500];
  }
}

async function update_match(matchId, data) {
  /**Update an existing match with field tracking*/
  try {
    console.log("=".repeat(80));
    console.log(`📝 UPDATE MATCH HANDLER STARTED`);
    console.log(`   Match ID: ${matchId}`);
    console.log("=".repeat(80));

    console.log(`\n📦 Received ${Object.keys(data).length} fields to update: ${Object.keys(data).join(', ')}`);

    const docRef = getDb().collection('matches').doc(matchId);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log(`❌ Match not found: ${matchId}`);
      return [errorResponse("Match not found", 404), 404];
    }

    console.log(`\n✅ Match exists`);

    // Add timestamp
    data.updatedAt = new Date().toISOString();

    // 🔁 SYNC place, venue, and venueLocation - keep them always in sync
    if (data.place !== undefined || data.venue !== undefined || data.venueLocation !== undefined) {
      const currentMatch = serializeFirestoreDoc(doc);
      const finalVenue = data.place !== undefined ? data.place : (data.venue !== undefined ? data.venue : (data.venueLocation !== undefined ? data.venueLocation : (currentMatch.place || currentMatch.venue || currentMatch.venueLocation || "")));
      data.place = finalVenue;
      data.venue = finalVenue;
      data.venueLocation = finalVenue;
    }

    // Update document (only updates provided fields, doesn't overwrite)
    console.log(`\n✍️  Updating ${Object.keys(data).length} fields...`);
    await docRef.update(data);

    // Get updated document
    const updatedDoc = await docRef.get();
    const matchData = serializeFirestoreDoc(updatedDoc);

    console.log(`✅ Document updated successfully!`);

    // Emit realtime event
    console.log(`📤 Emitting realtime event for match: ${matchId}`);
    await emit_realtime_event('auctionState', matchData, matchId);

    console.log("=".repeat(80));
    return [successResponse(matchData, "Match updated successfully"), 200];

  } catch (e) {
    console.log(`\n❌ ERROR updating match: ${String(e)}`);
    console.log("=".repeat(80));
    return [errorResponse(`Failed to update match: ${String(e)}`, 500), 500];
  }
}

async function delete_match(matchId) {
  await getDb().collection('matches').doc(matchId).delete();
  return [successResponse(null, "Deleted"), 200];
}

async function get_match_config(matchId) {
  /**Get match configuration*/
  try {
    console.log(`📖 GET MATCH CONFIG: ${matchId}`);
    const doc = await getDb().collection('matches').doc(matchId).get();

    if (!doc.exists) {
      return [errorResponse("Match not found", 404), 404];
    }

    const matchData = serializeFirestoreDoc(doc);

    // Extract config - check multiple possible locations
    const config = matchData.config || {};

    // Build standardized config response - ALL values REQUIRED from Firestore
    const squadSize = config.squadSize || {};
    
    const baseTeamBudget = config.baseTeamBudget || matchData.baseBudgetPerTeam || config.totalBudget;
    const bidIncrement = config.bidIncrement || config.minBidIncrement;
    const maxTeams = config.maxTeams || matchData.maxTeams;
    const maxSquad = config.maxSquad || (typeof squadSize === 'object' ? squadSize.max : null) || matchData.maxPlayersPerTeam;
    
    if (!baseTeamBudget || baseTeamBudget <= 0) {
      return [errorResponse('Match config ERROR: baseTeamBudget not found or invalid', 500), 500];
    }
    if (!bidIncrement || bidIncrement <= 0) {
      return [errorResponse('Match config ERROR: bidIncrement not found or invalid', 500), 500];
    }
    if (!maxTeams || maxTeams < 2) {
      return [errorResponse('Match config ERROR: maxTeams not found or < 2', 500), 500];
    }
    if (!maxSquad || maxSquad < 1) {
      return [errorResponse('Match config ERROR: maxSquad not found or < 1', 500), 500];
    }
    
    const standardizedConfig = {
      baseTeamBudget: baseTeamBudget,
      bidIncrement: bidIncrement,
      maxTeams: maxTeams,
      maxSquad: maxSquad,
    };

    console.log(`✅ Config retrieved: ${JSON.stringify(standardizedConfig)}`);
    return [successResponse(standardizedConfig), 200];

  } catch (e) {
    console.log(`❌ ERROR getting match config: ${String(e)}`);
    return [errorResponse(`Failed to get config: ${String(e)}`, 500), 500];
  }
}

async function update_match_config(matchId, data) {
  /**Update match configuration with validation*/
  try {
    console.log("=".repeat(80));
    console.log(`📝 UPDATE MATCH CONFIG: ${matchId}`);
    console.log(`   Config data: ${JSON.stringify(data)}`);

    const docRef = getDb().collection('matches').doc(matchId);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log(`❌ Match not found: ${matchId}`);
      return [errorResponse("Match not found", 404), 404];
    }

    const matchData = doc.data();

    // CHECK MATCH SETTINGS LOCK
    const matchSettings = matchData.matchSettings || {};
    if (matchSettings.isLocked) {
      const purseRelatedFields = ['baseTeamBudget', 'minSquad', 'maxSquad', 'maxTeams'];
      const attemptingPurseUpdate = purseRelatedFields.some(field => field in data);

      if (attemptingPurseUpdate) {
        const lockedAt = matchSettings.lockedAt || 'unknown';
        return [errorResponse(
          `Cannot modify purse-related settings after team registration has started. ` +
          `Match settings were locked at ${lockedAt}. ` +
          `These values must remain consistent for all teams.`,
          403
        ), 403];
      }
    }

    // Validate config values
    const baseTeamBudget = data.baseTeamBudget;
    const bidIncrement = data.bidIncrement;
    const maxTeamsVal = data.maxTeams;
    const minSquad = data.minSquad;
    const maxSquad = data.maxSquad;

    // Validation rules
    const errors = [];
    if (baseTeamBudget !== undefined && baseTeamBudget < 100000) {
      errors.push("Base team budget must be at least ₹100,000");
    }
    if (bidIncrement !== undefined && bidIncrement < 10000) {
      errors.push("Bid increment must be at least ₹10,000");
    }
    if (maxTeamsVal !== undefined && maxTeamsVal < 2) {
      errors.push("Max teams must be at least 2");
    }
    if (maxSquad !== undefined && maxSquad < 1) {
      errors.push("Max squad size must be at least 1");
    }

    if (errors.length > 0) {
      console.log(`❌ Validation errors: ${errors.join(', ')}`);
      return [errorResponse(errors.join("; "), 400), 400];
    }

    // Get or create config object
    const currentConfig = matchData.config || {};

    // Update config fields
    const updatedConfig = { ...currentConfig };

    if (baseTeamBudget !== undefined) {
      updatedConfig.baseTeamBudget = baseTeamBudget;
      updatedConfig.totalBudget = baseTeamBudget;
    }
    if (bidIncrement !== undefined) {
      updatedConfig.bidIncrement = bidIncrement;
      updatedConfig.minBidIncrement = bidIncrement;
    }
    if (maxTeamsVal !== undefined) {
      updatedConfig.maxTeams = maxTeamsVal;
    }
    if (maxSquad !== undefined) {
      updatedConfig.maxSquad = maxSquad;
    }

    // Update top-level fields for easy access
    const updateData = {
      config: updatedConfig,
      updatedAt: new Date().toISOString()
    };

    // Also update legacy top-level fields
    if (baseTeamBudget !== undefined) {
      updateData.baseBudgetPerTeam = baseTeamBudget;
    }
    if (maxTeamsVal !== undefined) {
      updateData.maxTeams = maxTeamsVal;
    }
    if (maxSquad !== undefined) {
      updateData.maxPlayersPerTeam = maxSquad;
    }

    // 🔁 SYNC place, venue, and venueLocation - keep them always in sync
    if (data.place !== undefined || data.venue !== undefined || data.venueLocation !== undefined) {
      const finalVenue = data.place !== undefined ? data.place : (data.venue !== undefined ? data.venue : (data.venueLocation !== undefined ? data.venueLocation : (matchData.place || matchData.venue || matchData.venueLocation || "")));
      updateData.place = finalVenue;
      updateData.venue = finalVenue;
      updateData.venueLocation = finalVenue;
    }

    // Update the match document
    await docRef.update(updateData);

    // Get updated document
    const updatedDoc = await docRef.get();
    const updatedMatch = serializeFirestoreDoc(updatedDoc);

    console.log(`✅ Config updated successfully`);

    // Emit realtime event for config change
    await emit_realtime_event('configUpdated', {
      matchId: matchId,
      config: updatedConfig
    }, matchId);

    console.log("=".repeat(80));
    return [successResponse({
      match: updatedMatch,
      config: updatedConfig
    }, "Configuration updated successfully"), 200];

  } catch (e) {
    console.log(`❌ ERROR updating match config: ${String(e)}`);
    console.log("=".repeat(80));
    return [errorResponse(`Failed to update config: ${String(e)}`, 500), 500];
  }
}

async function validate_match_config(matchId) {
  /**Validate current match state against configuration*/
  try {
    console.log(`🔍 VALIDATE MATCH CONFIG: ${matchId}`);

    const doc = await getDb().collection('matches').doc(matchId).get();
    if (!doc.exists) {
      return [errorResponse("Match not found", 404), 404];
    }

    const matchData = serializeFirestoreDoc(doc);
    const config = matchData.config || {};

    // Get config values - ALL REQUIRED from Firestore
    const maxTeams = config.maxTeams || matchData.maxTeams;
    const maxSquad = config.maxSquad || (config.squadSize || {}).max || matchData.maxPlayersPerTeam;
    
    if (!maxTeams || maxTeams < 2) {
      return [errorResponse('Match configuration unfinished: maxTeams not configured', 400), 400];
    }
    if (!maxSquad || maxSquad < 1) {
      return [errorResponse('Match configuration unfinished: maxSquad not configured', 400), 400];
    }

    // Count registered teams
    const teamsSnapshot = await getDb().collection('teams').where('seasonId', '==', matchId).get();
    const teamsList = teamsSnapshot.docs;
    const registeredTeams = teamsList.length;

    // Validate squad sizes
    const squadViolations = [];
    for (const team of teamsList) {
      const teamData = team.data() || {};
      const teamSquad = teamData.players || [];
      const squadSize = teamSquad.length;

      if (squadSize < minSquad) {
        squadViolations.push({
          teamId: team.id,
          teamName: teamData.name || 'Unknown',
          squadSize: squadSize,
          issue: `Below minimum (${minSquad})`
        });
      } else if (squadSize > maxSquad) {
        squadViolations.push({
          teamId: team.id,
          teamName: teamData.name || 'Unknown',
          squadSize: squadSize,
          issue: `Exceeds maximum (${maxSquad})`
        });
      }
    }

    // Build validation result
    const warnings = [];
    const errors = [];

    if (registeredTeams > maxTeams) {
      errors.push(`Teams exceeded: ${registeredTeams}/${maxTeams} teams registered`);
    }

    if (squadViolations.length > 0) {
      for (const violation of squadViolations) {
        warnings.push(`${violation.teamName}: ${violation.squadSize} players - ${violation.issue}`);
      }
    }

    const validationResult = {
      valid: errors.length === 0,
      registeredTeams: registeredTeams,
      maxTeams: maxTeams,
      teamsExceeded: registeredTeams > maxTeams,
      squadViolations: squadViolations,
      warnings: warnings,
      errors: errors,
      config: {
        maxTeams: maxTeams,
        minSquad: minSquad,
        maxSquad: maxSquad
      }
    };

    console.log(`✅ Validation complete: ${JSON.stringify(validationResult)}`);
    return [successResponse(validationResult), 200];

  } catch (e) {
    console.log(`❌ ERROR validating match config: ${String(e)}`);
    return [errorResponse(`Failed to validate: ${String(e)}`, 500), 500];
  }
}

async function get_pre_auction_validation(matchId) {
  /**
   * Get pre-auction validation data for a match:
   * Validates against match configuration (maxTeams, maxPlayersPerTeam)
   * Only checks APPROVED teams and players
   * 
   * Returns validation status:
   * - canStart: boolean (true only if exact/sufficient counts)
   * - hasError: boolean (blocking error)
   * - hasWarning: boolean (warning but can proceed)
   * - warningMessage: string or null
   * - stats: counts and configuration
   */
  try {
    // Get match document as source of truth
    const matchDoc = await getDb().collection('matches').doc(matchId).get();
    if (!matchDoc.exists) {
      return [errorResponse("Match not found", 404), 404];
    }

    const matchData = matchDoc.data() || {};
    
    // REQUIRED: Get match configuration from match document - NO DEFAULTS
    const maxTeams = matchData.maxTeams || (matchData.config && matchData.config.maxTeams);
    const maxPlayersPerTeam = matchData.maxPlayersPerTeam || (matchData.config && matchData.config.maxSquad);
    
    if (!maxTeams || maxTeams < 2) {
      return [errorResponse('Match configuration unfinished: maxTeams not configured', 400), 400];
    }
    if (!maxPlayersPerTeam || maxPlayersPerTeam < 1) {
      return [errorResponse('Match configuration unfinished: maxPlayersPerTeam not configured', 400), 400];
    }
    
    const requiredPlayers = maxTeams * maxPlayersPerTeam;

    console.log(`[Validation] Match ${matchId} config: maxTeams=${maxTeams}, maxPlayersPerTeam=${maxPlayersPerTeam}, requiredPlayers=${requiredPlayers}`);

    // CRITICAL: Only count APPROVED teams from Firestore
    const teamsSnapshot = await getDb().collection('teams')
      .where('matchId', '==', matchId)
      .where('approvalStatus', '==', 'accepted')
      .get();
    const approvedTeams = teamsSnapshot.docs.map(doc => serializeFirestoreDoc(doc));
    const approvedTeamsCount = approvedTeams.length;

    // Get breakdown of all teams for stats
    const allTeamsSnapshot = await getDb().collection('teams').where('matchId', '==', matchId).get();
    const allTeams = allTeamsSnapshot.docs.map(doc => serializeFirestoreDoc(doc));
    const pendingTeams = allTeams.filter(t => (t.approvalStatus || 'pending') === 'pending');
    const declinedTeams = allTeams.filter(t => t.approvalStatus === 'declined');

    // CRITICAL: Only count APPROVED players from Firestore
    const playersSnapshot = await getDb().collection('players')
      .where('matchId', '==', matchId)
      .where('approvalStatus', '==', 'accepted')
      .get();
    const approvedPlayers = playersSnapshot.docs.map(doc => serializeFirestoreDoc(doc));
    const approvedPlayersCount = approvedPlayers.length;

    // Get breakdown of all players for stats
    const allPlayersSnapshot = await getDb().collection('players').where('matchId', '==', matchId).get();
    const allPlayers = allPlayersSnapshot.docs.map(doc => serializeFirestoreDoc(doc));
    const pendingPlayers = allPlayers.filter(p => (p.approvalStatus || 'pending') === 'pending');
    const declinedPlayers = allPlayers.filter(p => p.approvalStatus === 'declined');

    // ============ VALIDATION LOGIC (Following user requirements) ============
    let canStart = false;
    let hasError = false;
    let hasWarning = false;
    let warningMessage = null;

    // CASE 1: Less than required teams
    if (approvedTeamsCount < maxTeams) {
      hasWarning = true;
      warningMessage = `Less accepted teams (${approvedTeamsCount}) than required (${maxTeams}). `;
    }

    // CASE 2: More than allowed teams
    if (approvedTeamsCount > maxTeams) {
      hasWarning = true;
      const msg = `More accepted teams (${approvedTeamsCount}) than allowed (${maxTeams}). `;
      warningMessage = warningMessage ? warningMessage + msg : msg;
    }

    // Check players
    if (approvedPlayersCount < requiredPlayers) {
      hasWarning = true;
      const msg = `Less accepted players (${approvedPlayersCount}) than required (${requiredPlayers}). `;
      warningMessage = warningMessage ? warningMessage + msg : msg;
    }

    // CASE 3: No warning, validation passed
    if (!hasWarning) {
      warningMessage = null;
      canStart = true;
    }

    console.log(`[Validation] Match ${matchId}: teams=${approvedTeamsCount}/${maxTeams}, players=${approvedPlayersCount}/${requiredPlayers}, hasWarning=${hasWarning}, canStart=${canStart}`);

    const validationResult = {
      canStart: canStart,
      hasError: hasError,
      hasWarning: hasWarning,
      errorMessage: null,
      warningMessage: warningMessage,
      stats: {
        maxTeams: maxTeams,
        maxPlayersPerTeam: maxPlayersPerTeam,
        requiredPlayers: requiredPlayers,
        acceptedTeams: approvedTeamsCount,
        pendingTeams: pendingTeams.length,
        declinedTeams: declinedTeams.length,
        totalTeams: allTeams.length,
        acceptedPlayers: approvedPlayersCount,
        pendingPlayers: pendingPlayers.length,
        declinedPlayers: declinedPlayers.length,
        totalPlayers: allPlayers.length
      },
      acceptedTeamsList: approvedTeams.map(t => ({ id: t.id, name: t.name || 'Unknown' })),
      acceptedPlayersList: approvedPlayers.map(p => ({ id: p.id, name: p.name || 'Unknown' }))
    };

    return [successResponse(validationResult), 200];
  } catch (e) {
    console.log(`✗ Error in pre-auction validation: ${e}`);
    return [errorResponse(String(e), 500), 500];
  }
}

async function get_bids(data) {
  /**Get bids, optionally filtered by seasonId and/or playerId*/
  const seasonId = data.seasonId;
  const playerId = data.playerId;

  let query = getDb().collection('bids');

  if (seasonId) {
    query = query.where('seasonId', '==', seasonId);
  }
  if (playerId) {
    query = query.where('playerId', '==', playerId);
  }

  const snapshot = await query.get();
  let bidsList = serializeFirestoreDocs(snapshot.docs);

  // Sort by timestamp descending (most recent first)
  bidsList.sort((a, b) => {
    const aTime = a.timestamp || '';
    const bTime = b.timestamp || '';
    return bTime.localeCompare(aTime);
  });

  return [successResponse(bidsList), 200];
}

async function create_bid(data) {
  /**Create a new bid and update auction state*/
  try {
    const seasonId = data.seasonId;
    const teamId = data.teamId;
    const amount = data.amount || 0;

    console.log(`📋 Create bid request: season=${seasonId}, team=${teamId}, amount=${amount}`);

    if (!seasonId || !teamId || !amount) {
      return [errorResponse("Missing required fields: seasonId, teamId, amount", 400), 400];
    }

    // Get team to validate budget
    let teamDoc;
    try {
      teamDoc = await getDb().collection('teams').doc(teamId).get();
      if (!teamDoc.exists) {
        const errorMsg = `Team ${teamId} not found`;
        console.log(`❌ ${errorMsg}`);
        return [errorResponse(errorMsg, 404), 404];
      }
    } catch (e) {
      console.log(`❌ Failed to fetch team: ${e}`);
      return [errorResponse(`Failed to fetch team: ${String(e)}`, 400), 400];
    }

    const teamData = serializeFirestoreDoc(teamDoc);

    // Validate budget (prefer remainingBudget if present)
    let remainingBudget = teamData.remainingBudget;
    if (remainingBudget === undefined || remainingBudget === null) {
      remainingBudget = teamData.budget || 0;
    }

    if (amount > remainingBudget) {
      const budgetMsg = `Insufficient budget. Team has ₹${(remainingBudget / 100000).toFixed(1)}L remaining`;
      console.log(`⚠ Bid rejected: ${budgetMsg}`);
      return [errorResponse(budgetMsg, 400), 400];
    }

    // Get current player from canonical Firestore doc (source of truth)
    let playerId = null;
    try {
      const currentPlayerDoc = await getDb()
        .collection('liveAuctions').doc(seasonId)
        .collection('currentPlayer').doc('active')
        .get();
      if (currentPlayerDoc.exists) {
        const cp = currentPlayerDoc.data() || {};
        const playerObj = cp.player || {};
        playerId = cp.playerId || playerObj.id;
        console.log(`✓ Found player from canonical doc: ${playerId}`);
      }
    } catch (e) {
      console.log(`⚠ Failed to fetch canonical player doc: ${e}`);
    }

    // Fallback: find any LIVE player if currentPlayer doc missing
    let playerDoc;
    if (!playerId) {
      try {
        const playersQuery = getDb().collection('players')
          .where('matchId', '==', seasonId)
          .where('status', '==', 'LIVE')
          .limit(1);
        const livePlayers = await playersQuery.get();
        if (livePlayers.empty) {
          const errorMsg = "No active player bidding";
          console.log(`❌ ${errorMsg}`);
          return [errorResponse(errorMsg, 404), 404];
        }
        playerDoc = livePlayers.docs[0];
        playerId = playerDoc.id;
        console.log(`✓ Found LIVE player via fallback query: ${playerId}`);
      } catch (e) {
        console.log(`❌ Failed to find active player: ${e}`);
        return [errorResponse(`Failed to find active player: ${String(e)}`, 400), 400];
      }
    } else {
      try {
        playerDoc = await getDb().collection('players').doc(playerId).get();
      } catch (e) {
        console.log(`❌ Failed to fetch player: ${e}`);
        return [errorResponse(`Failed to fetch player: ${String(e)}`, 400), 400];
      }
    }

    if (!playerDoc.exists) {
      const errorMsg = "Active player not found";
      console.log(`❌ ${errorMsg}`);
      return [errorResponse(errorMsg, 404), 404];
    }

    const playerData = serializeFirestoreDoc(playerDoc);

    // Validate bid amount is higher than current bid
    const currentBid = playerData.currentBid || playerData.basePrice || 0;
    if (amount <= currentBid) {
      const bidMsg = `Bid must be higher than current bid of ₹${(currentBid / 100000).toFixed(1)}L`;
      console.log(`⚠ Bid rejected: ${bidMsg}`);
      return [errorResponse(bidMsg, 400), 400];
    }

    // Create bid record
    let bidData;
    try {
      const bidId = generate_id('bid');
      bidData = {
        id: bidId,
        seasonId: seasonId,
        teamId: teamId,
        teamName: teamData.name || 'Unknown Team',
        playerId: playerData.id || playerDoc.id,
        playerName: playerData.name || 'Unknown Player',
        amount: amount,
        timestamp: new Date().toISOString(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await getDb().collection('bids').doc(bidId).set(bidData);
      console.log(`✓ Created bid record: ${bidId}`);
    } catch (e) {
      console.log(`❌ Failed to create bid record: ${e}`);
      return [errorResponse(`Failed to create bid: ${String(e)}`, 400), 400];
    }

    // Update player with new bid
    const targetPlayerId = playerData.id || playerDoc.id;
    try {
      await getDb().collection('players').doc(targetPlayerId).update({
        currentBid: amount,
        leadingTeamId: teamId,
        leadingTeamName: teamData.name || 'Unknown Team',
        updatedAt: new Date().toISOString()
      });
      console.log(`✓ Updated player bid data`);
    } catch (e) {
      console.log(`❌ Failed to update player bid: ${e}`);
      return [errorResponse(`Failed to update player bid: ${String(e)}`, 400), 400];
    }

    // Update canonical live auction state docs so all dashboards converge
    try {
      await _set_live_auction_state(seasonId, {
        status: 'LIVE',
        currentPlayerId: targetPlayerId,
        currentPlayerName: playerData.name,
        currentBid: amount,
        leadingTeamId: teamId,
        leadingTeamName: teamData.name,
        biddingActive: true
      });
      console.log(`✓ Updated live auction state`);
    } catch (e) {
      console.log(`⚠ Warning updating auction state: ${e}`);
    }

    try {
      // Keep currentPlayer/active doc fresh for any consumers
      const refreshedPlayerDoc = await getDb().collection('players').doc(targetPlayerId).get();
      const refreshedPlayer = serializeFirestoreDoc(refreshedPlayerDoc);
      await _set_current_player(seasonId, refreshedPlayer, refreshedPlayer.basePrice || 0);
      console.log(`✓ Refreshed canonical current player doc`);
    } catch (e) {
      console.log(`⚠ Failed to refresh currentPlayer doc after bid: ${e}`);
    }

    // Emit real-time event
    try {
      await emit_realtime_event('bid_placed', {
        bidId: bidData.id,
        playerId: targetPlayerId,
        playerName: playerData.name,
        teamId: teamId,
        teamName: teamData.name,
        amount: amount,
        seasonId: seasonId
      }, seasonId);
      console.log(`✓ Emitted bid_placed event`);
    } catch (e) {
      console.log(`⚠ Warning emitting event: ${e}`);
    }

    console.log(`✅ Successfully placed bid: ${amount} by ${teamData.name}`);
    return [successResponse(bidData, "Bid placed successfully"), 201];
  } catch (e) {
    const errorMsg = String(e);
    console.log(`❌ Unexpected error in create_bid: ${errorMsg}`);
    return [errorResponse(`Failed to place bid: ${errorMsg}`, 400), 400];
  }
}

async function start_auction(data) {
  const matchId = data.matchId;
  if (!matchId) {
    return [errorResponse("matchId required", 400), 400];
  }

  const docRef = getDb().collection('matches').doc(matchId);
  await docRef.update({
    status: 'ONGOING',
    startedAt: new Date().toISOString()
  });

  const doc = await docRef.get();
  const matchData = serializeFirestoreDoc(doc);
  await emit_realtime_event('auctionState', matchData, matchId);
  return [successResponse(matchData), 200];
}

async function place_bid(data) {
  return create_bid(data);
}

async function pause_auction(data) {
  const matchId = data.matchId;
  await getDb().collection('matches').doc(matchId).update({ status: 'PAUSED' });
  await emit_realtime_event('auctionPaused', data, matchId);
  return [successResponse(data), 200];
}

async function resume_auction(data) {
  const matchId = data.matchId;
  await getDb().collection('matches').doc(matchId).update({ status: 'ONGOING' });
  await emit_realtime_event('auctionResumed', data, matchId);
  return [successResponse(data), 200];
}

async function end_auction(data) {
  const matchId = data.matchId;
  await getDb().collection('matches').doc(matchId).update({
    status: 'ENDED',
    endedAt: new Date().toISOString()
  });
  await emit_realtime_event('auctionEnded', data, matchId);
  return [successResponse(data), 200];
}

async function update_match_status(matchId, data) {
  /**Update match status (SETUP, ONGOING, or COMPLETED) - Admin/Auctioneer only*/
  try {
    const newStatus = data.status;
    if (!newStatus || !['SETUP', 'ONGOING', 'COMPLETED'].includes(newStatus)) {
      return [errorResponse("Invalid status. Must be SETUP, ONGOING, or COMPLETED", 400), 400];
    }

    const docRef = getDb().collection('matches').doc(matchId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return [errorResponse(`Match ${matchId} not found`, 404), 404];
    }

    // Update the status
    await docRef.update({
      status: newStatus,
      updatedAt: new Date().toISOString(),
      statusUpdatedBy: data.updatedBy || 'system',
      statusUpdatedAt: new Date().toISOString()
    });

    console.log(`✅ Match ${matchId} status updated to ${newStatus}`);
    await emit_realtime_event('matchStatusUpdated', { status: newStatus }, matchId);
    return [successResponse({ status: newStatus }, `Match status updated to ${newStatus}`), 200];
  } catch (e) {
    console.log(`❌ Error updating match status: ${e}`);
    return [errorResponse(`Failed to update match status: ${String(e)}`, 500), 500];
  }
}

async function get_history(data) {
  /**Get auction history, optionally filtered by seasonId*/
  const seasonId = data.seasonId;
  let query = getDb().collection('history');
  if (seasonId) {
    query = query.where('seasonId', '==', seasonId);
  }
  const snapshot = await query.get();
  return [successResponse(serializeFirestoreDocs(snapshot.docs)), 200];
}

// ====================
// HELPER: Sync team player IDs
// ====================
async function sync_team_player_ids(teamId) {
  /**Synchronize team's playerIds from players marked as SOLD to that team*/
  try {
    console.log(`Syncing playerIds for team: ${teamId}`);
    const playersQuery = getDb().collection('players').where('soldTo', '==', teamId);
    const allPlayers = await playersQuery.get();

    console.log(`  Found ${allPlayers.size} players with soldTo=${teamId}`);

    const soldPlayers = allPlayers.docs.filter(p => {
      const pData = p.data() || {};
      return pData.status === 'SOLD';
    });
    const soldPlayerIds = soldPlayers.map(p => p.id);

    console.log(`  Filtered to ${soldPlayerIds.length} SOLD players: ${soldPlayerIds}`);

    await getDb().collection('teams').doc(teamId).update({
      playerIds: soldPlayerIds
    });
    console.log(`  Updated team ${teamId}: playerIds = ${soldPlayerIds}`);

    return soldPlayerIds;
  } catch (e) {
    console.log(`Error syncing team playerIds for ${teamId}: ${e}`);
    return [];
  }
}

async function debug_sync_all_teams(_data) {
  /**DEBUG: Force sync all teams with their sold players*/
  try {
    const teamsSnapshot = await getDb().collection('teams').get();
    const allTeams = serializeFirestoreDocs(teamsSnapshot.docs);

    const results = [];
    for (const team of allTeams) {
      const teamId = team.id;
      const soldPlayerIds = await sync_team_player_ids(teamId);
      results.push({
        teamId: teamId,
        teamName: team.name,
        playerCount: soldPlayerIds.length,
        playerIds: soldPlayerIds
      });
    }

    return [successResponse(results, "Synced all teams"), 200];
  } catch (e) {
    console.log(`Error in debug sync: ${e}`);
    return [errorResponse(`Debug sync failed: ${String(e)}`, 400), 400];
  }
}

async function debug_all_players(_data) {
  /**DEBUG: Get all SOLD players with their team assignments*/
  try {
    const playersQuery = getDb().collection('players').where('status', '==', 'SOLD');
    const playersSnapshot = await playersQuery.get();

    const playerList = [];
    for (const p of playersSnapshot.docs) {
      const pData = p.data() || {};
      playerList.push({
        playerId: p.id,
        playerName: pData.name,
        status: pData.status,
        soldTo: pData.soldTo,
        soldAmount: pData.soldAmount
      });
    }

    return [successResponse(playerList, `Found ${playerList.length} sold players`), 200];
  } catch (e) {
    return [errorResponse(`Failed to get players: ${String(e)}`, 400), 400];
  }
}

async function debug_seed_test_users() {
  /**Create test users for development/testing*/
  try {
    // Create test admin user
    const adminUser = {
      id: 'admin_test_001',
      email: 'admin@test.com',
      password: 'admin123',  // In production, never store plain passwords!
      name: 'Test Admin',
      role: 'ADMIN',
      organizationName: 'HypeHammer Admin',
      adminApprovalStatus: 'APPROVED',
      createdAt: new Date().toISOString()
    };
    await getDb().collection('users').doc('admin_test_001').set(adminUser);
    console.log('✓ Created test admin user');

    // Create test auctioneer user with APPROVED status
    const auctioneerUser = {
      id: 'auctioneer_test_001',
      email: 'auctioneer@test.com',
      password: 'auctioneer123',
      name: 'Test Auctioneer',
      role: 'AUCTIONEER',
      approvalStatus: 'APPROVED',
      approvedAt: new Date().toISOString(),
      auctioneerLicense: 'TEST123',
      experience: '5 years',
      createdAt: new Date().toISOString()
    };
    await getDb().collection('auctioneers').doc('auctioneer_test_001').set(auctioneerUser);
    console.log('✓ Created test auctioneer user (APPROVED)');

    // Create test team rep
    const teamRepUser = {
      id: 'team_rep_test_001',
      email: 'teamrep@test.com',
      password: 'teamrep123',
      name: 'Test Team Rep',
      role: 'TEAM_REP',
      teamName: 'Test Team',
      teamApprovalStatus: 'APPROVED',
      createdAt: new Date().toISOString()
    };
    await getDb().collection('teams').doc('team_rep_test_001').set(teamRepUser);
    console.log('✓ Created test team rep user');

    // Create test player
    const playerUser = {
      id: 'player_test_001',
      email: 'player@test.com',
      password: 'player123',
      name: 'Test Player',
      role: 'PLAYER',
      playerRole: 'Batsman',
      playerApprovalStatus: 'APPROVED',
      createdAt: new Date().toISOString()
    };
    await getDb().collection('players').doc('player_test_001').set(playerUser);
    console.log('✓ Created test player user');

    return [successResponse({
      admin: adminUser,
      auctioneer: auctioneerUser,
      teamRep: teamRepUser,
      player: playerUser
    }, "Test users created successfully"), 200];
  } catch (e) {
    console.log(`Error seeding test users: ${e}`);
    return [errorResponse(`Failed to seed users: ${String(e)}`, 500), 500];
  }
}

async function migrate_sold_players_data(data) {
  /**
   * MIGRATION: Populate missing soldTo, soldAmount, soldAt for already-sold players
   * Copies from leadingTeamId, currentBid, updatedAt
   */
  try {
    const seasonId = data.seasonId;
    if (!seasonId) {
      return [errorResponse("Missing seasonId parameter", 400), 400];
    }

    // Find all SOLD players
    const playersQuery = getDb().collection('players')
      .where('matchId', '==', seasonId)
      .where('status', '==', 'SOLD');
    const playersSnapshot = await playersQuery.get();

    let updatedCount = 0;
    const updatesMade = [];

    for (const p of playersSnapshot.docs) {
      const pData = p.data() || {};
      const playerId = p.id;
      const playerName = pData.name || 'Unknown';

      // Check if this player is missing soldTo/soldAmount/soldAt
      const hasSoldTo = pData.soldTo && pData.soldTo;
      const hasSoldAmount = pData.soldAmount && pData.soldAmount;
      const hasSoldAt = pData.soldAt && pData.soldAt;

      // If already complete, skip
      if (hasSoldTo && hasSoldAmount && hasSoldAt) {
        console.log(`✓ ${playerName} already has complete sold data`);
        continue;
      }

      // Get source data
      const leadingTeamId = pData.leadingTeamId;
      const currentBid = pData.currentBid;
      const updatedAt = pData.updatedAt;

      if (!leadingTeamId || !currentBid) {
        console.log(`⚠ ${playerName} missing leadingTeamId or currentBid, skipping`);
        continue;
      }

      // Prepare update
      const updateData = {};
      if (!hasSoldTo && leadingTeamId) {
        updateData.soldTo = leadingTeamId;
      }
      if (!hasSoldAmount && currentBid) {
        updateData.soldAmount = currentBid;
      }
      if (!hasSoldAt && updatedAt) {
        updateData.soldAt = updatedAt;
      }

      // Apply update
      if (Object.keys(updateData).length > 0) {
        await getDb().collection('players').doc(playerId).update(updateData);
        updatedCount++;
        updatesMade.push({
          playerId: playerId,
          playerName: playerName,
          updates: updateData
        });
        console.log(`✓ Migrated ${playerName}: ${Object.keys(updateData).join(', ')}`);
      }
    }

    return [successResponse({
      updated_count: updatedCount,
      updates_made: updatesMade
    }, `Migrated ${updatedCount} players`), 200];
  } catch (e) {
    console.log(`Error in migrate_sold_players_data: ${e}`);
    return [errorResponse(`Migration failed: ${String(e)}`, 500), 500];
  }
}

// ====================
// AUCTIONS CRUD HANDLERS
// ====================

async function get_auction_state(seasonId) {
  try {
    const doc = await getDb().collection('matches').doc(seasonId).get();
    if (!doc.exists) {
      return [errorResponse("Auction not found", 404), 404];
    }
    return [successResponse(serializeFirestoreDoc(doc)), 200];
  } catch (e) {
    return [errorResponse(String(e)), 400];
  }
}

async function get_auctions(data) {
  /**Get all auctions with optional filtering*/
  try {
    let query = getDb().collection('auctions');

    // Filter by matchId if provided
    if (data.matchId) {
      query = query.where('matchId', '==', data.matchId);
    }

    const snapshot = await query.get();
    const auctions = serializeFirestoreDocs(snapshot.docs);

    return [successResponse(auctions, "Auctions retrieved successfully"), 200];
  } catch (e) {
    return [errorResponse(`Failed to retrieve auctions: ${String(e)}`, 500), 500];
  }
}

async function get_auction(auctionId) {
  /**Get single auction by ID*/
  try {
    const doc = await getDb().collection('auctions').doc(auctionId).get();
    if (!doc.exists) {
      return [errorResponse("Auction not found", 404), 404];
    }
    return [successResponse(serializeFirestoreDoc(doc)), 200];
  } catch (e) {
    return [errorResponse(String(e)), 400];
  }
}

async function create_auction(data) {
  /**Create new auction*/
  try {
    const auctionId = data.id || generate_id('auction');
    data.id = auctionId;
    data.createdAt = new Date().toISOString();
    data.status = data.status || 'PENDING';

    await getDb().collection('auctions').doc(auctionId).set(data);
    return [successResponse(data), 201];
  } catch (e) {
    return [errorResponse(String(e)), 400];
  }
}

async function update_auction(auctionId, data) {
  /**Update auction*/
  try {
    const docRef = getDb().collection('auctions').doc(auctionId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return [errorResponse("Auction not found", 404), 404];
    }

    data.updatedAt = new Date().toISOString();
    await docRef.update(data);

    const updatedDoc = await docRef.get();
    return [successResponse(serializeFirestoreDoc(updatedDoc)), 200];
  } catch (e) {
    return [errorResponse(String(e)), 400];
  }
}

async function delete_auction(auctionId) {
  /**Delete auction*/
  try {
    await getDb().collection('auctions').doc(auctionId).delete();
    return [successResponse(null, "Deleted"), 200];
  } catch (e) {
    return [errorResponse(String(e)), 400];
  }
}

async function get_sports(_data) {
  /**Get all sports data aggregated from Firestore (matches collection only)*/
  try {
    const sportsData = [];

    // Get all matches with their associated players and teams
    const matchesSnapshot = await getDb().collection('matches').get();

    for (const matchDoc of matchesSnapshot.docs) {
      const matchData = serializeFirestoreDoc(matchDoc);

      // Skip admin documents - only fetch from matches collection
      if (matchData.role === 'ADMIN') {
        console.log(`⏭️  Skipping admin document: ${matchDoc.id}`);
        continue;
      }

      // Skip if doesn't look like a match (no id or name)
      if (!matchData.id || !matchData.name) {
        console.log(`⏭️  Skipping non-match document: ${matchDoc.id}`);
        continue;
      }

      // Get players for this match
      const playersSnapshot = await getDb().collection('players').where('matchId', '==', matchDoc.id).get();
      const players = serializeFirestoreDocs(playersSnapshot.docs);

      // Get teams for this match
      const teamsSnapshot = await getDb().collection('teams').where('matchId', '==', matchDoc.id).get();
      const teams = serializeFirestoreDocs(teamsSnapshot.docs);

      // Get bid history for this match
      const bidsSnapshot = await getDb().collection('bids').where('matchId', '==', matchDoc.id).get();
      const history = serializeFirestoreDocs(bidsSnapshot.docs);

      // Add players, teams, and history to match data
      matchData.players = players;
      matchData.teams = teams;
      matchData.history = history;

      // Group by sport
      const sportType = matchData.sport || 'CUSTOM';

      // Find or create sport entry
      let sportEntry = sportsData.find(s => s.sportType === sportType);
      if (!sportEntry) {
        sportEntry = {
          sportType: sportType,
          matches: []
        };
        sportsData.push(sportEntry);
      }

      sportEntry.matches.push(matchData);
    }

    return [successResponse(sportsData, "Sports data retrieved successfully"), 200];
  } catch (e) {
    return [errorResponse(`Failed to retrieve sports data: ${String(e)}`, 400), 400];
  }
}

async function save_sports(data) {
  /**Save all sports data to Firestore*/
  try {
    const sportsList = Array.isArray(data) ? data : [];

    // Process each sport's matches, players, and teams
    for (const sportData of sportsList) {
      const sportType = sportData.sportType || 'CUSTOM';

      for (const match of (sportData.matches || [])) {
        const matchId = match.id;

        // Save match (exclude nested arrays and prevent duplicate fields)
        const matchToSave = {};
        for (const [k, v] of Object.entries(match)) {
          if (!['players', 'teams', 'history'].includes(k)) {
            matchToSave[k] = v;
          }
        }
        matchToSave.sport = sportType;
        matchToSave.updatedAt = new Date().toISOString();

        await getDb().collection('matches').doc(matchId).set(matchToSave, { merge: true });

        // Save players
        for (const player of (match.players || [])) {
          const playerId = player.id;
          const playerToSave = {
            ...player,
            matchId: matchId,
            updatedAt: new Date().toISOString()
          };
          await getDb().collection('players').doc(playerId).set(playerToSave, { merge: true });
        }

        // Save teams
        for (const team of (match.teams || [])) {
          const teamId = team.id;
          const teamToSave = {
            ...team,
            matchId: matchId,
            updatedAt: new Date().toISOString()
          };
          await getDb().collection('teams').doc(teamId).set(teamToSave, { merge: true });
        }
      }
    }

    return [successResponse({ saved: true }, "Sports data saved successfully"), 200];
  } catch (e) {
    return [errorResponse(`Failed to save sports data: ${String(e)}`, 400), 400];
  }
}

// ====================
// FILE UPLOAD CONSTANTS & HELPERS
// ====================
const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const ALLOWED_PDF_EXTENSIONS = new Set(['pdf']);
const ALLOWED_VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv']);
const MAX_FILE_SIZE = 50 * 1024 * 1024;  // 50MB

function validate_file(file, fileType = 'image') {
  /**Validate file size and extension*/
  let allowedExtensions;
  if (fileType === 'image') {
    allowedExtensions = ALLOWED_IMAGE_EXTENSIONS;
  } else if (fileType === 'pdf') {
    allowedExtensions = ALLOWED_PDF_EXTENSIONS;
  } else if (fileType === 'video') {
    allowedExtensions = ALLOWED_VIDEO_EXTENSIONS;
  } else {
    allowedExtensions = ALLOWED_IMAGE_EXTENSIONS;
  }

  // Check file size (if available)
  const contentLength = file.size || file.buffer?.length || 0;
  if (contentLength && contentLength > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(1)}MB limit`);
  }

  // Secure filename
  const originalName = file.originalname || file.name || 'unknown';
  const filename = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const parts = filename.split('.');
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';

  if (!allowedExtensions.has(ext)) {
    throw new Error(`File type .${ext} not allowed. Allowed: ${[...allowedExtensions].join(', ')}`);
  }

  return [filename, ext];
}

async function upload_file_to_storage(file, folder, fileType = 'image', matchName = null) {
  /**
   * Upload file to Firebase Storage and return download URL
   * 
   * Args:
   *   file: Multer/busboy file object with buffer
   *   folder: Storage folder (e.g., 'Players', 'Teams', 'Documents')
   *   fileType: 'image' or 'pdf' or 'video'
   *   matchName: Optional match name to use as root folder (e.g., 'WPL' -> 'WPL/Players/')
   * 
   * Returns:
   *   Download URL of the uploaded file
   */
  try {
    // Validate file
    const [filename, ext] = validate_file(file, fileType);

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const uniqueId = uuidv4().replace(/-/g, "").slice(0, 8);
    const uniqueFilename = `${timestamp}_${uniqueId}.${ext}`;

    // Build storage path with match name if provided
    let storagePath;
    if (matchName) {
      // Sanitize match name for use as folder name
      const safeMatchName = matchName.replace(/[\s/\\]/g, '_');
      storagePath = `${safeMatchName}/${folder}/${uniqueFilename}`;
    } else {
      storagePath = `${folder}/${uniqueFilename}`;
    }

    // Get storage bucket
    const bucket = getStorageBucket();
    const blob = bucket.file(storagePath);

    // Upload file
    console.log(`📤 Uploading file: ${storagePath}`);
    const fileBuffer = file.buffer || (typeof file.read === 'function' ? file.read() : null);
    if (!fileBuffer) {
      throw new Error('No file buffer available');
    }

    await blob.save(fileBuffer, {
      contentType: file.mimetype || 'application/octet-stream'
    });

    // Make blob publicly readable for getting download URL
    await blob.makePublic();

    const downloadUrl = blob.publicUrl();
    console.log(`✅ File uploaded successfully: ${downloadUrl}`);

    return downloadUrl;
  } catch (e) {
    if (e.message && e.message.includes('File')) {
      throw new Error(`File validation error: ${e.message}`);
    }
    console.log(`❌ File upload error: ${e}`);
    throw new Error(`Failed to upload file: ${String(e)}`);
  }
}

async function handle_file_upload(req) {
  /**Handle file upload with busboy multipart parser and Firebase Storage*/
  return new Promise((resolve, reject) => {
    try {
      console.log(`🔄 handle_file_upload started for ${req.url}`);
      console.log(`   Headers: ${JSON.stringify({...req.headers, authorization: '[REDACTED]'})}`);
      
      const bb = busboy({ headers: req.headers });
      const bucket = getStorageBucket();
      
      // Get match name from query params for match-based folder structure
      const matchName = req.query.matchName || req.query.matchId || req.query.seasonName;
      console.log(`   Match name: ${matchName}`);
      
      let fileProcessed = false;
      const uploadPromises = [];

      bb.on("file", (fieldname, file, info) => {
        try {
          console.log(`📁 File event fired: field=${fieldname}, filename=${info.filename}`);
          const { filename, mimeType } = info;
          
          // Build storage path with match name if provided
          let filePath;
          if (matchName) {
            const safeMatchName = String(matchName).replace(/[^a-zA-Z0-9_-]/g, '_');
            filePath = `${safeMatchName}/uploads/${Date.now()}-${filename}`;
          } else {
            filePath = `uploads/${Date.now()}-${filename}`;
          }
          
          const firebaseFile = bucket.file(filePath);
          console.log(`📤 Uploading file to: ${filePath}`);

          // Create promise for this file upload
          const uploadPromise = new Promise((res, rej) => {
            const writeStream = firebaseFile.createWriteStream({
              metadata: { contentType: mimeType }
            });

            // Handle stream events
            writeStream.on("finish", async () => {
              try {
                console.log(`✅ File stream finished: ${filePath}`);
                await firebaseFile.makePublic();
                const fileUrl = firebaseFile.publicUrl();
                console.log(`✅ File made public: ${fileUrl}`);
                
                fileProcessed = true;
                res({
                  fileUrl: fileUrl,
                  filePath: filePath,
                  contentType: mimeType,
                  filename: filename
                });
              } catch (err) {
                console.error(`❌ Error making file public or returning data:`, err);
                rej(err);
              }
            });

            writeStream.on("error", (err) => {
              console.error(`❌ Write stream error:`, err);
              rej(err);
            });

            // Pipe file to write stream
            file.on("error", (err) => {
              console.error(`❌ File stream error:`, err);
              rej(err);
            });

            file.pipe(writeStream);
          });

          uploadPromises.push(uploadPromise);
        } catch (err) {
          console.error(`❌ Error in file handler:`, err);
          reject(err);
        }
      });

      bb.on("field", (fieldname, val) => {
        // Ignore other form fields
        console.log(`📝 Form field: ${fieldname} = ${val?.substring(0, 50) || ''}`);
      });

      bb.on("finish", async () => {
        try {
          console.log(`📋 Busboy finished. uploadPromises.length = ${uploadPromises.length}`);
          
          if (uploadPromises.length === 0) {
            console.error(`❌ No files received`);
            return reject(new Error("No file received"));
          }

          // Wait for all file uploads to complete
          const results = await Promise.all(uploadPromises);
          const fileMeta = results[0]; // Return first file
          
          console.log(`✅ File upload completed:`, fileMeta);
          resolve(fileMeta);
        } catch (err) {
          console.error(`❌ Error waiting for uploads:`, err);
          reject(err);
        }
      });

      bb.on("error", (err) => {
        console.error(`❌ Busboy error:`, err);
        reject(err);
      });

      // Start parsing the request
      console.log(`🔄 Starting busboy parser... req.readable=${req.readable}`);
      req.pipe(bb);
    } catch (err) {
      console.error(`❌ Error in handle_file_upload:`, err);
      reject(err);
    }
  });
}

async function get_state(_data) {
  /**Get current application state*/
  try {
    const doc = await getDb().collection('appState').doc('current').get();

    if (doc.exists) {
      const state = serializeFirestoreDoc(doc);
      return [successResponse(state, "App state retrieved successfully"), 200];
    } else {
      // Return default state
      const defaultState = {
        currentSport: null,
        currentAuctionId: null,
        currentMatchId: null
      };
      return [successResponse(defaultState, "Default app state"), 200];
    }
  } catch (e) {
    return [errorResponse(`Failed to retrieve app state: ${String(e)}`, 400), 400];
  }
}

async function save_state(data) {
  /**Update application state*/
  try {
    const stateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    await getDb().collection('appState').doc('current').set(stateData, { merge: true });

    return [successResponse(stateData, "App state updated successfully"), 200];
  } catch (e) {
    return [errorResponse(`Failed to update app state: ${String(e)}`, 400), 400];
  }
}

// ====================
// BACKUP & RESTORE CONSTANTS & HELPERS
// ====================
const BACKUP_SCHEMA_VERSION = "2.0.0";  // Match-scoped backup format
const MAX_BACKUPS_TO_KEEP = 10;

async function _check_backup_in_progress(matchId) {
  /**Check if a backup is currently in progress for this match*/
  try {
    const snapshot = await getDb().collection('backups')
      .where('matchId', '==', matchId)
      .where('status', '==', 'in-progress')
      .limit(1)
      .get();
    return !snapshot.empty;
  } catch (e) {
    return false;
  }
}

async function _check_live_auction(matchId) {
  /**Check if auction is currently live (blocks restore)*/
  try {
    const doc = await getDb().collection('liveAuctions').doc(matchId).get();
    if (doc.exists) {
      const data = doc.data() || {};
      return data.status === 'LIVE';
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function _get_match_teams(matchId) {
  /**Get teams from match subcollection or global collection*/
  try {
    // Try subcollection first
    let snapshot = await getDb().collection('matches').doc(matchId).collection('teams').get();
    if (!snapshot.empty) {
      return serializeFirestoreDocs(snapshot.docs);
    }

    // Fallback to global collection filtered by matchId
    snapshot = await getDb().collection('teams').where('matchId', '==', matchId).get();
    return serializeFirestoreDocs(snapshot.docs);
  } catch (e) {
    console.log(`Error getting match teams: ${e}`);
    return [];
  }
}

async function _get_match_players(matchId) {
  /**Get players from match subcollection or global collection*/
  try {
    // Try subcollection first
    let snapshot = await getDb().collection('matches').doc(matchId).collection('players').get();
    if (!snapshot.empty) {
      return serializeFirestoreDocs(snapshot.docs);
    }

    // Fallback to global collection filtered by matchId
    snapshot = await getDb().collection('players').where('matchId', '==', matchId).get();
    return serializeFirestoreDocs(snapshot.docs);
  } catch (e) {
    console.log(`Error getting match players: ${e}`);
    return [];
  }
}

async function _get_match_bids(matchId) {
  /**Get bids from match subcollection or global collection*/
  try {
    // Try subcollection first
    let snapshot = await getDb().collection('matches').doc(matchId).collection('bids').get();
    if (!snapshot.empty) {
      return serializeFirestoreDocs(snapshot.docs);
    }

    // Fallback to global collection filtered by matchId
    snapshot = await getDb().collection('bids').where('matchId', '==', matchId).get();
    return serializeFirestoreDocs(snapshot.docs);
  } catch (e) {
    console.log(`Error getting match bids: ${e}`);
    return [];
  }
}

function _create_teams_csv(teams) {
  /**Create clean CSV for teams with specific columns*/
  if (!teams || teams.length === 0) return "";

  const fieldnames = ['teamId', 'teamName', 'shortName', 'totalPurse', 'remainingPurse', 'playersBought', 'slotsLeft', 'maxPlayers', 'minPlayers', 'status'];
  const rows = [fieldnames.join(',')];

  for (const team of teams) {
    const players = team.players;
    const playerCount = Array.isArray(players) ? players.length : (team.playersBought || 0);
    const row = [
      team.id || team.teamId || '',
      team.name || team.teamName || '',
      team.shortName || '',
      team.budget || team.totalPurse || 0,
      team.remainingBudget || team.remainingPurse || 0,
      playerCount,
      team.slotsLeft || ((team.maxPlayers || 0) - playerCount),
      team.maxPlayers || 0,
      team.minPlayers || 0,
      team.status || 'ACTIVE'
    ];
    rows.push(row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  }

  return rows.join('\n');
}

function _create_players_csv(players) {
  /**Create clean CSV for players with specific columns*/
  if (!players || players.length === 0) return "";

  const fieldnames = ['playerId', 'name', 'role', 'basePrice', 'soldPrice', 'soldToTeamId', 'soldToTeamName', 'status', 'category', 'age', 'battingStyle', 'bowlingStyle'];
  const rows = [fieldnames.join(',')];

  for (const player of players) {
    const row = [
      player.id || player.playerId || '',
      player.name || '',
      player.role || player.position || '',
      player.basePrice || 0,
      player.soldPrice || player.finalPrice || 0,
      player.soldTo || player.teamId || '',
      player.soldToTeamName || '',
      player.status || 'PENDING',
      player.category || '',
      player.age || '',
      player.battingStyle || '',
      player.bowlingStyle || ''
    ];
    rows.push(row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  }

  return rows.join('\n');
}

function _create_bids_csv(bids) {
  /**Create clean CSV for bids with specific columns*/
  if (!bids || bids.length === 0) return "";

  const fieldnames = ['bidId', 'playerId', 'playerName', 'teamId', 'teamName', 'bidAmount', 'timestamp', 'isWinning'];
  const rows = [fieldnames.join(',')];

  for (const bid of bids) {
    const row = [
      bid.id || bid.bidId || '',
      bid.playerId || '',
      bid.playerName || '',
      bid.teamId || '',
      bid.teamName || '',
      bid.amount || bid.bidAmount || 0,
      bid.timestamp || bid.createdAt || '',
      bid.isWinning || false
    ];
    rows.push(row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  }

  return rows.join('\n');
}

function _parse_csv_to_dicts(csvContent) {
  /**Parse CSV string content back to list of dicts*/
  if (!csvContent || !csvContent.trim()) return [];

  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.replace(/^"|"$/g, ''));

    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx] || '';
    });
    results.push(obj);
  }

  return results;
}

async function _cleanup_old_backups(matchId) {
  /**Remove old backups keeping only MAX_BACKUPS_TO_KEEP*/
  try {
    // Get completed backups
    const snapshot = await getDb().collection('backups')
      .where('matchId', '==', matchId)
      .where('status', '==', 'completed')
      .get();

    // Sort by createdAt in JS
    const backups = snapshot.docs.map(doc => ({ doc, data: doc.data() }));
    backups.sort((a, b) => (b.data.createdAt || '').localeCompare(a.data.createdAt || ''));

    if (backups.length > MAX_BACKUPS_TO_KEEP) {
      const backupsToDelete = backups.slice(MAX_BACKUPS_TO_KEEP);
      const bucket = getStorageBucket();

      for (const { doc, data } of backupsToDelete) {
        const backupId = doc.id;

        // Delete from storage
        try {
          const fileName = data.fileName;
          if (fileName) {
            const blob = bucket.file(`backups/${matchId}/${fileName}`);
            const [exists] = await blob.exists();
            if (exists) {
              await blob.delete();
            }
          }
        } catch (e) {
          console.log(`Error deleting backup file: ${e}`);
        }

        // Delete from Firestore
        await getDb().collection('backups').doc(backupId).delete();
        console.log(`🗑️ Deleted old backup: ${backupId}`);
      }
    }
  } catch (e) {
    console.log(`Error cleaning up old backups: ${e}`);
  }
}

async function get_backups(data) {
  /**Get all backups for a match*/
  try {
    const matchId = data.matchId;
    if (!matchId) {
      return [errorResponse("matchId is required"), 400];
    }

    // Get docs without order_by (no composite index required)
    const snapshot = await getDb().collection('backups').where('matchId', '==', matchId).get();
    let backups = serializeFirestoreDocs(snapshot.docs);

    // Sort by createdAt in JS
    backups.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return [successResponse(backups, `Found ${backups.length} backups`), 200];
  } catch (e) {
    console.log(`Error in get_backups: ${e}`);
    return [errorResponse(`Failed to get backups: ${String(e)}`), 500];
  }
}

async function get_backup(backupId) {
  /**Get a specific backup by ID*/
  try {
    const doc = await getDb().collection('backups').doc(backupId).get();
    if (!doc.exists) {
      return [errorResponse("Backup not found", 404), 404];
    }

    return [successResponse(serializeFirestoreDoc(doc)), 200];
  } catch (e) {
    return [errorResponse(`Failed to get backup: ${String(e)}`), 500];
  }
}

async function create_backup(data) {
  /**Create a match-scoped backup - only exports data related to this match*/
  const AdmZip = require('adm-zip');

  try {
    const matchId = data.matchId;
    const backupType = data.type || 'full';  // 'full', 'quick', 'auto'
    const createdBy = data.createdBy || 'system';
    const createdByEmail = data.createdByEmail || '';
    const createdByRole = data.createdByRole || 'ADMIN';

    if (!matchId) {
      return [errorResponse("matchId is required"), 400];
    }

    // Check if backup is already in progress
    if (await _check_backup_in_progress(matchId)) {
      return [errorResponse("A backup is already in progress for this match"), 409];
    }

    // Get match details
    const matchDoc = await getDb().collection('matches').doc(matchId).get();
    if (!matchDoc.exists) {
      return [errorResponse("Match not found", 404), 404];
    }

    const matchData = serializeFirestoreDoc(matchDoc);
    const matchName = matchData.name || matchId;

    // Create backup ID and metadata (match Python)
    const backupId = `backup_${uuidv4().replace(/-/g, "").slice(0, 12)}`;
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().replace(/[-:]/g, '').replace('T', '_').substring(0, 15);
    const safeMatchName = matchName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeMatchName}_Backup_${dateStr}.zip`;

    // Create initial backup record (in-progress)
    const backupMetadata = {
      id: backupId,
      matchId: matchId,
      matchName: matchName,
      fileName: fileName,
      type: backupType,
      size: 0,
      createdBy: createdBy,
      createdByEmail: createdByEmail,
      createdByRole: createdByRole,
      createdAt: timestamp.toISOString(),
      status: 'in-progress',
      schemaVersion: BACKUP_SCHEMA_VERSION,
      playersCount: 0,
      teamsCount: 0,
      bidsCount: 0
    };

    await getDb().collection('backups').doc(backupId).set(backupMetadata);
    console.log(`📦 Starting match-scoped ${backupType} backup for: ${matchName}`);

    try {
      // Collect MATCH-SCOPED data only
      const teams = await _get_match_teams(matchId);
      const players = await _get_match_players(matchId);
      const bids = await _get_match_bids(matchId);

      // Get live auction state for this match
      const liveAuctionDoc = await getDb().collection('liveAuctions').doc(matchId).get();
      const liveAuctionState = liveAuctionDoc.exists ? serializeFirestoreDoc(liveAuctionDoc) : null;

      // Build match.json with match metadata only
      const matchJson = {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        createdAt: timestamp.toISOString(),
        backupType: backupType,
        match: {
          id: matchId,
          name: matchName,
          auctioneerId: matchData.auctioneerId || '',
          status: matchData.status || '',
          currentPlayer: matchData.currentPlayer,
          soldPlayers: matchData.soldPlayers || 0,
          unsoldPlayers: matchData.unsoldPlayers || 0,
          totalPlayers: players.length,
          totalTeams: teams.length,
          totalBids: bids.length,
          createdAt: matchData.createdAt || '',
          updatedAt: matchData.updatedAt || '',
          auctionSettings: matchData.auctionSettings || {},
          purseSettings: matchData.purseSettings || {},
          liveRoomState: liveAuctionState
        }
      };

      // Create ZIP file
      const zip = new AdmZip();

      // Add match.json
      zip.addFile('backup/match.json', Buffer.from(JSON.stringify(matchJson, null, 2)));

      // Add CSV files with clean column structure
      if (teams.length > 0) {
        zip.addFile('backup/teams.csv', Buffer.from(_create_teams_csv(teams)));
      }
      if (players.length > 0) {
        zip.addFile('backup/players.csv', Buffer.from(_create_players_csv(players)));
      }
      if (bids.length > 0) {
        zip.addFile('backup/bids.csv', Buffer.from(_create_bids_csv(bids)));
      }

      // Get ZIP buffer
      const zipBuffer = zip.toBuffer();
      const zipSize = zipBuffer.length;

      // Upload to Firebase Storage
      const bucket = getStorageBucket();
      const blob = bucket.file(`backups/${matchId}/${fileName}`);
      await blob.save(zipBuffer, {
        contentType: 'application/zip'
      });

      await blob.makePublic();
      const downloadUrl = blob.publicUrl();

      // Update backup metadata
      backupMetadata.status = 'completed';
      backupMetadata.size = zipSize;
      backupMetadata.downloadURL = downloadUrl;
      backupMetadata.playersCount = players.length;
      backupMetadata.teamsCount = teams.length;
      backupMetadata.bidsCount = bids.length;

      await getDb().collection('backups').doc(backupId).set(backupMetadata);
      console.log(`✅ Match backup completed: ${fileName} (${zipSize} bytes) - ${players.length} players, ${teams.length} teams, ${bids.length} bids`);

      // Cleanup old backups (keep only MAX_BACKUPS_TO_KEEP)
      await _cleanup_old_backups(matchId);

      return [successResponse(backupMetadata, "Backup created successfully"), 200];

    } catch (e) {
      // Update backup as failed
      await getDb().collection('backups').doc(backupId).update({
        status: 'failed',
        errorMessage: String(e)
      });
      throw e;
    }

  } catch (e) {
    console.log(`❌ Backup failed: ${e}`);
    return [errorResponse(`Backup failed: ${String(e)}`), 500];
  }
}

async function delete_backup(backupId, data) {
  /**Delete a backup*/
  try {
    const userRole = data.userRole || 'GUEST';

    // Only ADMIN can delete backups
    if (userRole !== 'ADMIN') {
      return [errorResponse("Only admins can delete backups", 403), 403];
    }

    const doc = await getDb().collection('backups').doc(backupId).get();
    if (!doc.exists) {
      return [errorResponse("Backup not found", 404), 404];
    }

    const backupData = doc.data() || {};
    const matchId = backupData.matchId;
    const fileName = backupData.fileName;

    // Delete from storage
    try {
      const bucket = getStorageBucket();
      const blob = bucket.file(`backups/${matchId}/${fileName}`);
      const [exists] = await blob.exists();
      if (exists) {
        await blob.delete();
      }
    } catch (e) {
      console.log(`Warning: Could not delete backup file: ${e}`);
    }

    // Delete from Firestore
    await getDb().collection('backups').doc(backupId).delete();

    return [successResponse(null, "Backup deleted successfully"), 200];
  } catch (e) {
    return [errorResponse(`Failed to delete backup: ${String(e)}`), 500];
  }
}

async function download_backup(backupId) {
  /**Get download URL for a backup*/
  try {
    const doc = await getDb().collection('backups').doc(backupId).get();
    if (!doc.exists) {
      return [errorResponse("Backup not found", 404), 404];
    }

    const backupData = doc.data() || {};
    const downloadUrl = backupData.downloadURL;

    if (!downloadUrl) {
      return [errorResponse("Download URL not available"), 404];
    }

    return [successResponse({ downloadURL: downloadUrl }), 200];
  } catch (e) {
    return [errorResponse(`Failed to get download URL: ${String(e)}`), 500];
  }
}

async function get_auto_backup_config(data) {
  /**Get auto backup configuration for a match*/
  try {
    const matchId = data.matchId;
    if (!matchId) {
      return [errorResponse("matchId is required"), 400];
    }

    const doc = await getDb().collection('autoBackupConfigs').doc(matchId).get();

    if (doc.exists) {
      const config = serializeFirestoreDoc(doc);
      return [successResponse(config), 200];
    } else {
      // Default config
      const config = {
        id: matchId,
        enabled: false,
        interval: 'daily',
        retainCount: MAX_BACKUPS_TO_KEEP
      };
      return [successResponse(config), 200];
    }
  } catch (e) {
    return [errorResponse(`Failed to get auto backup config: ${String(e)}`), 500];
  }
}

async function update_auto_backup_config(data) {
  /**Update auto backup configuration*/
  try {
    const matchId = data.matchId;
    const userRole = data.userRole || 'GUEST';

    if (!matchId) {
      return [errorResponse("matchId is required"), 400];
    }

    // Only ADMIN can configure auto backups
    if (userRole !== 'ADMIN') {
      return [errorResponse("Only admins can configure auto backups", 403), 403];
    }

    const enabled = data.enabled || false;
    const interval = data.interval || 'daily';  // 'hourly', 'six_hours', 'daily', 'disabled'

    // Calculate next backup time
    let nextBackup = null;
    if (enabled) {
      const now = new Date();
      if (interval === 'hourly') {
        nextBackup = new Date(now.getTime() + 60 * 60 * 1000);
      } else if (interval === 'six_hours') {
        nextBackup = new Date(now.getTime() + 6 * 60 * 60 * 1000);
      } else if (interval === 'daily') {
        nextBackup = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    const config = {
      id: matchId,
      enabled: enabled,
      interval: interval,
      retainCount: data.retainCount || MAX_BACKUPS_TO_KEEP,
      nextBackupAt: nextBackup ? nextBackup.toISOString() : null,
      updatedAt: new Date().toISOString()
    };

    await getDb().collection('autoBackupConfigs').doc(matchId).set(config);

    return [successResponse(config, "Auto backup config updated"), 200];
  } catch (e) {
    return [errorResponse(`Failed to update auto backup config: ${String(e)}`), 500];
  }
}

async function get_backup_status(data) {
  /**Check if a backup is in progress*/
  try {
    const matchId = data.matchId;
    if (!matchId) {
      return [errorResponse("matchId is required"), 400];
    }

    const inProgress = await _check_backup_in_progress(matchId);

    // Get latest backup info
    let latestBackup = null;
    const snapshot = await getDb().collection('backups')
      .where('matchId', '==', matchId)
      .get();

    if (!snapshot.empty) {
      // Sort by createdAt and get latest
      const backups = snapshot.docs.map(doc => ({ doc, data: doc.data() }));
      backups.sort((a, b) => (b.data.createdAt || '').localeCompare(a.data.createdAt || ''));
      latestBackup = serializeFirestoreDoc(backups[0].doc);
    }

    return [successResponse({
      inProgress: inProgress,
      latestBackup: latestBackup
    }), 200];
  } catch (e) {
    console.log(`Error in get_backup_status: ${e}`);
    return [errorResponse(`Failed to get backup status: ${String(e)}`), 500];
  }
}

async function restore_backup(data) {
  /**Restore from a match-scoped backup*/
  const AdmZip = require('adm-zip');

  try {
    const backupId = data.backupId;
    const userRole = data.userRole || 'GUEST';
    let matchId = data.matchId;

    if (!backupId) {
      return [errorResponse("backupId is required"), 400];
    }

    // Only ADMIN can restore
    if (userRole !== 'ADMIN') {
      return [errorResponse("Only admins can restore backups", 403), 403];
    }

    // Check if auction is live
    if (matchId && await _check_live_auction(matchId)) {
      return [errorResponse("Cannot restore during a live auction", 403), 403];
    }

    // Get backup details
    const backupDoc = await getDb().collection('backups').doc(backupId).get();
    if (!backupDoc.exists) {
      return [errorResponse("Backup not found", 404), 404];
    }

    const backupData = backupDoc.data() || {};
    matchId = backupData.matchId;
    const fileName = backupData.fileName;
    const schemaVersion = backupData.schemaVersion || '1.0.0';

    console.log(`🔄 Starting restore from backup: ${backupId} (schema v${schemaVersion})`);

    // Download backup file
    const bucket = getStorageBucket();
    const blob = bucket.file(`backups/${matchId}/${fileName}`);

    const [exists] = await blob.exists();
    if (!exists) {
      return [errorResponse("Backup file not found in storage"), 404];
    }

    const [zipContent] = await blob.download();

    // Parse backup
    let players = [];
    let teams = [];
    let bids = [];
    let matchConfig = null;
    let liveState = null;

    const zip = new AdmZip(zipContent);
    const zipEntries = zip.getEntries();
    const fileList = zipEntries.map(e => e.entryName);

    // Handle new match-scoped format (v2.0.0)
    if (fileList.includes('backup/match.json')) {
      const matchJson = JSON.parse(zip.readAsText('backup/match.json'));
      matchConfig = matchJson.match || {};
      liveState = matchConfig.liveRoomState;
      delete matchConfig.liveRoomState;

      // Read CSVs and convert back to dicts
      if (fileList.includes('backup/teams.csv')) {
        teams = _parse_csv_to_dicts(zip.readAsText('backup/teams.csv'));
      }
      if (fileList.includes('backup/players.csv')) {
        players = _parse_csv_to_dicts(zip.readAsText('backup/players.csv'));
      }
      if (fileList.includes('backup/bids.csv')) {
        bids = _parse_csv_to_dicts(zip.readAsText('backup/bids.csv'));
      }
    }
    // Handle legacy format (v1.0.0 - database.json)
    else if (fileList.includes('backup/database.json')) {
      const databaseJson = JSON.parse(zip.readAsText('backup/database.json'));
      const dbData = databaseJson.database || {};
      players = dbData.players || [];
      teams = dbData.teams || [];
      bids = dbData.bids || [];
      matchConfig = dbData.matchConfig;
      liveState = dbData.liveRoomState;
    } else {
      return [errorResponse("Invalid backup format - missing match.json or database.json"), 400];
    }

    // Restore teams to subcollection
    for (const team of teams) {
      const teamId = team.teamId || team.id;
      if (teamId) {
        await getDb().collection('matches').doc(matchId).collection('teams').doc(teamId).set(team, { merge: true });
      }
    }
    console.log(`✅ Restored ${teams.length} teams to matches/${matchId}/teams`);

    // Restore players to subcollection
    for (const player of players) {
      const playerId = player.playerId || player.id;
      if (playerId) {
        await getDb().collection('matches').doc(matchId).collection('players').doc(playerId).set(player, { merge: true });
      }
    }
    console.log(`✅ Restored ${players.length} players to matches/${matchId}/players`);

    // Restore bids to subcollection
    for (const bid of bids) {
      const bidId = bid.bidId || bid.id;
      if (bidId) {
        await getDb().collection('matches').doc(matchId).collection('bids').doc(bidId).set(bid, { merge: true });
      }
    }
    console.log(`✅ Restored ${bids.length} bids to matches/${matchId}/bids`);

    // Restore match config
    if (matchConfig && matchId) {
      await getDb().collection('matches').doc(matchId).set(matchConfig, { merge: true });
      console.log(`✅ Restored match config`);
    }

    // Restore live auction state if present
    if (liveState && matchId) {
      await getDb().collection('liveAuctions').doc(matchId).set(liveState, { merge: true });
      console.log(`✅ Restored live auction state`);
    }

    return [successResponse({
      restoredPlayers: players.length,
      restoredTeams: teams.length,
      restoredBids: bids.length
    }, "Restore completed successfully"), 200];

  } catch (e) {
    console.log(`❌ Restore failed: ${e}`);
    return [errorResponse(`Restore failed: ${String(e)}`), 500];
  }
}

async function preview_restore(data) {
  /**Preview contents of a backup before restoring*/
  try {
    const backupId = data.backupId;

    if (!backupId) {
      return [errorResponse("backupId is required"), 400];
    }

    // Get backup details
    const backupDoc = await getDb().collection('backups').doc(backupId).get();
    if (!backupDoc.exists) {
      return [errorResponse("Backup not found", 404), 404];
    }

    const backupData = backupDoc.data() || {};
    const schemaVersion = backupData.schemaVersion || 'unknown';

    const preview = {
      playersCount: backupData.playersCount || 0,
      teamsCount: backupData.teamsCount || 0,
      bidsCount: backupData.bidsCount || 0,
      schemaVersion: schemaVersion,
      backupDate: backupData.createdAt,
      matchId: backupData.matchId,
      matchName: backupData.matchName,
      backupType: backupData.type,
      isMatchScoped: schemaVersion.startsWith('2.'),
      isCompatible: true,  // Both v1.x and v2.x are compatible
      warnings: []
    };

    // Add warnings if needed
    if (schemaVersion.startsWith('1.')) {
      preview.warnings.push("Legacy backup format (v1.x) - will be restored to subcollections");
    }

    return [successResponse(preview), 200];
  } catch (e) {
    return [errorResponse(`Failed to preview backup: ${String(e)}`), 500];
  }
}

async function validate_backup_file(data) {
  /**Validate a backup file structure*/
  const AdmZip = require('adm-zip');

  try {
    const backupId = data.backupId;

    if (!backupId) {
      return [errorResponse("backupId is required"), 400];
    }

    // Get backup details
    const backupDoc = await getDb().collection('backups').doc(backupId).get();
    if (!backupDoc.exists) {
      return [errorResponse("Backup not found", 404), 404];
    }

    const backupData = backupDoc.data() || {};
    const matchId = backupData.matchId;
    const fileName = backupData.fileName;

    // Download and validate backup file
    const bucket = getStorageBucket();
    const blob = bucket.file(`backups/${matchId}/${fileName}`);

    const [exists] = await blob.exists();
    if (!exists) {
      return [successResponse({
        valid: false,
        error: 'Backup file not found in storage'
      }), 200];
    }

    const [zipContent] = await blob.download();

    try {
      const zip = new AdmZip(zipContent);
      const zipEntries = zip.getEntries();
      const fileList = zipEntries.map(e => e.entryName);

      // Check for either new (match.json) or legacy (database.json) format
      const hasMatchJson = fileList.includes('backup/match.json');
      const hasDatabaseJson = fileList.includes('backup/database.json');

      if (!hasMatchJson && !hasDatabaseJson) {
        return [successResponse({
          valid: false,
          error: 'Missing required files: match.json or database.json'
        }), 200];
      }

      // Validate appropriate JSON structure
      let schemaVersion;
      let formatType;
      if (hasMatchJson) {
        const matchJson = JSON.parse(zip.readAsText('backup/match.json'));
        schemaVersion = matchJson.schemaVersion;
        formatType = 'match-scoped (v2.0+)';
      } else {
        const databaseJson = JSON.parse(zip.readAsText('backup/database.json'));
        schemaVersion = databaseJson.schemaVersion;
        formatType = 'legacy (v1.x)';
      }

      if (!schemaVersion) {
        return [successResponse({
          valid: false,
          error: 'Missing schemaVersion'
        }), 200];
      }

      return [successResponse({
        valid: true,
        schemaVersion: schemaVersion,
        formatType: formatType,
        files: fileList
      }), 200];

    } catch (e) {
      return [successResponse({
        valid: false,
        error: 'Invalid ZIP file'
      }), 200];
    }

  } catch (e) {
    return [errorResponse(`Failed to validate backup: ${String(e)}`), 500];
  }
}

const routeAuction = async (req, res) => {
  try {
    if (applyCors(req, res)) return;

    const pathParts = normalizePathParts(req.path);
    const method = req.method;

    // Data handling mirrors Python:
    // - POST/PUT/PATCH: req.get_json(silent=True) or {}
    // - GET: dict(req.args)
    let data = {};
    if (["POST", "PUT", "PATCH"].includes(method)) {
      data = req.body && typeof req.body === "object" ? req.body : {};
    } else if (method === "GET") {
      data = normalizeGetArgs(req.query);
    }

    if (pathParts.length === 0 || pathParts[0] === "") {
      return createResponse(res, successResponse({ version: "1.0", status: "running" }));
    }

    const resource = pathParts.length > 0 ? pathParts[0] : null;
    const resourceId = pathParts.length > 1 ? pathParts[1] : null;
    const action = pathParts.length > 2 ? pathParts[2] : null;

    console.log(
      `DEBUG: path=${JSON.stringify(pathParts)}, method=${method}, resource=${resource}, resource_id=${resourceId}, action=${action}`
    );

    // ===== USERS ROUTE - HANDLE EMAIL ENDPOINT =====
    if (resource === "users") {
      if (method === "GET" && !resourceId) {
        const [payload, statusCode] = await get_users(data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "GET" && resourceId) {
        if (resourceId === "email" && action) {
          const [payload, statusCode] = await get_user_by_email(action);
          return createResponse(res, payload, statusCode);
        }
        const [payload, statusCode] = await get_user(resourceId);
        return createResponse(res, payload, statusCode);
      }
      if (method === "POST") {
        const [payload, statusCode] = await create_user(data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "PUT" && resourceId) {
        const [payload, statusCode] = await update_user(resourceId, data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "DELETE" && resourceId) {
        const [payload, statusCode] = await delete_user(resourceId);
        return createResponse(res, payload, statusCode);
      }
    }

    // ===== AUTH ROUTES =====
    if (resource === "auth") {
      if ((action === "login" || resourceId === "login") && method === "POST") {
        const [payload, statusCode] = await handle_login(data);
        return createResponse(res, payload, statusCode);
      }
      if ((action === "register" || resourceId === "register") && method === "POST") {
        const [payload, statusCode] = await handle_auth_register(data);
        return createResponse(res, payload, statusCode);
      }
      if ((action === "reset-password" || resourceId === "reset-password") && method === "POST") {
        const [payload, statusCode] = await handle_reset_password(data);
        return createResponse(res, payload, statusCode);
      }
      if ((action === "check-email" || resourceId === "check-email") && method === "POST") {
        const [payload, statusCode] = await handle_check_email(data);
        return createResponse(res, payload, statusCode);
      }
      if ((action === "verify-otp" || resourceId === "verify-otp") && method === "POST") {
        const [payload, statusCode] = await handle_verify_otp(data);
        return createResponse(res, payload, statusCode);
      }
      if ((action === "users" || resourceId === "users") && method === "GET") {
        const [payload, statusCode] = await get_auth_users(data);
        return createResponse(res, payload, statusCode);
      }
      if ((action === "complete-profile" || resourceId === "complete-profile") && method === "POST") {
        const [payload, statusCode] = await complete_auth_profile(data);
        return createResponse(res, payload, statusCode);
      }
      if ((action === "debug-admins" || resourceId === "debug-admins") && method === "GET") {
        // Keep this inline like Python (debug-only).
        try {
          // NOTE: this touches Firestore; admin is lazily initialized.
          const db = getDb();
          return db
            .collection("matches")
            .where("role", "==", "ADMIN")
            .get()
            .then((snap) => {
              const admins = [];
              snap.forEach((doc) => {
                const d = doc.data() || {};
                admins.push({
                  id: doc.id,
                  email: d.email,
                  name: d.name,
                  password: d.password,
                  role: d.role,
                  has_password: Object.prototype.hasOwnProperty.call(d, "password"),
                });
              });
              return createResponse(res, successResponse(admins, `Found ${admins.length} admins`));
            })
            .catch((e) => createResponse(res, errorResponse(`Debug error: ${String(e)}`, 500), 500));
        } catch (e) {
          return createResponse(res, errorResponse(`Debug error: ${String(e)}`, 500), 500);
        }
      }
    }

    // ===== REGISTRATION ROUTES =====
    if (resource === "register") {
      const regType = action || resourceId;
      console.log(`📝 REGISTER: reg_type=${regType}, action=${action}, resource_id=${resourceId}, method=${method}`);
      if (regType === "admin" && method === "POST") {
        const [payload, statusCode] = await handle_register_admin(data);
        return createResponse(res, payload, statusCode);
      }
      if (regType === "auctioneer" && method === "POST") {
        const [payload, statusCode] = await handle_register_auctioneer(data);
        return createResponse(res, payload, statusCode);
      }
      if (regType === "team" && method === "POST") {
        const [payload, statusCode] = await handle_register_team(data);
        return createResponse(res, payload, statusCode);
      }
      if (regType === "player" && method === "POST") {
        const [payload, statusCode] = await handle_register_player(data);
        return createResponse(res, payload, statusCode);
      }
      if (regType === "guest" && method === "POST") {
        const [payload, statusCode] = await handle_register_guest(data);
        return createResponse(res, payload, statusCode);
      }
    }

    // ===== TEAM ROUTES =====
    if (resource === "teams") {
      if (method === "GET" && !resourceId) {
        const [payload, statusCode] = await get_teams(data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "GET" && resourceId) {
        // Match Python's special-case: GET /teams/{id}/budget returns 405.
        if (action === "budget") {
          return createResponse(res, errorResponse("Method not allowed", 405), 405);
        }
        const [payload, statusCode] = await get_team(resourceId);
        return createResponse(res, payload, statusCode);
      }
      if (method === "POST") {
        const [payload, statusCode] = await create_team(data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "PUT" && resourceId) {
        if (action === "budget") {
          const [payload, statusCode] = await update_team_budget(resourceId, data);
          return createResponse(res, payload, statusCode);
        }
        if (action === "approve") {
          const [payload, statusCode] = await update_team_approval(resourceId, "accepted");
          return createResponse(res, payload, statusCode);
        }
        if (action === "decline") {
          const [payload, statusCode] = await update_team_approval(resourceId, "declined");
          return createResponse(res, payload, statusCode);
        }
        const [payload, statusCode] = await update_team(resourceId, data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "DELETE" && resourceId) {
        const [payload, statusCode] = await delete_team(resourceId);
        return createResponse(res, payload, statusCode);
      }
    }

    // ===== AUCTIONEER ROUTES =====
    if (resource === "auctioneers") {
      // Mirrors Python quirk: first GET branch triggers even with resourceId present.
      if (method === "GET") {
        const [payload, statusCode] = await get_auctioneers(data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "POST") {
        const [payload, statusCode] = await create_auctioneer(data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "PUT" && resourceId) {
        const [payload, statusCode] = await update_auctioneer(resourceId, data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "DELETE" && resourceId) {
        const [payload, statusCode] = await delete_auctioneer(resourceId);
        return createResponse(res, payload, statusCode);
      }
    }

    if (resource === "auctioneer") {
      if (method === "GET" && !resourceId) {
        const email = data.email || data["email[]"];
        if (email) {
          const [payload, statusCode] = await get_auctioneer_by_email(email);
          return createResponse(res, payload, statusCode);
        }
        return createResponse(res, errorResponse("Email required", 400), 400);
      }
      if (method === "GET" && resourceId) {
        const [payload, statusCode] = await get_auctioneer(resourceId, data);
        return createResponse(res, payload, statusCode);
      }
      if (resourceId === "approve" && method === "POST") {
        const [payload, statusCode] = await approve_auctioneer(data);
        return createResponse(res, payload, statusCode);
      }
      if (resourceId === "reject" && method === "POST") {
        const [payload, statusCode] = await reject_auctioneer(data);
        return createResponse(res, payload, statusCode);
      }
      if (resourceId === "update-photo" && method === "POST") {
        const [payload, statusCode] = await update_auctioneer_photo(data);
        return createResponse(res, payload, statusCode);
      }
    }

    // ===== PLAYER ROUTES =====
    if (resource === "players") {
      if (method === "GET" && !resourceId) {
        const [payload, statusCode] = await get_players(data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "GET" && resourceId) {
        const [payload, statusCode] = await get_player(resourceId);
        return createResponse(res, payload, statusCode);
      }
      if (method === "POST") {
        const [payload, statusCode] = await create_player(data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "PUT" && resourceId) {
        if (action === "approve") {
          const [payload, statusCode] = await update_player_approval(resourceId, "accepted");
          return createResponse(res, payload, statusCode);
        }
        if (action === "decline") {
          const [payload, statusCode] = await update_player_approval(resourceId, "declined");
          return createResponse(res, payload, statusCode);
        }
        const [payload, statusCode] = await update_player(resourceId, data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "DELETE" && resourceId) {
        const [payload, statusCode] = await delete_player(resourceId);
        return createResponse(res, payload, statusCode);
      }
    }

    // ===== PLAYER AUCTION ACTIONS =====
    if (resource === "player") {
      if (resourceId === "start" && method === "POST") {
        const [payload, statusCode] = await start_player_bidding(data);
        return createResponse(res, payload, statusCode);
      }
      if (resourceId === "close" && method === "POST") {
        const [payload, statusCode] = await close_player_bidding(data);
        return createResponse(res, payload, statusCode);
      }
      if (resourceId === "unsold" && method === "POST") {
        const [payload, statusCode] = await mark_player_unsold(data);
        return createResponse(res, payload, statusCode);
      }
      if (resourceId === "next" && method === "POST") {
        const [payload, statusCode] = await get_next_player(data);
        return createResponse(res, payload, statusCode);
      }
      if (resourceId === "reset" && method === "POST") {
        const [payload, statusCode] = await reset_live_auction(data);
        return createResponse(res, payload, statusCode);
      }
    }

    // ===== MATCH/AUCTION ROUTES =====
    if (resource === "matches" || resource === "auctions") {
      if (method === "GET" && !resourceId) {
        const [payload, statusCode] = await get_matches(data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "GET" && resourceId) {
        if (action === "config") {
          const [payload, statusCode] = await get_match_config(resourceId);
          return createResponse(res, payload, statusCode);
        }
        if (action === "validate") {
          const [payload, statusCode] = await validate_match_config(resourceId);
          return createResponse(res, payload, statusCode);
        }
        if (action === "pre-auction-validation") {
          const [payload, statusCode] = await get_pre_auction_validation(resourceId);
          return createResponse(res, payload, statusCode);
        }
        const [payload, statusCode] = await get_match(resourceId, data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "POST") {
        const [payload, statusCode] = await create_match(data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "PUT" && resourceId) {
        if (action === "config") {
          const [payload, statusCode] = await update_match_config(resourceId, data);
          return createResponse(res, payload, statusCode);
        }
        const [payload, statusCode] = await update_match(resourceId, data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "DELETE" && resourceId) {
        const [payload, statusCode] = await delete_match(resourceId);
        return createResponse(res, payload, statusCode);
      }
    }

    // ===== BID ROUTES =====
    if (resource === "bids") {
      if (method === "GET") {
        const [payload, statusCode] = await get_bids(data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "POST") {
        const [payload, statusCode] = await create_bid(data);
        return createResponse(res, payload, statusCode);
      }
    }

    // ===== AUCTION ACTIONS =====
    if (["start", "bid", "pause", "resume", "end"].includes(resource)) {
      if (resource === "start" && method === "POST") {
        const [payload, statusCode] = await start_auction(data);
        return createResponse(res, payload, statusCode);
      }
      if (resource === "bid" && method === "POST") {
        const [payload, statusCode] = await place_bid(data);
        return createResponse(res, payload, statusCode);
      }
      if (resource === "pause" && method === "POST") {
        const [payload, statusCode] = await pause_auction(data);
        return createResponse(res, payload, statusCode);
      }
      if (resource === "resume" && method === "POST") {
        const [payload, statusCode] = await resume_auction(data);
        return createResponse(res, payload, statusCode);
      }
      if (resource === "end" && method === "POST") {
        const [payload, statusCode] = await end_auction(data);
        return createResponse(res, payload, statusCode);
      }
    }

    // ===== MATCH STATUS UPDATE (Admin only) =====
    if (resource === "match-status" && method === "PUT" && resourceId) {
      const [payload, statusCode] = await update_match_status(resourceId, data);
      return createResponse(res, payload, statusCode);
    }

    // ===== AUCTION (OLD STRUCTURE) =====
    if (resource === "auction") {
      const auctionAction = resourceId;
      const auctionSubaction = action;

      if (auctionAction === "player") {
        if (auctionSubaction === "start" && method === "POST") {
          const [payload, statusCode] = await start_player_bidding(data);
          return createResponse(res, payload, statusCode);
        }
        if (auctionSubaction === "close" && method === "POST") {
          const [payload, statusCode] = await close_player_bidding(data);
          return createResponse(res, payload, statusCode);
        }
        if (auctionSubaction === "unsold" && method === "POST") {
          const [payload, statusCode] = await mark_player_unsold(data);
          return createResponse(res, payload, statusCode);
        }
        if (auctionSubaction === "next" && method === "POST") {
          const [payload, statusCode] = await get_next_player(data);
          return createResponse(res, payload, statusCode);
        }
        if (auctionSubaction === "switch" && method === "POST") {
          const [payload, statusCode] = await switch_player(data);
          return createResponse(res, payload, statusCode);
        }
      }

      if (auctionAction === "start" && method === "POST") {
        const [payload, statusCode] = await start_auction(data);
        return createResponse(res, payload, statusCode);
      }
      if (auctionAction === "bid" && method === "POST") {
        const [payload, statusCode] = await place_bid(data);
        return createResponse(res, payload, statusCode);
      }
      if (auctionAction === "pause" && method === "POST") {
        const [payload, statusCode] = await pause_auction(data);
        return createResponse(res, payload, statusCode);
      }
      if (auctionAction === "resume" && method === "POST") {
        const [payload, statusCode] = await resume_auction(data);
        return createResponse(res, payload, statusCode);
      }
      if (auctionAction === "end" && method === "POST") {
        const [payload, statusCode] = await end_auction(data);
        return createResponse(res, payload, statusCode);
      }
    }

    // ===== RE-AUCTION ROUTES =====
    if (resource === "reauction") {
      if (resourceId === "start" && method === "POST") {
        const [payload, statusCode] = await start_reauction_unsold(data);
        return createResponse(res, payload, statusCode);
      }
    }

    // ===== HISTORY ROUTES =====
    if (resource === "history") {
      const [payload, statusCode] = await get_history(data);
      return createResponse(res, payload, statusCode);
    }

    // ===== DEBUG ROUTES =====
    if (resource === "debug") {
      if (action === "sync-all-teams" && method === "POST") {
        const [payload, statusCode] = debug_sync_all_teams(data);
        return createResponse(res, payload, statusCode);
      }
      if (action === "all-players" && method === "GET") {
        const [payload, statusCode] = debug_all_players(data);
        return createResponse(res, payload, statusCode);
      }
      if (action === "seed-users" && method === "POST") {
        const [payload, statusCode] = debug_seed_test_users();
        return createResponse(res, payload, statusCode);
      }
      if (action === "migrate-sold-players" && method === "POST") {
        const [payload, statusCode] = migrate_sold_players_data(data);
        return createResponse(res, payload, statusCode);
      }
    }

    // ===== SPORTS ROUTES =====
    if (resource === "sports") {
      if (method === "GET") {
        const [payload, statusCode] = await get_sports(data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "POST") {
        const [payload, statusCode] = await save_sports(data);
        return createResponse(res, payload, statusCode);
      }
    }

    // ===== FILE UPLOAD ROUTES =====
    if (resource === "upload") {
      if (method === "POST") {
        const uploadType = resourceId;
        if (uploadType === "player-photo" || uploadType === "team-logo" || 
            uploadType === "profile-picture" || uploadType === "auctioneer-photo" ||
            uploadType === "auction-recording" || uploadType === "auction-replay" ||
            uploadType === "document") {
          try {
            const result = await handle_file_upload(req);
            return createResponse(res, {
              success: true,
              url: result.fileUrl,
              filename: result.filename,
              filePath: result.filePath,
              contentType: result.contentType,
              uploadedAt: new Date().toISOString()
            }, 200);
          } catch (err) {
            console.error(`❌ Upload error for ${uploadType}:`, err);
            return createResponse(res, errorResponse(`Upload failed: ${String(err)}`), 500);
          }
        }
        // Unknown upload type
        return createResponse(res, errorResponse(`Unknown upload type: ${uploadType}`), 400);
      }

      return createResponse(res, errorResponse("Use POST method for file uploads", 405), 405);
    }

    // ===== AUCTIONS (CRUD) ROUTES =====
    if (resource === "auctions") {
      if (method === "GET" && !resourceId) {
        const [payload, statusCode] = await get_auctions(data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "GET" && resourceId) {
        const [payload, statusCode] = await get_auction(resourceId);
        return createResponse(res, payload, statusCode);
      }
      if (method === "POST") {
        const [payload, statusCode] = await create_auction(data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "PUT" && resourceId) {
        const [payload, statusCode] = await update_auction(resourceId, data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "DELETE" && resourceId) {
        const [payload, statusCode] = await delete_auction(resourceId);
        return createResponse(res, payload, statusCode);
      }
    }

    // ===== APP STATE ROUTES =====
    if (resource === "state") {
      if (method === "GET") {
        const [payload, statusCode] = await get_state(data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "POST") {
        const [payload, statusCode] = await save_state(data);
        return createResponse(res, payload, statusCode);
      }
    }

    // ===== BACKUP & RESTORE ROUTES =====
    if (resource === "backups") {
      if (method === "GET" && !resourceId) {
        const [payload, statusCode] = await get_backups(data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "GET" && resourceId) {
        if (action === "download") {
          const [payload, statusCode] = await download_backup(resourceId);
          return createResponse(res, payload, statusCode);
        }
        const [payload, statusCode] = await get_backup(resourceId);
        return createResponse(res, payload, statusCode);
      }
      if (method === "POST") {
        const [payload, statusCode] = await create_backup(data);
        return createResponse(res, payload, statusCode);
      }
      if (method === "DELETE" && resourceId) {
        // Note: Python leaves data={} for DELETE, so userRole will default if handler relies on it.
        const [payload, statusCode] = await delete_backup(resourceId, data);
        return createResponse(res, payload, statusCode);
      }
    }

    if (resource === "backup") {
      if (resourceId === "full" && method === "POST") {
        const payloadData = { ...data, type: "full" };
        const [payload, statusCode] = await create_backup(payloadData);
        return createResponse(res, payload, statusCode);
      }
      if (resourceId === "quick" && method === "POST") {
        const payloadData = { ...data, type: "quick" };
        const [payload, statusCode] = await create_backup(payloadData);
        return createResponse(res, payload, statusCode);
      }
      if (resourceId === "auto-config" && method === "GET") {
        const [payload, statusCode] = await get_auto_backup_config(data);
        return createResponse(res, payload, statusCode);
      }
      if (resourceId === "auto-config" && method === "PUT") {
        const [payload, statusCode] = await update_auto_backup_config(data);
        return createResponse(res, payload, statusCode);
      }
      if (resourceId === "status" && method === "GET") {
        const [payload, statusCode] = await get_backup_status(data);
        return createResponse(res, payload, statusCode);
      }
    }

    if (resource === "restore") {
      if (method === "POST" && !resourceId) {
        const [payload, statusCode] = await restore_backup(data);
        return createResponse(res, payload, statusCode);
      }
      if (resourceId === "preview" && method === "POST") {
        const [payload, statusCode] = await preview_restore(data);
        return createResponse(res, payload, statusCode);
      }
      if (resourceId === "validate" && method === "POST") {
        const [payload, statusCode] = await validate_backup_file(data);
        return createResponse(res, payload, statusCode);
      }
    }

    // 404 Not Found (match Python)
    return createResponse(res, errorResponse(`Route not found: ${method} /${pathParts.join("/")}`, 404), 404);
  } catch (e) {
    console.error(`API Error: ${String(e)}`);
    return createResponse(res, errorResponse(`Internal error: ${String(e)}`, 500), 500);
  }
};

async function auction(req, res) {
  return routeAuction(req, res);
}

// ====================
// Express app (unified HTTPS function)
// ====================
const app = express();

// ====================
// CORS Middleware - Allow both local and production origins
// ====================
app.use((req, res, next) => {
  const origin = req.get('origin') || req.get('referer');
  const allowedOrigins = [
    'http://localhost:5173',           // Local Vite dev server
    'http://localhost:3000',           // Local fallback
    'https://hype-hammer.web.app',     // Production hosting
    'https://axilam.web.app',          // Firebase project URL
    'https://us-central1-axilam.cloudfunctions.net' // Cloud Functions domain
  ];

  if (origin && allowedOrigins.some(allowed => origin.includes(allowed))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

// DO NOT parse JSON bodies globally - handle them per-route
// This prevents body-parser from consuming multipart streams

// Upload routes disabled - use Firebase Storage SDK instead (frontend)
// This endpoint is deprecated and no longer functional
app.post('/upload/:type', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'File uploads via Cloud Function are no longer supported. Use Firebase Storage directly from the frontend.'
  });
});

// Global JSON parser for non-upload routes
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    // Check Content-Type
    const contentType = req.get('content-type') || '';
    
    // Skip JSON parsing for multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      console.log(`⏭️  Skipping JSON parsing for multipart request: ${req.path}`);
      return next();
    }
    
    // Parse JSON for other content types
    express.json({ limit: "10mb" })(req, res, next);
  } else {
    next();
  }
});

// Match Python's req.get_json(silent=True): malformed JSON should not throw a 400.
// If JSON parsing fails, treat body as {} and continue routing.
app.use((err, req, _res, next) => {
  const isBodyParserSyntaxError =
    err instanceof SyntaxError &&
    err != null &&
    typeof err === "object" &&
    "status" in err &&
    err.status === 400;

  if (isBodyParserSyntaxError) {
    req.body = {};
    return next();
  }

  return next(err);
});

app.all("*", routeAuction);

const exportAuctionFunction = () => {
  // Secrets support varies by firebase-functions version.
  // This keeps compatibility while preserving the intent of Python's secrets list.
  if (typeof functions.runWith === "function") {
    return functions
      .runWith({ secrets: ["EMAIL_SENDER", "EMAIL_PASSWORD"] })
      .https.onRequest(app);
  }

  return functions.https.onRequest(app);
};

exports.auction = exportAuctionFunction();

// Export getters for Phase 3 handler ports.
exports._internal = {
  EMAIL_SENDER,
  EMAIL_PASSWORD,
  generate_otp,
  send_otp_email,
  getDb,
  getStorageBucket,
  createResponse,
  successResponse,
  errorResponse,
};
