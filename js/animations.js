/* ========== Animations on scroll + counters ========== */
export function initAnimations() {
  // Fade-in / slide-up on scroll
  const elements = document.querySelectorAll('.animate-on-scroll');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');

          // Animate counters inside visible block
          entry.target.querySelectorAll('[data-counter]').forEach(animateCounter);

          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -50px 0px' }
  );

  elements.forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i * 60, 240)}ms`;
    observer.observe(el);
  });

  // Standalone counters (not inside animate-on-scroll)
  const standalone = document.querySelectorAll('[data-counter]');
  const counterObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  standalone.forEach((el) => counterObs.observe(el));
}

function animateCounter(el) {
  if (el.dataset.counted === 'true') return;
  el.dataset.counted = 'true';

  const target = parseInt(el.dataset.counter, 10) || 0;
  const suffix = el.dataset.suffix || '';
  const duration = 1800;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    const value = Math.round(target * eased);
    el.textContent = value.toLocaleString('fr-FR') + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}