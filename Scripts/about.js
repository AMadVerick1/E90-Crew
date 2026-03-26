// PARALLAX ROAD
window.addEventListener("scroll", () => {
  const scrollY = window.scrollY;
  document.querySelector(".parallax-road").style.transform =
    `translateX(-${scrollY * 0.3}px)`;
});

// INTERSECTION OBSERVER
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    }
  });
}, { threshold: 0.3 });

// elements
document.querySelectorAll(
  ".history-text, .history-image-wrapper, .mission-overlay, .vibe-card"
).forEach(el => observer.observe(el));


// HISTORY FADE OUT EFFECT
const historySection = document.querySelector(".history-container");

window.addEventListener("scroll", () => {
  const rect = historySection.getBoundingClientRect();

  if (rect.top < -200) {
    historySection.classList.add("fade-out");
  } else {
    historySection.classList.remove("fade-out");
  }
});