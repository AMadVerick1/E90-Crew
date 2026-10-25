const test = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');
const app = require('../server');
const { db } = require('../server/db');
const { createSession } = require('../server/auth');

// Helper to simulate HTTP requests directly through Express application
function simulateRequest(options) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = options.method || 'GET';
    req.url = options.url || '/';
    req.path = options.url.split('?')[0];
    req.query = {};
    req.headers = options.headers || {};
    req.body = options.body || {};

    if (options.url.includes('?')) {
      const qStr = options.url.split('?')[1];
      const searchParams = new URLSearchParams(qStr);
      for (const [k, v] of searchParams.entries()) {
        req.query[k] = v;
      }
    }

    const res = new EventEmitter();
    res.statusCode = 200;
    res._headers = {};
    res.setHeader = (k, v) => { res._headers[k.toLowerCase()] = v; };
    res.getHeader = (k) => res._headers[k.toLowerCase()];
    res.cookie = (name, val) => { res.setHeader('set-cookie', `${name}=${val}`); };
    res.clearCookie = (name) => { res.setHeader('set-cookie', `${name}=; Max-Age=0`); };

    res.status = (code) => {
      res.statusCode = code;
      return res;
    };

    let bodyData = '';
    res.send = (data) => {
      bodyData = data;
      res.emit('finish');
    };
    res.json = (obj) => {
      res.setHeader('content-type', 'application/json');
      bodyData = JSON.stringify(obj);
      res.emit('finish');
    };

    res.on('finish', () => {
      let parsed = bodyData;
      if (typeof bodyData === 'string' && bodyData.startsWith('{') || bodyData.startsWith('[')) {
        try { parsed = JSON.parse(bodyData); } catch (e) {}
      }
      resolve({ status: res.statusCode, body: parsed, headers: res._headers });
    });

    app.handle(req, res);
  });
}

test('Route: GET /api/content/site returns public site texts', async () => {
  const res = await simulateRequest({ url: '/api/content/site' });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.content);
  assert.ok(res.body.content.hero_title);
});

test('Route: GET /api/events returns published events', async () => {
  const res = await simulateRequest({ url: '/api/events' });
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body.events));
  assert.ok(res.body.events.length >= 3);
});

test('Route: POST /api/enquiries submits a public enquiry', async () => {
  const payload = {
    type: 'membership',
    name: 'Sarah Connor',
    email: 'sarah@resistance.org',
    message: 'Looking to join the weekend breakfast run.'
  };

  const res = await simulateRequest({
    method: 'POST',
    url: '/api/enquiries',
    headers: { 'content-type': 'application/json' },
    body: payload
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.enquiry.id);

  // Verify stored in DB
  const inDb = db.prepare('SELECT * FROM enquiries WHERE id = ?;').get(res.body.enquiry.id);
  assert.strictEqual(inDb.name, 'Sarah Connor');
  assert.strictEqual(inDb.status, 'new');

  // Clean up
  db.prepare('DELETE FROM enquiries WHERE id = ?;').run(res.body.enquiry.id);
});

test('Route: POST /api/auth/login and access protected /api/stats', async () => {
  // 1. Login
  const loginRes = await simulateRequest({
    method: 'POST',
    url: '/api/auth/login',
    body: { username: 'admin', password: 'admin123' }
  });

  assert.strictEqual(loginRes.status, 200);
  assert.ok(loginRes.body.token);
  const token = loginRes.body.token;

  // 2. Access stats with token
  const statsRes = await simulateRequest({
    url: '/api/stats',
    headers: { 'authorization': `Bearer ${token}` }
  });

  assert.strictEqual(statsRes.status, 200);
  assert.ok(statsRes.body.totalEnquiries >= 10);
  assert.ok(statsRes.body.eventsCount >= 3);

  // 3. Unauthorized access should fail (401)
  const unauthRes = await simulateRequest({ url: '/api/stats' });
  assert.strictEqual(unauthRes.status, 401);
});

test('Route: Admin can update enquiry status and delete it', async () => {
  const adminUser = db.prepare("SELECT id FROM users WHERE username = 'admin';").get();
  const session = createSession(adminUser.id);

  // Create temporary enquiry
  const ins = db.prepare(`
    INSERT INTO enquiries (type, name, email, message, status)
    VALUES ('driver', 'Toretto', 'dom@fast.com', 'Quarter mile at a time', 'new');
  `).run();
  const id = ins.lastInsertRowid;

  // Update status to approved
  const patchRes = await simulateRequest({
    method: 'PATCH',
    url: `/api/enquiries/${id}/status`,
    headers: { 'authorization': `Bearer ${session.token}` },
    body: { status: 'approved', admin_notes: 'Crew captain' }
  });

  assert.strictEqual(patchRes.status, 200);
  assert.strictEqual(patchRes.body.enquiry.status, 'approved');

  // Delete enquiry
  const delRes = await simulateRequest({
    method: 'DELETE',
    url: `/api/enquiries/${id}`,
    headers: { 'authorization': `Bearer ${session.token}` }
  });

  assert.strictEqual(delRes.status, 200);
  const check = db.prepare('SELECT * FROM enquiries WHERE id = ?;').get(id);
  assert.strictEqual(check, undefined);
});
