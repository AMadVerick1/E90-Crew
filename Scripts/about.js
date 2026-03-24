// HISTORY SECTION (enter + exit effect)
const historySection = document.querySelector(".history-container");
const historyText = document.querySelector(".history-text-container");
const historyImage = document.querySelector(".history-image");

const historyObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        historyText.classList.add("visible");
        historyImage.classList.add("visible");
        historySection.classList.remove("fade-out");
      } else {
        historySection.classList.add("fade-out");
      }
    });
  },
  { threshold: 0.3 }
);

historyObserver.observe(historySection);

// MISSION TEXT DROP-IN
const missionElements = document.querySelectorAll(
  ".mission-title, .mission-paragraph"
);

const missionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.4 }
);

missionElements.forEach((el) => missionObserver.observe(el));

// VIBES FADE UP
const vibesSections = document.querySelectorAll(".vibes-subsection");

const vibesObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.2 }
);

vibesSections.forEach((el) => vibesObserver.observe(el));