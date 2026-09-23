// PARALLAX
window.addEventListener("scroll", () => {
  const scrollY = window.scrollY;
  document.querySelector(".parallax-road").style.transform =
    `translateX(-${scrollY * 0.3}px)`;
});

// FADE-IN
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll(".fade-in").forEach(el => observer.observe(el));