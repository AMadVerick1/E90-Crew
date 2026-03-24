// SCROLL ANIMATION
const elements = document.querySelectorAll(
  ".contributors_text, .applicants_text, .contributors-form, .applicants-form"
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

elements.forEach((el) => observer.observe(el));


// BASIC FORM FEEDBACK (no backend yet)
const forms = document.querySelectorAll("form");

forms.forEach((form) => {
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Reality check: you're not sending this anywhere yet
    alert("Form submitted. Hook this up to a backend.");

    form.reset();
  });
});