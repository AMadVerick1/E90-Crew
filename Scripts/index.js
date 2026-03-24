// PARALLAX SCROLL EFFECT (road moving)
window.addEventListener("scroll", () => {
  const scrollY = window.scrollY;
  const parallax = document.querySelector(".parallax-bg");

  if (parallax) {
    parallax.style.transform = `translateX(-${scrollY * 0.5}px)`;
  }
});

// FADE-IN ON SCROLL
const elements = document.querySelectorAll(
  ".the-crew, .crew-image, .our-drive, .invitational-cta"
);

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.2 }
);

elements.forEach((el) => {
  el.classList.add("fade-in");
  observer.observe(el);
});