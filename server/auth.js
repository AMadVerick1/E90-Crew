const crypto = require('node:crypto');
const { db, hashPassword } = require('./db');

const SESSION_DURATION_HOURS = 24 * 7; // 7 days

// Helper to get cookie by name from request
function getCookie(req, name) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const matches = cookieHeader.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return matches ? decodeURIComponent(matches[1]) : null;
}

// Extract session token from cookie or Authorization header
function extractToken(req) {
  // Check Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  // Check cookie
  return getCookie(req, 'e90_session');
}

// Find user by active session token
function getUserBySessionToken(token) {
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.id, u.username, u.role, s.expires_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND datetime(s.expires_at) > datetime('now');
  `).get(token);
  return row || null;
}

// Create new session for user
function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 3600 * 1000).toISOString();
  
  db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (?, ?, ?);
  `).run(token, userId, expiresAt);

  return { token, expiresAt };
}

// Delete session (logout)
function deleteSession(token) {
  if (!token) return;
  db.prepare(`DELETE FROM sessions WHERE token = ?;`).run(token);
}

// Cleanup expired sessions
function cleanExpiredSessions() {
  db.prepare(`DELETE FROM sessions WHERE datetime(expires_at) <= datetime('now');`).run();
}

// Middleware: Authenticate Request (Strict)
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized. Authentication token is missing.' });
  }

  const user = getUserBySessionToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Invalid or expired session.' });
  }

  req.user = user;
  req.sessionToken = token;
  next();
}

// Middleware: Authenticate Request (Optional)
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    const user = getUserBySessionToken(token);
    if (user) {
      req.user = user;
      req.sessionToken = token;
    }
  }
  next();
}

// Authenticate credentials
function authenticateUser(username, password) {
  const user = db.prepare(`SELECT * FROM users WHERE username = ?;`).get(username);
  if (!user) return null;

  const testHash = hashPassword(password, user.salt);
  if (crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(user.password_hash, 'hex'))) {
    return { id: user.id, username: user.username, role: user.role };
  }
  return null;
}

module.exports = {
  getCookie,
  extractToken,
  getUserBySessionToken,
  createSession,
  deleteSession,
  cleanExpiredSessions,
  requireAuth,
  optionalAuth,
  authenticateUser,
  hashPassword
};
