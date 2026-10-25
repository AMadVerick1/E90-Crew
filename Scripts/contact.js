// Contact & Join Page Interactions for E90 Social Club

document.addEventListener("DOMContentLoaded", () => {
  initNavScroll();
  initFadeIn();
  initFormSubmissions();
  fetchDynamicPerks();
});

// ── NAV SCROLL EFFECT ─────────────────────────────────────────
function initNavScroll() {
  const nav = document.getElementById("nav");
  if (!nav) return;
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 60);
  });
}

// ── INTERSECTION OBSERVER FADE-IN ─────────────────────────────
function initFadeIn() {
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

// ── DYNAMIC MEMBERSHIP PERKS ──────────────────────────────────
async function fetchDynamicPerks() {
  const perksContainer = document.querySelector(".membership__perks");
  if (!perksContainer) return;

  try {
    const res = await fetch("/api/content/perks");
    if (!res.ok) return;
    const data = await res.json();
    if (data.perks && data.perks.length > 0) {
      perksContainer.innerHTML = data.perks.map(perk => `
        <div class="perk">
          <div class="perk__dot"></div>
          <span>${escapeHtml(perk.text)}</span>
        </div>
      `).join("");
    }
  } catch (err) {
    // Keep fallback static HTML if offline
    console.warn("Could not load dynamic perks, using static defaults:", err);
  }
}

// ── REAL BACKEND FORM SUBMISSIONS ─────────────────────────────
function initFormSubmissions() {
  setupEnquiryForm("membership-form", "membership", "membership-success");
  setupEnquiryForm("drivers-form", "driver", "drivers-success");
  setupEnquiryForm("cause-form", "cause", "cause-success");
}

function setupEnquiryForm(formId, enquiryType, successId) {
  const form = document.getElementById(formId);
  const success = document.getElementById(successId);
  if (!form || !success) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = form.querySelector(".btn-submit");
    const originalText = btn.textContent;
    btn.textContent = "Sending…";
    btn.disabled = true;

    // Remove any previous error message
    const prevError = form.querySelector(".form-error-msg");
    if (prevError) prevError.remove();

    // Extract inputs
    const nameInput = form.querySelector('input[type="text"]');
    const emailInput = form.querySelector('input[type="email"]');
    const messageInput = form.querySelector('textarea');

    const payload = {
      type: enquiryType,
      name: nameInput ? nameInput.value.trim() : "",
      email: emailInput ? emailInput.value.trim() : "",
      message: messageInput ? messageInput.value.trim() : ""
    };

    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit application. Please try again.");
      }

      // Smooth success display
      btn.style.display = "none";
      success.style.display = "flex";
      form.reset();

    } catch (err) {
      btn.textContent = originalText;
      btn.disabled = false;

      const errorDiv = document.createElement("div");
      errorDiv.className = "form-error-msg";
      errorDiv.style.cssText = "color: #ff4466; font-size: 0.8rem; margin-top: 0.8rem; text-align: center;";
      errorDiv.textContent = err.message || "An error occurred. Please check your connection.";
      form.appendChild(errorDiv);
    }
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
