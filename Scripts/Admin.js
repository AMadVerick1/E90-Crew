// ── DATA STORE ───────────────────────────────────────
const STORAGE_KEY = 'e90_admin_data';

const defaultData = {
  events: [
    { id: 1, title: "Charity Drive", type: "charity", date: "2026-06-21", time: "09:00", location: "Sizanani Village", spots: 30, desc: "Bringing the convoy to communities that need it most. Show up, give back, drive home different." },
    { id: 2, title: "Sunrise Run", type: "run", date: "2026-07-05", time: "05:30", location: "Johannesburg", spots: 20, desc: "Pre-dawn meetup. Cold engines, warm coffee, open road." },
    { id: 3, title: "Kyalami Day", type: "track", date: "2026-08-10", time: "08:00", location: "Kyalami Circuit", spots: 15, desc: "The circuit, the cars, the crew. One afternoon on track." }
  ],
  memberships: [
    { id: 1, name: "Sipho Ndlovu", email: "sipho@email.com", story: "Had my E90 for 6 years. First car I've ever felt truly connected to. Been following the club for a while — ready to ride.", date: "2026-04-22", status: "new" },
    { id: 2, name: "Ayesha Patel", email: "ayesha@email.com", story: "325i owner, track day enthusiast. Looking for a crew that actually knows the car.", date: "2026-04-20", status: "new" },
    { id: 3, name: "Luca van der Berg", email: "luca@email.com", story: "My dad had an E90 330i. I just bought mine. Full circle.", date: "2026-04-18", status: "new" },
    { id: 4, name: "Thabo Mokoena", email: "thabo@email.com", story: "320d daily driver. Looking for a community.", date: "2026-04-10", status: "approved" },
    { id: 5, name: "Priya Singh", email: "priya@email.com", story: "Not an E90 owner yet but saving up. Want in early.", date: "2026-04-05", status: "declined" }
  ],
  drivers: [
    { id: 1, name: "Mandla Khumalo", email: "mandla@email.com", contribution: "330i Sport with roof rack — can carry supplies. Available weekends. Happy to co-organise logistics.", date: "2026-04-21", status: "new" },
    { id: 2, name: "Jess Ferreira", email: "jess@email.com", contribution: "320i — available any Saturday. Also have photography skills to document the drive.", date: "2026-04-19", status: "new" }
  ],
  causes: [
    { id: 1, name: "Sizanani Children's Village", email: "admin@sizanani.org.za", cause: "We support 80+ orphaned children in Bapsfontein. Urgently need non-perishable food, blankets, and stationery. Could host the convoy as a collection point.", date: "2026-04-23", status: "new" },
    { id: 2, name: "Diepsloot Youth Hub", email: "info@dyh.co.za", cause: "Skills development centre for youth aged 16–24. Looking for mentors and resources. Would love the visibility a convoy brings.", date: "2026-04-17", status: "pending" },
    { id: 3, name: "Zanele Dlamini", email: "zanele@email.com", cause: "Raising funds for my nephew's rare disease treatment. Any support — awareness or fundraising — would mean everything.", date: "2026-04-15", status: "new" }
  ]
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(defaultData));
  } catch { return JSON.parse(JSON.stringify(defaultData)); }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let db = loadData();

// ── NAVIGATION ───────────────────────────────────────
const pageTitles = {
  dashboard: 'Dashboard',
  events: 'Events',
  memberships: 'Membership Applications',
  drivers: 'Charity Driver Applications',
  causes: 'Cause Submissions'
};

document.querySelectorAll('.sidebar__link[data-page]').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    document.querySelectorAll('.sidebar__link').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    document.getElementById('page-title').textContent = pageTitles[page];
    // topbar action
    const topBtn = document.getElementById('topbar-action');
    if (page === 'events') {
      topBtn.style.display = 'flex';
      topBtn.textContent = '';
      topBtn.innerHTML = '<svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:var(--dark);fill:none;stroke-width:2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Event';
      topBtn.onclick = openAddEventModal;
    } else {
      topBtn.style.display = 'none';
    }
  });
});

// ── DATE ─────────────────────────────────────────────
const dateEl = document.getElementById('today-date');
dateEl.textContent = new Date().toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

// ── RENDER HELPERS ───────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

function statusPill(s) {
  const map = { new: 'new', approved: 'approved', pending: 'pending', declined: 'declined' };
  const label = { new: 'New', approved: 'Approved', pending: 'In Review', declined: 'Declined' };
  return `<span class="pill ${map[s] || 'new'}">${label[s] || s}</span>`;
}

function typePill(t) {
  return `<span class="pill ${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</span>`;
}

function truncate(str, n = 60) {
  return str && str.length > n ? str.slice(0, n) + '…' : str || '—';
}

// ── DASHBOARD ────────────────────────────────────────
function renderDashboard() {
  const newM = db.memberships.filter(x => x.status === 'new').length;
  const newD = db.drivers.filter(x => x.status === 'new').length;
  const newC = db.causes.filter(x => x.status === 'new').length;
  document.getElementById('stat-total').textContent = newM + newD + newC;
  document.getElementById('stat-members').textContent = newM;
  document.getElementById('stat-drivers').textContent = newD;
  document.getElementById('stat-events').textContent = db.events.length;

  // recent = last 8 across all types
  const all = [
    ...db.memberships.map(x => ({ ...x, _type: 'Membership', _msg: x.story })),
    ...db.drivers.map(x => ({ ...x, _type: 'Driver', _msg: x.contribution })),
    ...db.causes.map(x => ({ ...x, _type: 'Cause', _msg: x.cause }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  const tbody = document.getElementById('recent-table');
  tbody.innerHTML = all.map(r => `
    <tr onclick="openAppDetail('${r._type.toLowerCase()}','${r.id}')">
      <td><strong>${r.name}</strong></td>
      <td>${typePill(r._type === 'Membership' ? 'run' : r._type === 'Driver' ? 'charity' : 'track').replace(r._type === 'Membership' ? 'run' : r._type === 'Driver' ? 'charity' : 'track', r._type)}</td>
      <td class="muted">${truncate(r._msg, 55)}</td>
      <td class="mono">${formatDate(r.date)}</td>
      <td>${statusPill(r.status)}</td>
      <td><div class="td-actions">
        ${r.status === 'new' ? `<button class="btn-sm success" onclick="event.stopPropagation();updateStatus('${r._type.toLowerCase()}','${r.id}','approved')">Approve</button>
        <button class="btn-sm danger" onclick="event.stopPropagation();updateStatus('${r._type.toLowerCase()}','${r.id}','declined')">Decline</button>` : ''}
      </div></td>
    </tr>`).join('');
}

// fix recent table type pills
function renderRecentTable() {
  const all = [
    ...db.memberships.map(x => ({ ...x, _type: 'membership', _label: 'Membership', _msg: x.story })),
    ...db.drivers.map(x => ({ ...x, _type: 'driver', _label: 'Driver', _msg: x.contribution })),
    ...db.causes.map(x => ({ ...x, _type: 'cause', _label: 'Cause', _msg: x.cause }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  const tbody = document.getElementById('recent-table');
  tbody.innerHTML = all.map(r => `
    <tr onclick="openAppDetail('${r._type}','${r.id}')">
      <td><strong>${r.name}</strong></td>
      <td>${typePill(r._type === 'membership' ? 'run' : r._type === 'driver' ? 'charity' : 'social')}</td>
      <td class="muted">${truncate(r._msg, 55)}</td>
      <td class="mono">${formatDate(r.date)}</td>
      <td>${statusPill(r.status)}</td>
      <td><div class="td-actions">
        ${r.status === 'new' || r.status === 'pending' ? `
        <button class="btn-sm success" onclick="event.stopPropagation();updateStatus('${r._type}','${r.id}','approved')">Approve</button>
        <button class="btn-sm danger" onclick="event.stopPropagation();updateStatus('${r._type}','${r.id}','declined')">Decline</button>` : ''}
      </div></td>
    </tr>`).join('');
}

// ── EVENTS ───────────────────────────────────────────
function renderEvents() {
  const grid = document.getElementById('events-grid');
  document.getElementById('events-count').textContent = db.events.length + ' events';
  document.getElementById('badge-events').textContent = db.events.length;
  document.getElementById('stat-events').textContent = db.events.length;

  if (!db.events.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>No events yet — add your first one above</p></div>`;
    return;
  }

  grid.innerHTML = db.events.map(ev => `
    <div class="event-admin-card">
      <div class="event-admin-card__top">
        <div class="event-admin-card__title">${ev.title}</div>
        ${typePill(ev.type)}
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
          ${ev.location}
        </div>
        ${ev.spots ? `<div class="event-meta-row">
          <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          ${ev.spots} spots
        </div>` : ''}
      </div>
      ${ev.desc ? `<p style="font-size:.78rem;color:var(--muted-light);line-height:1.7">${truncate(ev.desc, 90)}</p>` : ''}
      <div class="event-admin-card__footer">
        <span class="pill approved">Live</span>
        <div class="event-admin-card__footer-actions">
          <button class="btn-sm" onclick="editEvent(${ev.id})">Edit</button>
          <button class="btn-sm danger" onclick="deleteEvent(${ev.id})">Delete</button>
        </div>
      </div>
    </div>`).join('');
}

function clearEventForm() {
  ['ev-title','ev-date','ev-time','ev-location','ev-spots','ev-desc'].forEach(id => document.getElementById(id).value = '');
}

function getEventFormData(prefix = 'ev') {
  return {
    title: document.getElementById(`${prefix}-title`).value.trim(),
    type: document.getElementById(`${prefix}-type`).value,
    date: document.getElementById(`${prefix}-date`).value,
    time: document.getElementById(`${prefix}-time`).value,
    location: document.getElementById(`${prefix}-location`).value.trim(),
    spots: document.getElementById(`${prefix}-spots`).value,
    desc: document.getElementById(`${prefix}-desc`).value.trim()
  };
}

function saveEvent() {
  const data = getEventFormData('ev');
  if (!data.title || !data.date) { toast('Title and date are required', true); return; }
  data.id = Date.now();
  db.events.push(data);
  saveData(db);
  clearEventForm();
  renderEvents();
  toast('Event published successfully');
}

function saveEventFromModal() {
  const data = getEventFormData('m-ev');
  if (!data.title || !data.date) { toast('Title and date are required', true); return; }
  data.id = Date.now();
  db.events.push(data);
  saveData(db);
  closeModal('add-event-modal');
  ['m-ev-title','m-ev-date','m-ev-time','m-ev-location','m-ev-spots','m-ev-desc'].forEach(id => document.getElementById(id).value = '');
  renderEvents();
  toast('Event published successfully');
}

function deleteEvent(id) {
  db.events = db.events.filter(e => e.id !== id);
  saveData(db);
  renderEvents();
  toast('Event removed');
}

function editEvent(id) {
  const ev = db.events.find(e => e.id === id);
  if (!ev) return;
  document.getElementById('ev-title').value = ev.title;
  document.getElementById('ev-type').value = ev.type;
  document.getElementById('ev-date').value = ev.date;
  document.getElementById('ev-time').value = ev.time;
  document.getElementById('ev-location').value = ev.location;
  document.getElementById('ev-spots').value = ev.spots;
  document.getElementById('ev-desc').value = ev.desc;
  db.events = db.events.filter(e => e.id !== id);
  saveData(db);
  renderEvents();
  // scroll to form
  document.getElementById('page-events').scrollTo({ top: 0, behavior: 'smooth' });
  toast('Event loaded for editing — republish when done');
}

// ── APPLICATIONS TABLES ──────────────────────────────
let currentFilter = { memberships: 'all', drivers: 'all', causes: 'all' };

function appRow(r, type, msgField, label) {
  return `<tr onclick="openAppDetail('${type}','${r.id}')">
    <td><strong>${r.name}</strong></td>
    <td class="muted">${r.email}</td>
    <td class="muted">${truncate(r[msgField], 50)}</td>
    <td class="mono">${formatDate(r.date)}</td>
    <td>${statusPill(r.status)}</td>
    <td><div class="td-actions">
      ${r.status !== 'approved' ? `<button class="btn-sm success" onclick="event.stopPropagation();updateStatus('${type}','${r.id}','approved')">Approve</button>` : ''}
      ${r.status !== 'declined' ? `<button class="btn-sm danger" onclick="event.stopPropagation();updateStatus('${type}','${r.id}','declined')">Decline</button>` : ''}
    </div></td>
  </tr>`;
}

function renderTable(type) {
  const configs = {
    memberships: { msgField: 'story', tableId: 'memberships-table' },
    drivers:     { msgField: 'contribution', tableId: 'drivers-table' },
    causes:      { msgField: 'cause', tableId: 'causes-table' }
  };
  const { msgField, tableId } = configs[type];
  const filter = currentFilter[type];
  const rows = filter === 'all' ? db[type] : db[type].filter(r => r.status === filter);
  const tbody = document.getElementById(tableId);
  tbody.innerHTML = rows.length
    ? rows.map(r => appRow(r, type, msgField)).join('')
    : `<tr><td colspan="6"><div class="empty-state"><p>No ${filter === 'all' ? '' : filter + ' '}applications</p></div></td></tr>`;
  updateCounts();
}

function filterTable(type, filter, btn) {
  currentFilter[type] = filter;
  btn.closest('.filter-tabs').querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderTable(type);
}

function updateCounts() {
  const ms = db.memberships;
  document.getElementById('m-count-all').textContent = ms.length;
  document.getElementById('m-count-new').textContent = ms.filter(x=>x.status==='new').length;
  document.getElementById('m-count-approved').textContent = ms.filter(x=>x.status==='approved').length;
  document.getElementById('m-count-declined').textContent = ms.filter(x=>x.status==='declined').length;
  document.getElementById('badge-memberships').textContent = ms.filter(x=>x.status==='new').length;

  const ds = db.drivers;
  document.getElementById('d-count-all').textContent = ds.length;
  document.getElementById('d-count-new').textContent = ds.filter(x=>x.status==='new').length;
  document.getElementById('d-count-approved').textContent = ds.filter(x=>x.status==='approved').length;
  document.getElementById('badge-drivers').textContent = ds.filter(x=>x.status==='new').length;

  const cs = db.causes;
  document.getElementById('c-count-all').textContent = cs.length;
  document.getElementById('c-count-new').textContent = cs.filter(x=>x.status==='new').length;
  document.getElementById('c-count-pending').textContent = cs.filter(x=>x.status==='pending').length;
  document.getElementById('c-count-approved').textContent = cs.filter(x=>x.status==='approved').length;
  document.getElementById('badge-causes').textContent = cs.filter(x=>x.status==='new').length;
}

// ── STATUS UPDATE ────────────────────────────────────
function updateStatus(type, id, newStatus) {
  const collection = type === 'memberships' ? db.memberships
    : type === 'drivers' ? db.drivers
    : type === 'causes' ? db.causes
    : type === 'membership' ? db.memberships
    : type === 'driver' ? db.drivers
    : db.causes;

  const key = ['membership','driver','cause'].includes(type)
    ? (type === 'membership' ? 'memberships' : type === 'driver' ? 'drivers' : 'causes')
    : type;

  const item = db[key].find(x => String(x.id) === String(id));
  if (item) {
    item.status = newStatus;
    saveData(db);
    renderAll();
    toast(`Application ${newStatus}`);
    closeModal('app-detail-modal');
  }
}

// ── APP DETAIL MODAL ─────────────────────────────────
let currentAppModal = null;

function openAppDetail(type, id) {
  const key = type === 'membership' ? 'memberships' : type === 'driver' ? 'drivers' : type === 'cause' ? 'causes' : type;
  const item = db[key].find(x => String(x.id) === String(id));
  if (!item) return;
  currentAppModal = { type: key, id };

  const labels = { memberships: 'Membership Application', drivers: 'Driver Application', causes: 'Cause Submission' };
  const msgFields = { memberships: ['story', 'Their Story'], drivers: ['contribution', 'Contribution'], causes: ['cause', 'Their Cause'] };

  document.getElementById('app-modal-title').textContent = labels[key];
  document.getElementById('app-modal-body').innerHTML = `
    <div class="app-detail-row">
      <div class="app-detail-label">Name</div>
      <div class="app-detail-value">${item.name}</div>
    </div>
    <div class="app-detail-row">
      <div class="app-detail-label">Email</div>
      <div class="app-detail-value"><a href="mailto:${item.email}" style="color:var(--blue)">${item.email}</a></div>
    </div>
    <div class="app-detail-row">
      <div class="app-detail-label">${msgFields[key][1]}</div>
      <div class="app-detail-value">${item[msgFields[key][0]]}</div>
    </div>
    <div class="app-detail-row">
      <div class="app-detail-label">Received</div>
      <div class="app-detail-value">${formatDate(item.date)}</div>
    </div>
    <div class="app-detail-row">
      <div class="app-detail-label">Status</div>
      <div class="app-detail-value">${statusPill(item.status)}</div>
    </div>`;

  document.getElementById('modal-approve-btn').onclick = () => updateStatus(key, id, 'approved');
  document.getElementById('modal-decline-btn').onclick = () => updateStatus(key, id, 'declined');

  const approved = item.status === 'approved';
  const declined = item.status === 'declined';
  document.getElementById('modal-approve-btn').style.display = approved ? 'none' : '';
  document.getElementById('modal-decline-btn').style.display = declined ? 'none' : '';

  openModal('app-detail-modal');
}

// ── MODALS ───────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function openAddEventModal() { openModal('add-event-modal'); }

document.querySelectorAll('.modal-backdrop').forEach(m => {
  m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); });
});

// ── TOAST ────────────────────────────────────────────
function toast(msg, error = false) {
  const stack = document.getElementById('toast-stack');
  const el = document.createElement('div');
  el.className = 'toast' + (error ? ' error' : '');
  el.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="${error ? '18 6 6 18 M6 6 18 18' : '20 6 9 17 4 12'}"/></svg><span>${msg}</span>`;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── RENDER ALL ───────────────────────────────────────
function renderAll() {
  renderDashboard();
  renderRecentTable();
  renderEvents();
  renderTable('memberships');
  renderTable('drivers');
  renderTable('causes');
  updateCounts();
}

// ── INIT ─────────────────────────────────────────────
renderAll();
document.getElementById('topbar-action').style.display = 'none'; // hidden on dashboard