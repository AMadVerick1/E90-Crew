// Home Page Interactions & Dynamic Content Loader

document.addEventListener("DOMContentLoaded", () => {
  initNavScroll();
  initFadeIn();
  loadLiveHomeContent();
  loadUpcomingEventsPreview();
});

// ── NAV SCROLL ────────────────────────────────────────────────
function initNavScroll() {
  const nav = document.getElementById("nav");
  if (!nav) return;
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 60);
  });
}

// ── FADE-IN OBSERVER ──────────────────────────────────────────
function initFadeIn() {
  const faders = document.querySelectorAll(".fade-in");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });

  faders.forEach(f => observer.observe(f));
}

// ── LOAD LIVE SITE CONTENT FROM DATABASE ──────────────────────
async function loadLiveHomeContent() {
  try {
    const res = await fetch("/api/content/site");
    if (!res.ok) return;
    const data = await res.json();
    const cnt = data.content || {};

    // Hero
    const heroTitle = document.getElementById("home-hero-title");
    if (heroTitle && cnt.hero_title) heroTitle.textContent = cnt.hero_title;

    const heroSubtitle = document.getElementById("home-hero-subtitle");
    if (heroSubtitle && cnt.hero_subtitle) heroSubtitle.textContent = cnt.hero_subtitle;

    // The Crew
    const crewTitle = document.getElementById("home-crew-title");
    if (crewTitle && cnt.crew_title) crewTitle.textContent = cnt.crew_title;

    const crewDesc = document.getElementById("home-crew-desc");
    if (crewDesc && cnt.crew_desc) crewDesc.textContent = cnt.crew_desc;

    // Our Drive
    const driveTitle = document.getElementById("home-drive-title");
    if (driveTitle && cnt.drive_title) driveTitle.textContent = cnt.drive_title;

    const driveDesc = document.getElementById("home-drive-desc");
    if (driveDesc && cnt.drive_desc) driveDesc.textContent = cnt.drive_desc;

    // CTA
    const ctaTitle = document.getElementById("home-cta-title");
    if (ctaTitle && cnt.cta_title) ctaTitle.textContent = cnt.cta_title;

    const ctaDesc = document.getElementById("home-cta-desc");
    if (ctaDesc && cnt.cta_desc) ctaDesc.textContent = cnt.cta_desc;

  } catch (err) {
    console.warn("Could not load dynamic site content, fallback retained:", err);
  }
}

// ── LOAD FEATURED CONVOYS PREVIEW ─────────────────────────────
async function loadUpcomingEventsPreview() {
  const container = document.getElementById("home-events-grid");
  if (!container) return;

  try {
    const res = await fetch("/api/events");
    if (!res.ok) return;
    const data = await res.json();
    const events = (data.events || []).slice(0, 3); // top 3 live events

    if (events.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--muted); padding: 2rem;">
          No live convoys scheduled right now. Check back soon!
        </div>
      `;
      return;
    }

    container.innerHTML = events.map(ev => {
      const formattedDate = formatEventDate(ev.date);
      const badge = ev.type ? ev.type.toUpperCase() : "RUN";
      const banner = ev.image_url || "../Assets/IMG-20260406-WA0000.jpg";

      return `
        <div class="home-event-card">
          <img class="home-event-card__img" src="${escapeHtml(banner)}" alt="${escapeHtml(ev.title)}">
          <div class="home-event-card__body">
            <span class="home-event-card__badge">${escapeHtml(badge)}</span>
            <h3 class="home-event-card__title">${escapeHtml(ev.title)}</h3>
            <p style="font-size: 0.8rem; color: var(--muted); line-height: 1.6; margin-bottom: 0.8rem;">
              ${escapeHtml(truncate(ev.desc || "E90 community convoy.", 70))}
            </p>
            <div class="home-event-card__meta">
              <span>📅 ${formattedDate}</span>
              <span>📍 ${escapeHtml(ev.location)}</span>
            </div>
          </div>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.warn("Could not load events preview:", err);
  }
}

function formatEventDate(iso) {
  if (!iso || iso === "TBC") return "TBC";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

function truncate(str, n = 70) {
  return str && str.length > n ? str.slice(0, n) + "…" : str || "";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
