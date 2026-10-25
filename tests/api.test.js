const test = require('node:test');
const assert = require('node:assert');
const { db, hashPassword } = require('../server/db');
const { authenticateUser, createSession, deleteSession, getUserBySessionToken } = require('../server/auth');

test('Database tables exist and have seeded data', () => {
  const users = db.prepare('SELECT count(*) as c FROM users;').get().c;
  assert.ok(users >= 1, 'Should have at least 1 user');

  const events = db.prepare('SELECT count(*) as c FROM events;').get().c;
  assert.ok(events >= 3, 'Should have initial events');

  const enquiries = db.prepare('SELECT count(*) as c FROM enquiries;').get().c;
  assert.ok(enquiries >= 10, 'Should have initial enquiries');

  const vibes = db.prepare('SELECT count(*) as c FROM vibes;').get().c;
  assert.ok(vibes >= 4, 'Should have vibes');

  const perks = db.prepare('SELECT count(*) as c FROM perks;').get().c;
  assert.ok(perks >= 4, 'Should have perks');

  const content = db.prepare('SELECT count(*) as c FROM site_content;').get().c;
  assert.ok(content >= 10, 'Should have site content');
});

test('Authentication: valid and invalid credentials', () => {
  const valid = authenticateUser('admin', 'admin123');
  assert.ok(valid, 'admin / admin123 should authenticate');
  assert.strictEqual(valid.username, 'admin');

  const invalid = authenticateUser('admin', 'wrongpass');
  assert.strictEqual(invalid, null, 'wrong password should fail');

  const nonexistent = authenticateUser('nobody', 'admin123');
  assert.strictEqual(nonexistent, null, 'nonexistent user should fail');
});

test('Session creation, retrieval, and deletion', () => {
  const user = authenticateUser('admin', 'admin123');
  const session = createSession(user.id);
  assert.ok(session.token, 'Should return token');

  const found = getUserBySessionToken(session.token);
  assert.ok(found, 'Should find user by token');
  assert.strictEqual(found.username, 'admin');

  deleteSession(session.token);
  const afterDelete = getUserBySessionToken(session.token);
  assert.strictEqual(afterDelete, null, 'Deleted session should be null');
});

test('Events: Insert, Read, Update, Delete', () => {
  const insert = db.prepare(`
    INSERT INTO events (title, type, date, location, spots, desc, is_published)
    VALUES (?, ?, ?, ?, ?, ?, 1);
  `).run('Test Track Day', 'track', '2026-11-01', 'Kyalami', 50, 'Test event desc');

  const eventId = insert.lastInsertRowid;
  assert.ok(eventId > 0);

  const event = db.prepare('SELECT * FROM events WHERE id = ?;').get(eventId);
  assert.strictEqual(event.title, 'Test Track Day');
  assert.strictEqual(event.spots, 50);

  // Update
  db.prepare('UPDATE events SET spots = 45 WHERE id = ?;').run(eventId);
  const updated = db.prepare('SELECT spots FROM events WHERE id = ?;').get(eventId);
  assert.strictEqual(updated.spots, 45);

  // Delete
  db.prepare('DELETE FROM events WHERE id = ?;').run(eventId);
  const deleted = db.prepare('SELECT * FROM events WHERE id = ?;').get(eventId);
  assert.strictEqual(deleted, undefined);
});

test('Enquiries: Insert (Receive & Store), Update Status, Delete', () => {
  const insert = db.prepare(`
    INSERT INTO enquiries (type, name, email, message, status)
    VALUES ('membership', 'John Wick', 'wick@continental.com', 'I drive a black E90 335i.', 'new');
  `).run();

  const id = insert.lastInsertRowid;
  assert.ok(id > 0);

  const enquiry = db.prepare('SELECT * FROM enquiries WHERE id = ?;').get(id);
  assert.strictEqual(enquiry.name, 'John Wick');
  assert.strictEqual(enquiry.status, 'new');

  // Admin approves enquiry
  db.prepare("UPDATE enquiries SET status = 'approved', admin_notes = 'Verified BMW owner' WHERE id = ?;").run(id);
  const updated = db.prepare('SELECT * FROM enquiries WHERE id = ?;').get(id);
  assert.strictEqual(updated.status, 'approved');
  assert.strictEqual(updated.admin_notes, 'Verified BMW owner');

  // Clean up
  db.prepare('DELETE FROM enquiries WHERE id = ?;').run(id);
  const afterDelete = db.prepare('SELECT * FROM enquiries WHERE id = ?;').get(id);
  assert.strictEqual(afterDelete, undefined);
});

test('Site Content: Read and Update', () => {
  const original = db.prepare("SELECT value FROM site_content WHERE key = 'hero_title';").get().value;
  assert.ok(original);

  db.prepare(`
    INSERT INTO site_content (key, value) VALUES ('test_key', 'test_value')
    ON CONFLICT(key) DO UPDATE SET value = excluded.value;
  `).run();

  const testVal = db.prepare("SELECT value FROM site_content WHERE key = 'test_key';").get().value;
  assert.strictEqual(testVal, 'test_value');

  db.prepare("DELETE FROM site_content WHERE key = 'test_key';").run();
});
