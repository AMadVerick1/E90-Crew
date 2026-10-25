// About & Crew Page Interactions and Dynamic Live Content

document.addEventListener("DOMContentLoaded", () => {
  initNavScroll();
  initIntersectionObserver();
  initParallax();
  loadLiveAboutData();
});

// ── NAV SCROLL ────────────────────────────────────────────────
function initNavScroll() {
  const nav = document.getElementById("nav");
  if (!nav) return;
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 60);
  });
}

// ── PARALLAX ──────────────────────────────────────────────────
function initParallax() {
  const road = document.querySelector(".parallax-road");
  if (!road) return;
  window.addEventListener("scroll", () => {
    road.style.transform = `translateX(-${window.scrollY * 0.3}px)`;
  });
}

// ── FADE-IN OBSERVER ──────────────────────────────────────────
function initIntersectionObserver() {
  const faders = document.querySelectorAll(".fade-in");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  faders.forEach(f => observer.observe(f));
}

// ── DYNAMIC LIVE DATA FROM BACKEND ────────────────────────────
async function loadLiveAboutData() {
  try {
    await Promise.all([
      loadSiteTexts(),
      loadVibes(),
      loadLiveEvents()
    ]);
  } catch (err) {
    console.warn("Using default static content fallback:", err);
  }
}

// 1. Live Site Content (Club History & Mission)
async function loadSiteTexts() {
  const res = await fetch("/api/content/site");
  if (!res.ok) return;
  const data = await res.json();
  const cnt = data.content || {};

  const badgeEl = document.getElementById("about-club-badge");
  if (badgeEl && cnt.club_badge) badgeEl.textContent = cnt.club_badge;

  const p1El = document.getElementById("about-club-p1");
  if (p1El && cnt.club_p1) p1El.textContent = cnt.club_p1;

  const p2El = document.getElementById("about-club-p2");
  if (p2El && cnt.club_p2) p2El.textContent = cnt.club_p2;

  const missionBadgeEl = document.getElementById("about-mission-badge");
  if (missionBadgeEl && cnt.mission_badge) missionBadgeEl.textContent = cnt.mission_badge;

  const missionDescEl = document.getElementById("about-mission-desc");
  if (missionDescEl && cnt.mission_desc) missionDescEl.textContent = cnt.mission_desc;
}

// 2. Live Vibes Cards
const ICON_SVGS = {
  sun: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`,
  heart: `<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  headphones: `<svg viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
  award: `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
};

async function loadVibes() {
  const container = document.getElementById("public-vibes-grid");
  if (!container) return;

  const res = await fetch("/api/content/vibes");
  if (!res.ok) return;
  const data = await res.json();
  const vibes = data.vibes || [];

  if (vibes.length > 0) {
    container.innerHTML = vibes.map(vibe => {
      const iconSvg = ICON_SVGS[vibe.icon] || ICON_SVGS.sun;
      return `
        <div class="vibe-card">
          <div class="vibe-card__icon">
            ${iconSvg}
          </div>
          <h2>${escapeHtml(vibe.title)}</h2>
          <p>${escapeHtml(vibe.description)}</p>
        </div>
      `;
    }).join("");
  }
}

// 3. Live Events from Database
async function loadLiveEvents() {
  const grid = document.getElementById("public-events-grid");
  if (!grid) return;

  const res = await fetch("/api/events");
  if (!res.ok) return;
  const data = await res.json();
  const events = data.events || [];

  if (events.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--muted);">
        <p>No upcoming events currently scheduled. Check back soon or join our community WhatsApp!</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = events.map(ev => {
    const formattedDate = formatEventDate(ev.date);
    const formattedTime = formatEventTime(ev.time);
    const badgeName = ev.type ? ev.type.charAt(0).toUpperCase() + ev.type.slice(1) : "Run";
    const banner = ev.image_url || "../Assets/IMG-20260406-WA0000.jpg";

    return `
      <div class="event-card">
        <div class="event-card__img-wrap">
          <img class="event-card__img" src="${escapeHtml(banner)}" alt="${escapeHtml(ev.title)}">
          <span class="event-card__badge">${escapeHtml(badgeName)}</span>
        </div>
        <div class="event-card__body">
          <h3 class="event-card__title">${escapeHtml(ev.title)}</h3>
          <p class="event-card__desc">
            ${escapeHtml(ev.desc || "E90 Social Club official convoy meetup. Respect the road, enjoy the machines.")}
          </p>
          <div class="event-card__meta">
            <div class="event-meta-item">
              <span class="event-meta-item__label">Time</span>
              <span class="event-meta-item__value">${formattedTime}</span>
            </div>
            <div class="event-meta-item">
              <span class="event-meta-item__label">Date</span>
              <span class="event-meta-item__value">${formattedDate}</span>
            </div>
            <div class="event-meta-item">
              <span class="event-meta-item__label">Location</span>
              <span class="event-meta-item__value">${escapeHtml(ev.location)}</span>
            </div>
          </div>
          <div style="margin-top: 1.2rem; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.72rem; color: #00aaff; font-family: 'Orbitron', sans-serif;">
              ${ev.spots ? `${ev.spots} SPOTS` : "OPEN CONVOY"}
            </span>
            <a href="contact.html" style="font-size: 0.75rem; color: #fff; text-decoration: none; border-bottom: 1px solid #00aaff; padding-bottom: 2px; text-transform: uppercase; letter-spacing: 1px;">
              Join Convoy →
            </a>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function formatEventDate(iso) {
  if (!iso || iso === "TBC") return "TBC";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

function formatEventTime(t) {
  if (!t) return "08:00 AM";
  const parts = t.split(":");
  if (parts.length < 2) return t;
  const hr = parseInt(parts[0], 10);
  const m = parts[1];
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
