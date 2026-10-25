// ── STATE & API CONFIG ──────────────────────────────────────
const API_BASE = '/api';

let currentUser = null;
let currentFilter = { memberships: 'all', drivers: 'all', causes: 'all', general: 'all' };
let searchQuery = { memberships: '', drivers: '', causes: '', general: '' };

let db = {
  events: [],
  memberships: [],
  drivers: [],
  causes: [],
  general: [],
  siteContent: {},
  vibes: [],
  perks: [],
  stats: {}
};

// Unified fetch with Auth header
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('e90_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { credentials: 'include', ...options, headers });
    if (res.status === 401) {
      currentUser = null;
      document.getElementById('login-overlay').classList.remove('hidden');
      throw new Error('Authentication required');
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  } catch (err) {
    if (err.message !== 'Authentication required') {
      console.error(`API Error [${endpoint}]:`, err);
    }
    throw err;
  }
}

// ── AUTHENTICATION ──────────────────────────────────────────
async function checkAuth() {
  try {
    const res = await apiFetch('/auth/me');
    currentUser = res.user;
    updateUserUI();
    document.getElementById('login-overlay').classList.add('hidden');
    fetchAllData();
  } catch (err) {
    document.getElementById('login-overlay').classList.remove('hidden');
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-submit-btn');
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  errorEl.style.display = 'none';
  btn.textContent = 'Authenticating…';
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    if (data.token) {
      localStorage.setItem('e90_token', data.token);
    }
    currentUser = data.user;
    updateUserUI();
    document.getElementById('login-overlay').classList.add('hidden');
    toast(`Welcome back, ${currentUser.username}!`);
    fetchAllData();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  } finally {
    btn.textContent = 'Unlock Dashboard';
    btn.disabled = false;
  }
}

async function handleLogout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch (e) {
    // proceed regardless
  }
  localStorage.removeItem('e90_token');
  currentUser = null;
  document.getElementById('login-overlay').classList.remove('hidden');
  toast('Logged out successfully');
}

function updateUserUI() {
  if (currentUser) {
    document.getElementById('sidebar-username').textContent = currentUser.username;
    document.getElementById('sidebar-avatar').textContent = currentUser.username.slice(0, 3).toUpperCase();
  }
}

// ── DATA FETCHING ───────────────────────────────────────────
async function fetchAllData() {
  try {
    const [statsRes, eventsRes, enquiriesRes, contentRes, vibesRes, perksRes] = await Promise.all([
      apiFetch('/stats'),
      apiFetch('/events?all=true'),
      apiFetch('/enquiries'),
      apiFetch('/content/site'),
      apiFetch('/content/vibes'),
      apiFetch('/content/perks')
    ]);

    db.stats = statsRes;
    db.events = eventsRes.events || [];
    
    // Split enquiries by type
    const enquiries = enquiriesRes.enquiries || [];
    db.memberships = enquiries.filter(e => e.type === 'membership');
    db.drivers = enquiries.filter(e => e.type === 'driver');
    db.causes = enquiries.filter(e => e.type === 'cause');
    db.general = enquiries.filter(e => e.type === 'general');

    db.siteContent = contentRes.content || {};
    db.vibes = vibesRes.vibes || [];
    db.perks = perksRes.perks || [];

    renderAll();
  } catch (err) {
    console.error('Failed to fetch data:', err);
  }
}

// ── NAVIGATION ──────────────────────────────────────────────
const pageTitles = {
  dashboard: 'Dashboard',
  events: 'Public Events Management',
  content: 'Site Details & Content Editor',
  memberships: 'Membership Applications',
  drivers: 'Charity Driver Applications',
  causes: 'Cause Submissions',
  general: 'General Enquiries'
};

document.querySelectorAll('.sidebar__link[data-page]').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    document.querySelectorAll('.sidebar__link').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    document.getElementById('page-title').textContent = pageTitles[page] || page;

    // topbar action
    const topBtn = document.getElementById('topbar-action');
    if (page === 'events') {
      topBtn.style.display = 'flex';
      topBtn.innerHTML = '<svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:var(--dark);fill:none;stroke-width:2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Event';
      topBtn.onclick = openAddEventModal;
    } else if (page === 'content') {
      topBtn.style.display = 'flex';
      topBtn.innerHTML = '<svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:var(--dark);fill:none;stroke-width:2.5"><polyline points="20 6 9 17 4 12"/></svg> Save Texts';
      topBtn.onclick = saveSiteContent;
    } else {
      topBtn.style.display = 'none';
    }
  });
});

// Date display
const dateEl = document.getElementById('today-date');
if (dateEl) {
  dateEl.textContent = new Date().toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

// ── FORMATTERS & HELPERS ────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(t) {
  if (!t) return '—';
  const parts = t.split(':');
  if (parts.length < 2) return t;
  const hr = parseInt(parts[0], 10);
  const m = parts[1];
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

function statusPill(s) {
  const map = { new: 'new', approved: 'approved', pending: 'pending', declined: 'declined' };
  const label = { new: 'New', approved: 'Approved', pending: 'In Review', declined: 'Declined' };
  return `<span class="pill ${map[s] || 'new'}">${label[s] || s}</span>`;
}

function typePill(t) {
  const types = { run: 'run', charity: 'charity', track: 'track', social: 'social', membership: 'run', driver: 'charity', cause: 'track', general: 'social' };
  const display = { membership: 'Membership', driver: 'Driver', cause: 'Cause', general: 'General', charity: 'Charity', run: 'Run', track: 'Track', social: 'Social' };
  return `<span class="pill ${types[t] || 'run'}">${display[t] || t}</span>`;
}

function truncate(str, n = 55) {
  return str && str.length > n ? str.slice(0, n) + '…' : str || '—';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── DASHBOARD ───────────────────────────────────────────────
function renderDashboard() {
  const newM = db.memberships.filter(x => x.status === 'new').length;
  const newD = db.drivers.filter(x => x.status === 'new').length;
  const newC = db.causes.filter(x => x.status === 'new').length;
  const newG = db.general.filter(x => x.status === 'new').length;
  
  document.getElementById('stat-total').textContent = newM + newD + newC + newG;
  document.getElementById('stat-members').textContent = newM;
  document.getElementById('stat-drivers').textContent = newD;
  document.getElementById('stat-events').textContent = db.events.filter(e => e.is_published).length;

  // Recent enquiries across all categories
  const all = [
    ...db.memberships.map(x => ({ ...x, _category: 'memberships' })),
    ...db.drivers.map(x => ({ ...x, _category: 'drivers' })),
    ...db.causes.map(x => ({ ...x, _category: 'causes' })),
    ...db.general.map(x => ({ ...x, _category: 'general' }))
  ].sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date)).slice(0, 8);

  const tbody = document.getElementById('recent-table');
  if (!all.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No enquiry activity yet</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = all.map(r => `
    <tr onclick="openAppDetail('${r._category}','${r.id}')" style="cursor:pointer">
      <td><strong>${escapeHtml(r.name)}</strong></td>
      <td>${typePill(r.type)}</td>
      <td class="muted">${escapeHtml(truncate(r.message, 50))}</td>
      <td class="mono">${formatDate(r.created_at || r.date)}</td>
      <td>${statusPill(r.status)}</td>
      <td>
        <div class="td-actions">
          ${r.status === 'new' ? `
            <button class="btn-sm success" onclick="event.stopPropagation();updateStatus('${r._category}','${r.id}','approved')">Approve</button>
            <button class="btn-sm danger" onclick="event.stopPropagation();updateStatus('${r._category}','${r.id}','declined')">Decline</button>
          ` : `<button class="btn-sm" onclick="event.stopPropagation();openAppDetail('${r._category}','${r.id}')">View</button>`}
        </div>
      </td>
    </tr>
  `).join('');
}

// ── EVENTS CRUD ─────────────────────────────────────────────
function renderEvents() {
  const grid = document.getElementById('events-grid');
  document.getElementById('events-count').textContent = db.events.length + ' events in database';
  document.getElementById('badge-events').textContent = db.events.length;

  if (!db.events.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>No events scheduled. Add your first event above.</p></div>`;
    return;
  }

  grid.innerHTML = db.events.map(ev => `
    <div class="event-admin-card">
      <div class="event-admin-card__top">
        <div class="event-admin-card__title">${escapeHtml(ev.title)}</div>
        <div style="display:flex;gap:0.4rem;align-items:center;">
          ${typePill(ev.type)}
          <span class="pill ${ev.is_published ? 'approved' : 'declined'}">${ev.is_published ? 'Live' : 'Draft'}</span>
        </div>
      </div>
      <div class="event-admin-card__meta">
        <div class="event-meta-row">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${formatDate(ev.date)}
        </div>
        <div class="event-meta-row">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${formatTime(ev.time)}
        </div>
        <div class="event-meta-row">
          <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${escapeHtml(ev.location)}
        </div>
        ${ev.spots ? `<div class="event-meta-row">
          <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          ${ev.spots} spots
        </div>` : ''}
      </div>
      ${ev.desc ? `<p style="font-size:.78rem;color:var(--muted-light);line-height:1.7">${escapeHtml(truncate(ev.desc, 90))}</p>` : ''}
      <div class="event-admin-card__footer">
        <span style="font-size:0.7rem;color:var(--muted);">${ev.image_url ? 'Has banner' : 'Default banner'}</span>
        <div class="event-admin-card__footer-actions">
          <button class="btn-sm" onclick="openEditEventModal(${ev.id})">Edit</button>
          <button class="btn-sm danger" onclick="deleteEvent(${ev.id})">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

function clearEventForm() {
  ['ev-title', 'ev-date', 'ev-time', 'ev-location', 'ev-spots', 'ev-desc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

async function saveEvent() {
  const title = document.getElementById('ev-title').value.trim();
  const type = document.getElementById('ev-type').value;
  const date = document.getElementById('ev-date').value;
  const time = document.getElementById('ev-time').value;
  const location = document.getElementById('ev-location').value.trim();
  const spots = document.getElementById('ev-spots').value;
  const image_url = document.getElementById('ev-image').value.trim();
  const is_published = parseInt(document.getElementById('ev-published').value, 10);
  const desc = document.getElementById('ev-desc').value.trim();

  if (!title || !date || !location) {
    toast('Title, date, and location are required', true);
    return;
  }

  try {
    const res = await apiFetch('/events', {
      method: 'POST',
      body: JSON.stringify({ title, type, date, time, location, spots, image_url, is_published, desc })
    });
    toast('Event published live to public site!');
    clearEventForm();
    await fetchAllData();
  } catch (err) {
    toast(err.message, true);
  }
}

async function saveEventFromModal() {
  const title = document.getElementById('m-ev-title').value.trim();
  const type = document.getElementById('m-ev-type').value;
  const date = document.getElementById('m-ev-date').value;
  const time = document.getElementById('m-ev-time').value;
  const location = document.getElementById('m-ev-location').value.trim();
  const spots = document.getElementById('m-ev-spots').value;
  const desc = document.getElementById('m-ev-desc').value.trim();

  if (!title || !date || !location) {
    toast('Title, date, and location are required', true);
    return;
  }

  try {
    await apiFetch('/events', {
      method: 'POST',
      body: JSON.stringify({ title, type, date, time, location, spots, desc, is_published: 1 })
    });
    closeModal('add-event-modal');
    toast('Event published successfully');
    await fetchAllData();
  } catch (err) {
    toast(err.message, true);
  }
}

function openEditEventModal(id) {
  const ev = db.events.find(e => e.id === id);
  if (!ev) return;

  document.getElementById('edit-ev-id').value = ev.id;
  document.getElementById('edit-ev-title').value = ev.title || '';
  document.getElementById('edit-ev-type').value = ev.type || 'run';
  document.getElementById('edit-ev-date').value = ev.date || '';
  document.getElementById('edit-ev-time').value = ev.time || '08:00';
  document.getElementById('edit-ev-location').value = ev.location || '';
  document.getElementById('edit-ev-spots').value = ev.spots || '';
  document.getElementById('edit-ev-image').value = ev.image_url || '';
  document.getElementById('edit-ev-published').value = ev.is_published ? '1' : '0';
  document.getElementById('edit-ev-desc').value = ev.desc || '';

  openModal('edit-event-modal');
}

async function updateEventFromModal() {
  const id = document.getElementById('edit-ev-id').value;
  const title = document.getElementById('edit-ev-title').value.trim();
  const type = document.getElementById('edit-ev-type').value;
  const date = document.getElementById('edit-ev-date').value;
  const time = document.getElementById('edit-ev-time').value;
  const location = document.getElementById('edit-ev-location').value.trim();
  const spots = document.getElementById('edit-ev-spots').value;
  const image_url = document.getElementById('edit-ev-image').value.trim();
  const is_published = parseInt(document.getElementById('edit-ev-published').value, 10);
  const desc = document.getElementById('edit-ev-desc').value.trim();

  if (!title || !date || !location) {
    toast('Title, date, and location are required', true);
    return;
  }

  try {
    await apiFetch(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, type, date, time, location, spots, image_url, is_published, desc })
    });
    closeModal('edit-event-modal');
    toast('Event updated successfully');
    await fetchAllData();
  } catch (err) {
    toast(err.message, true);
  }
}

async function deleteEvent(id) {
  if (!confirm('Are you sure you want to remove this event?')) return;
  try {
    await apiFetch(`/events/${id}`, { method: 'DELETE' });
    toast('Event deleted');
    await fetchAllData();
  } catch (err) {
    toast(err.message, true);
  }
}

async function deleteEventFromEditModal() {
  const id = document.getElementById('edit-ev-id').value;
  if (!id) return;
  closeModal('edit-event-modal');
  await deleteEvent(id);
}

// ── SITE CONTENT CRUD ───────────────────────────────────────
function switchContentSubpage(subpageId, btn) {
  document.querySelectorAll('.content-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.content-subpage').forEach(p => p.classList.remove('active'));
  document.getElementById('subpage-' + subpageId).classList.add('active');
}

function renderSiteContent() {
  const cnt = db.siteContent;
  for (const [key, val] of Object.entries(cnt)) {
    const el = document.getElementById(`cnt-${key}`);
    if (el) el.value = val || '';
  }

  // Render Vibes
  const vibesGrid = document.getElementById('vibes-admin-grid');
  vibesGrid.innerHTML = db.vibes.map(v => `
    <div class="vibe-manage-card">
      <div class="vibe-manage-card__top">
        <span class="vibe-manage-card__title">${escapeHtml(v.title)}</span>
        <button class="btn-sm danger" onclick="deleteVibe(${v.id})">Delete</button>
      </div>
      <p style="font-size:0.75rem;color:var(--muted-light);">${escapeHtml(v.description)}</p>
      <span style="font-size:0.65rem;color:var(--blue);text-transform:uppercase;">Icon: ${escapeHtml(v.icon || 'sun')}</span>
    </div>
  `).join('');

  // Render Perks
  const perksList = document.getElementById('perks-admin-list');
  perksList.innerHTML = db.perks.map(p => `
    <div class="perk-item">
      <span>${escapeHtml(p.text)}</span>
      <button class="btn-sm danger" onclick="deletePerk(${p.id})">Remove</button>
    </div>
  `).join('');
}

async function saveSiteContent() {
  const fields = [
    'hero_title', 'hero_subtitle', 'crew_title', 'crew_desc', 'drive_title', 'drive_desc', 'cta_title', 'cta_desc',
    'club_badge', 'club_title', 'club_p1', 'club_p2', 'mission_badge', 'mission_title', 'mission_desc',
    'contact_city', 'contact_email', 'contact_tagline'
  ];

  const payload = {};
  fields.forEach(field => {
    const el = document.getElementById(`cnt-${field}`);
    if (el) payload[field] = el.value.trim();
  });

  try {
    await apiFetch('/content/site', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    toast('Public site content saved and published live!');
    await fetchAllData();
  } catch (err) {
    toast(err.message, true);
  }
}

function openAddVibeModal() {
  document.getElementById('vibe-title').value = '';
  document.getElementById('vibe-desc').value = '';
  openModal('add-vibe-modal');
}

async function saveVibe() {
  const title = document.getElementById('vibe-title').value.trim();
  const description = document.getElementById('vibe-desc').value.trim();
  const icon = document.getElementById('vibe-icon').value;

  if (!title || !description) {
    toast('Title and description are required', true);
    return;
  }

  try {
    await apiFetch('/content/vibes', {
      method: 'POST',
      body: JSON.stringify({ title, description, icon })
    });
    closeModal('add-vibe-modal');
    toast('New vibe card published!');
    await fetchAllData();
  } catch (err) {
    toast(err.message, true);
  }
}

async function deleteVibe(id) {
  if (!confirm('Remove this vibe card?')) return;
  try {
    await apiFetch(`/content/vibes/${id}`, { method: 'DELETE' });
    toast('Vibe card removed');
    await fetchAllData();
  } catch (err) {
    toast(err.message, true);
  }
}

async function addPerk() {
  const input = document.getElementById('new-perk-input');
  const text = input.value.trim();
  if (!text) return;

  try {
    await apiFetch('/content/perks', {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    input.value = '';
    toast('Perk added');
    await fetchAllData();
  } catch (err) {
    toast(err.message, true);
  }
}

async function deletePerk(id) {
  try {
    await apiFetch(`/content/perks/${id}`, { method: 'DELETE' });
    toast('Perk removed');
    await fetchAllData();
  } catch (err) {
    toast(err.message, true);
  }
}

// ── APPLICATIONS & ENQUIRIES TABLES ─────────────────────────
function appRow(r, category) {
  return `
    <tr onclick="openAppDetail('${category}','${r.id}')" style="cursor:pointer">
      <td><strong>${escapeHtml(r.name)}</strong></td>
      <td class="muted">${escapeHtml(r.email)}</td>
      <td class="muted">${escapeHtml(truncate(r.message, 50))}</td>
      <td class="mono">${formatDate(r.created_at || r.date)}</td>
      <td>${statusPill(r.status)}</td>
      <td>
        <div class="td-actions">
          ${r.status !== 'approved' ? `<button class="btn-sm success" onclick="event.stopPropagation();updateStatus('${category}','${r.id}','approved')">Approve</button>` : ''}
          ${r.status !== 'declined' ? `<button class="btn-sm danger" onclick="event.stopPropagation();updateStatus('${category}','${r.id}','declined')">Decline</button>` : ''}
        </div>
      </td>
    </tr>
  `;
}

function handleSearch(type, val) {
  searchQuery[type] = (val || '').toLowerCase().trim();
  renderTable(type);
}

function filterTable(type, filter, btn) {
  currentFilter[type] = filter;
  btn.closest('.filter-tabs').querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderTable(type);
}

function renderTable(type) {
  const tableIdMap = {
    memberships: 'memberships-table',
    drivers: 'drivers-table',
    causes: 'causes-table',
    general: 'general-table'
  };

  const tbody = document.getElementById(tableIdMap[type]);
  if (!tbody) return;

  const filter = currentFilter[type];
  const query = searchQuery[type];
  
  let rows = db[type] || [];
  if (filter !== 'all') {
    rows = rows.filter(r => r.status === filter);
  }

  if (query) {
    rows = rows.filter(r => 
      (r.name && r.name.toLowerCase().includes(query)) ||
      (r.email && r.email.toLowerCase().includes(query)) ||
      (r.message && r.message.toLowerCase().includes(query))
    );
  }

  tbody.innerHTML = rows.length
    ? rows.map(r => appRow(r, type)).join('')
    : `<tr><td colspan="6"><div class="empty-state"><p>No ${filter === 'all' ? '' : filter + ' '}records found</p></div></td></tr>`;
}

function updateCounts() {
  const ms = db.memberships;
  document.getElementById('m-count-all').textContent = ms.length;
  document.getElementById('m-count-new').textContent = ms.filter(x => x.status === 'new').length;
  document.getElementById('m-count-approved').textContent = ms.filter(x => x.status === 'approved').length;
  document.getElementById('m-count-declined').textContent = ms.filter(x => x.status === 'declined').length;
  document.getElementById('badge-memberships').textContent = ms.filter(x => x.status === 'new').length;

  const ds = db.drivers;
  document.getElementById('d-count-all').textContent = ds.length;
  document.getElementById('d-count-new').textContent = ds.filter(x => x.status === 'new').length;
  document.getElementById('d-count-approved').textContent = ds.filter(x => x.status === 'approved').length;
  document.getElementById('d-count-declined').textContent = ds.filter(x => x.status === 'declined').length;
  document.getElementById('badge-drivers').textContent = ds.filter(x => x.status === 'new').length;

  const cs = db.causes;
  document.getElementById('c-count-all').textContent = cs.length;
  document.getElementById('c-count-new').textContent = cs.filter(x => x.status === 'new').length;
  document.getElementById('c-count-pending').textContent = cs.filter(x => x.status === 'pending').length;
  document.getElementById('c-count-approved').textContent = cs.filter(x => x.status === 'approved').length;
  document.getElementById('c-count-declined').textContent = cs.filter(x => x.status === 'declined').length;
  document.getElementById('badge-causes').textContent = cs.filter(x => x.status === 'new').length;

  const gs = db.general;
  document.getElementById('g-count-all').textContent = gs.length;
  document.getElementById('g-count-new').textContent = gs.filter(x => x.status === 'new').length;
  document.getElementById('g-count-approved').textContent = gs.filter(x => x.status === 'approved').length;
  document.getElementById('badge-general').textContent = gs.filter(x => x.status === 'new').length;
}

// ── STATUS & NOTES UPDATES ──────────────────────────────────
async function updateStatus(category, id, newStatus) {
  try {
    await apiFetch(`/enquiries/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    toast(`Application status updated to ${newStatus}`);
    closeModal('app-detail-modal');
    await fetchAllData();
  } catch (err) {
    toast(err.message, true);
  }
}

// ── APP DETAIL MODAL ────────────────────────────────────────
let currentActiveDetail = null;

function openAppDetail(category, id) {
  const item = (db[category] || []).find(x => String(x.id) === String(id));
  if (!item) return;

  currentActiveDetail = { category, id: item.id };

  const labels = {
    memberships: 'Membership Application',
    drivers: 'Charity Driver Application',
    causes: 'Cause Submission',
    general: 'General Enquiry'
  };

  const messageLabels = {
    memberships: 'Their Story',
    drivers: 'Contribution Details',
    causes: 'Cause Description',
    general: 'Enquiry Message'
  };

  document.getElementById('app-modal-title').textContent = labels[category] || 'Enquiry Detail';
  document.getElementById('app-modal-body').innerHTML = `
    <div class="app-detail-row">
      <div class="app-detail-label">Name / Org</div>
      <div class="app-detail-value"><strong>${escapeHtml(item.name)}</strong></div>
    </div>
    <div class="app-detail-row">
      <div class="app-detail-label">Email</div>
      <div class="app-detail-value"><a href="mailto:${escapeHtml(item.email)}" style="color:var(--blue)">${escapeHtml(item.email)}</a></div>
    </div>
    ${item.phone ? `
    <div class="app-detail-row">
      <div class="app-detail-label">Phone</div>
      <div class="app-detail-value">${escapeHtml(item.phone)}</div>
    </div>` : ''}
    <div class="app-detail-row">
      <div class="app-detail-label">${messageLabels[category] || 'Message'}</div>
      <div class="app-detail-value" style="white-space:pre-wrap;">${escapeHtml(item.message)}</div>
    </div>
    <div class="app-detail-row">
      <div class="app-detail-label">Received</div>
      <div class="app-detail-value">${formatDate(item.created_at || item.date)}</div>
    </div>
    <div class="app-detail-row">
      <div class="app-detail-label">Status</div>
      <div class="app-detail-value">${statusPill(item.status)}</div>
    </div>
  `;

  // Set notes input
  document.getElementById('app-admin-notes').value = item.admin_notes || '';

  // Setup action buttons
  document.getElementById('modal-approve-btn').onclick = () => updateStatus(category, item.id, 'approved');
  document.getElementById('modal-decline-btn').onclick = () => updateStatus(category, item.id, 'declined');
  
  const pendingBtn = document.getElementById('modal-pending-btn');
  if (category === 'causes' || category === 'general') {
    pendingBtn.style.display = 'block';
    pendingBtn.onclick = () => updateStatus(category, item.id, 'pending');
  } else {
    pendingBtn.style.display = 'none';
  }

  openModal('app-detail-modal');
}

async function saveAdminNotes() {
  if (!currentActiveDetail) return;
  const notes = document.getElementById('app-admin-notes').value.trim();
  try {
    await apiFetch(`/enquiries/${currentActiveDetail.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ admin_notes: notes })
    });
    toast('Admin notes saved');
    await fetchAllData();
  } catch (err) {
    toast(err.message, true);
  }
}

async function deleteCurrentEnquiry() {
  if (!currentActiveDetail) return;
  if (!confirm('Are you sure you want to permanently delete this application record?')) return;
  try {
    await apiFetch(`/enquiries/${currentActiveDetail.id}`, { method: 'DELETE' });
    closeModal('app-detail-modal');
    toast('Enquiry record deleted');
    await fetchAllData();
  } catch (err) {
    toast(err.message, true);
  }
}

// ── MODALS & TOAST ──────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function openAddEventModal() {
  openModal('add-event-modal');
}

document.querySelectorAll('.modal-backdrop').forEach(m => {
  m.addEventListener('click', (e) => {
    if (e.target === m) m.classList.remove('open');
  });
});

function toast(msg, error = false) {
  const stack = document.getElementById('toast-stack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = 'toast' + (error ? ' error' : '');
  el.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="${error ? '18 6 6 18 M6 6 18 18' : '20 6 9 17 4 12'}"/></svg><span>${escapeHtml(msg)}</span>`;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── RENDER ALL ──────────────────────────────────────────────
function renderAll() {
  renderDashboard();
  renderEvents();
  renderSiteContent();
  renderTable('memberships');
  renderTable('drivers');
  renderTable('causes');
  renderTable('general');
  updateCounts();
}

// ── INITIALIZATION ──────────────────────────────────────────
checkAuth();
