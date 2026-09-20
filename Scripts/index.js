// Smooth parallax (subtle, not aggressive)
window.addEventListener("scroll", () => {
  const scrollY = window.scrollY;
  const road = document.querySelector(".parallax-road");

  road.style.transform = `translateX(-${scrollY * 0.3}px)`;
});

// Fade-in
const elements = document.querySelectorAll(".fade-in");

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    }
  });
}, { threshold: 0.2 });

elements.forEach(el => observer.observe(el));