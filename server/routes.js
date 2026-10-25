const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');
const { db, hashPassword } = require('./db');
const {
  requireAuth,
  optionalAuth,
  authenticateUser,
  createSession,
  deleteSession,
  extractToken
} = require('./auth');

// ─────────────────────────────────────────────────────────────
// 1. AUTHENTICATION ROUTES
// ─────────────────────────────────────────────────────────────

router.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = authenticateUser(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const { token, expiresAt } = createSession(user.id);

  // Set HTTP-only session cookie
  res.cookie('e90_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({
    success: true,
    message: 'Logged in successfully',
    token,
    user: { id: user.id, username: user.username, role: user.role }
  });
});

router.post('/auth/logout', (req, res) => {
  const token = extractToken(req);
  if (token) {
    deleteSession(token);
  }
  res.clearCookie('e90_session');
  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/auth/me', requireAuth, (req, res) => {
  res.json({
    user: req.user
  });
});

router.post('/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?;').get(req.user.id);
  const testHash = hashPassword(currentPassword, userRow.salt);
  if (testHash !== userRow.password_hash) {
    return res.status(400).json({ error: 'Incorrect current password' });
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  const newHash = hashPassword(newPassword, newSalt);
  db.prepare(`
    UPDATE users SET password_hash = ?, salt = ? WHERE id = ?;
  `).run(newHash, newSalt, req.user.id);

  res.json({ success: true, message: 'Password updated successfully' });
});

// ─────────────────────────────────────────────────────────────
// 2. SITE CONTENT CRUD (Public & Admin)
// ─────────────────────────────────────────────────────────────

// Get all site content key-values
router.get('/content/site', (req, res) => {
  const rows = db.prepare('SELECT key, value, updated_at FROM site_content;').all();
  const content = {};
  rows.forEach(r => { content[r.key] = r.value; });
  res.json({ content });
});

// Update site content key-values (Admin)
router.put('/content/site', requireAuth, (req, res) => {
  const updates = req.body || {};
  if (typeof updates !== 'object') {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const upsertStmt = db.prepare(`
    INSERT INTO site_content (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
  `);

  for (const [key, value] of Object.entries(updates)) {
    if (typeof key === 'string' && value !== undefined && value !== null) {
      upsertStmt.run(key, String(value));
    }
  }

  const rows = db.prepare('SELECT key, value, updated_at FROM site_content;').all();
  const content = {};
  rows.forEach(r => { content[r.key] = r.value; });

  res.json({
    success: true,
    message: 'Site content updated successfully',
    content
  });
});

// --- Vibes CRUD ---
router.get('/content/vibes', (req, res) => {
  const vibes = db.prepare('SELECT * FROM vibes ORDER BY order_index ASC, id ASC;').all();
  res.json({ vibes });
});

router.post('/content/vibes', requireAuth, (req, res) => {
  const { title, description, icon, order_index } = req.body || {};
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const info = db.prepare(`
    INSERT INTO vibes (title, description, icon, order_index)
    VALUES (?, ?, ?, ?);
  `).run(title, description, icon || 'sun', order_index || 0);

  const created = db.prepare('SELECT * FROM vibes WHERE id = ?;').get(info.lastInsertRowid);
  res.status(201).json({ success: true, vibe: created });
});

router.put('/content/vibes/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { title, description, icon, order_index } = req.body || {};

  const existing = db.prepare('SELECT * FROM vibes WHERE id = ?;').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Vibe not found' });
  }

  db.prepare(`
    UPDATE vibes
    SET title = coalesce(?, title),
        description = coalesce(?, description),
        icon = coalesce(?, icon),
        order_index = coalesce(?, order_index)
    WHERE id = ?;
  `).run(title, description, icon, order_index, id);

  const updated = db.prepare('SELECT * FROM vibes WHERE id = ?;').get(id);
  res.json({ success: true, vibe: updated });
});

router.delete('/content/vibes/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const info = db.prepare('DELETE FROM vibes WHERE id = ?;').run(id);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Vibe not found' });
  }
  res.json({ success: true, message: 'Vibe removed' });
});

// --- Perks CRUD ---
router.get('/content/perks', (req, res) => {
  const perks = db.prepare('SELECT * FROM perks ORDER BY order_index ASC, id ASC;').all();
  res.json({ perks });
});

router.post('/content/perks', requireAuth, (req, res) => {
  const { text, order_index } = req.body || {};
  if (!text) {
    return res.status(400).json({ error: 'Perk text is required' });
  }
  const info = db.prepare('INSERT INTO perks (text, order_index) VALUES (?, ?);').run(text, order_index || 0);
  const created = db.prepare('SELECT * FROM perks WHERE id = ?;').get(info.lastInsertRowid);
  res.status(201).json({ success: true, perk: created });
});

router.delete('/content/perks/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const info = db.prepare('DELETE FROM perks WHERE id = ?;').run(id);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Perk not found' });
  }
  res.json({ success: true, message: 'Perk removed' });
});

// ─────────────────────────────────────────────────────────────
// 3. EVENTS CRUD (Public & Admin)
// ─────────────────────────────────────────────────────────────

router.get('/events', optionalAuth, (req, res) => {
  const { type, search, all } = req.query;
  const isAuth = !!req.user;
  const showAll = isAuth && all === 'true';

  let sql = 'SELECT * FROM events WHERE 1=1';
  const params = [];

  if (!showAll) {
    sql += ' AND is_published = 1';
  }

  if (type && type !== 'all') {
    sql += ' AND type = ?';
    params.push(type.toLowerCase());
  }

  if (search) {
    sql += ' AND (title LIKE ? OR location LIKE ? OR desc LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  sql += ' ORDER BY date ASC, time ASC;';
  const events = db.prepare(sql).all(...params);
  res.json({ events });
});

router.get('/events/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const event = db.prepare('SELECT * FROM events WHERE id = ?;').get(id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json({ event });
});

router.post('/events', requireAuth, (req, res) => {
  const { title, type, date, time, location, spots, desc, image_url, is_published } = req.body || {};
  if (!title || !date || !location) {
    return res.status(400).json({ error: 'Title, date, and location are required' });
  }

  const info = db.prepare(`
    INSERT INTO events (title, type, date, time, location, spots, desc, image_url, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
  `).run(
    title.trim(),
    (type || 'run').toLowerCase(),
    date,
    time || '08:00',
    location.trim(),
    parseInt(spots, 10) || 0,
    desc ? desc.trim() : '',
    image_url || '../Assets/IMG-20260406-WA0000.jpg',
    is_published !== undefined ? (is_published ? 1 : 0) : 1
  );

  const event = db.prepare('SELECT * FROM events WHERE id = ?;').get(info.lastInsertRowid);
  res.status(201).json({ success: true, message: 'Event created successfully', event });
});

router.put('/events/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT * FROM events WHERE id = ?;').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const { title, type, date, time, location, spots, desc, image_url, is_published } = req.body || {};

  db.prepare(`
    UPDATE events
    SET title = coalesce(?, title),
        type = coalesce(?, type),
        date = coalesce(?, date),
        time = coalesce(?, time),
        location = coalesce(?, location),
        spots = coalesce(?, spots),
        desc = coalesce(?, desc),
        image_url = coalesce(?, image_url),
        is_published = coalesce(?, is_published),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
  `).run(
    title !== undefined ? title.trim() : null,
    type !== undefined ? type.toLowerCase() : null,
    date !== undefined ? date : null,
    time !== undefined ? time : null,
    location !== undefined ? location.trim() : null,
    spots !== undefined ? parseInt(spots, 10) : null,
    desc !== undefined ? desc.trim() : null,
    image_url !== undefined ? image_url : null,
    is_published !== undefined ? (is_published ? 1 : 0) : null,
    id
  );

  const event = db.prepare('SELECT * FROM events WHERE id = ?;').get(id);
  res.json({ success: true, message: 'Event updated successfully', event });
});

router.delete('/events/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const info = db.prepare('DELETE FROM events WHERE id = ?;').run(id);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json({ success: true, message: 'Event deleted successfully' });
});

// ─────────────────────────────────────────────────────────────
// 4. ENQUIRIES & APPLICATIONS (Receive, Store, Admin CRUD)
// ─────────────────────────────────────────────────────────────

// Public Submission Endpoint
router.post('/enquiries', (req, res) => {
  const { type, name, email, message, phone } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }

  const validTypes = ['membership', 'driver', 'cause', 'general'];
  const enquiryType = validTypes.includes(type) ? type : 'general';

  const info = db.prepare(`
    INSERT INTO enquiries (type, name, email, message, phone, status)
    VALUES (?, ?, ?, ?, ?, 'new');
  `).run(
    enquiryType,
    name.trim(),
    email.trim().toLowerCase(),
    message ? message.trim() : '',
    phone ? phone.trim() : null
  );

  const enquiry = db.prepare('SELECT * FROM enquiries WHERE id = ?;').get(info.lastInsertRowid);

  res.status(201).json({
    success: true,
    message: 'Your enquiry has been received. The E90 Crew will be in touch!',
    enquiry: {
      id: enquiry.id,
      name: enquiry.name,
      type: enquiry.type,
      status: enquiry.status,
      created_at: enquiry.created_at
    }
  });
});

// Admin List Enquiries
router.get('/enquiries', requireAuth, (req, res) => {
  const { type, status, search, limit, offset } = req.query;

  let sql = 'SELECT * FROM enquiries WHERE 1=1';
  const params = [];

  if (type && type !== 'all') {
    // Map plural to singular if passed like "memberships" or "drivers"
    const typeMap = {
      memberships: 'membership',
      drivers: 'driver',
      causes: 'cause',
      generals: 'general'
    };
    const resolvedType = typeMap[type] || type;
    sql += ' AND type = ?';
    params.push(resolvedType);
  }

  if (status && status !== 'all') {
    sql += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    sql += ' AND (name LIKE ? OR email LIKE ? OR message LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  sql += ' ORDER BY created_at DESC';

  if (limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(limit, 10));
    if (offset) {
      sql += ' OFFSET ?';
      params.push(parseInt(offset, 10));
    }
  }

  const enquiries = db.prepare(sql).all(...params);

  // Group counts by status and type for quick filtering
  const counts = db.prepare(`
    SELECT type, status, COUNT(*) as count
    FROM enquiries
    GROUP BY type, status;
  `).all();

  res.json({ enquiries, counts });
});

// Admin Get Single Enquiry
router.get('/enquiries/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const enquiry = db.prepare('SELECT * FROM enquiries WHERE id = ?;').get(id);
  if (!enquiry) {
    return res.status(404).json({ error: 'Enquiry not found' });
  }
  res.json({ enquiry });
});

// Admin Update Enquiry Status / Notes
router.patch('/enquiries/:id/status', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status, admin_notes } = req.body || {};

  const existing = db.prepare('SELECT * FROM enquiries WHERE id = ?;').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Enquiry not found' });
  }

  const validStatuses = ['new', 'pending', 'approved', 'declined'];
  const newStatus = status && validStatuses.includes(status) ? status : existing.status;

  db.prepare(`
    UPDATE enquiries
    SET status = ?,
        admin_notes = coalesce(?, admin_notes),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
  `).run(newStatus, admin_notes !== undefined ? admin_notes : null, id);

  const updated = db.prepare('SELECT * FROM enquiries WHERE id = ?;').get(id);
  res.json({
    success: true,
    message: `Application marked as ${newStatus}`,
    enquiry: updated
  });
});

// Admin Delete Enquiry
router.delete('/enquiries/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const info = db.prepare('DELETE FROM enquiries WHERE id = ?;').run(id);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Enquiry not found' });
  }
  res.json({ success: true, message: 'Enquiry deleted successfully' });
});

// ─────────────────────────────────────────────────────────────
// 5. DASHBOARD STATS
// ─────────────────────────────────────────────────────────────

router.get('/stats', requireAuth, (req, res) => {
  // Aggregate application counts
  const totalEnquiries = db.prepare('SELECT COUNT(*) as count FROM enquiries;').get().count;
  const newEnquiries = db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE status = 'new';").get().count;
  
  const membershipTotal = db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE type = 'membership';").get().count;
  const membershipNew = db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE type = 'membership' AND status = 'new';").get().count;
  const membershipApproved = db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE type = 'membership' AND status = 'approved';").get().count;
  
  const driverTotal = db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE type = 'driver';").get().count;
  const driverNew = db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE type = 'driver' AND status = 'new';").get().count;
  const driverApproved = db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE type = 'driver' AND status = 'approved';").get().count;
  
  const causeTotal = db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE type = 'cause';").get().count;
  const causeNew = db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE type = 'cause' AND status = 'new';").get().count;
  
  const eventsCount = db.prepare('SELECT COUNT(*) as count FROM events WHERE is_published = 1;').get().count;

  // Recent 8 enquiries
  const recent = db.prepare(`
    SELECT id, type, name, email, message, status, created_at
    FROM enquiries
    ORDER BY created_at DESC
    LIMIT 8;
  `).all();

  res.json({
    totalEnquiries,
    newEnquiries,
    memberships: { total: membershipTotal, new: membershipNew, approved: membershipApproved },
    drivers: { total: driverTotal, new: driverNew, approved: driverApproved },
    causes: { total: causeTotal, new: causeNew },
    eventsCount,
    recent
  });
});

module.exports = router;
