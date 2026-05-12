/* ========== Animations on scroll — Premium cinematic system ========== */
export function initAnimations() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Make everything visible immediately
    document.querySelectorAll(
      '.animate-on-scroll, .anim-left, .anim-right, .anim-blur, .anim-scale'
    ).forEach((el) => el.classList.add('is-visible'));
    return;
  }

  // Apply stagger delays to grid children BEFORE observing
  applyStaggerDelays();

  const targets = document.querySelectorAll(
    '.animate-on-scroll, .anim-left, .anim-right, .anim-scale'
  );

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        entry.target.querySelectorAll('[data-counter]').forEach(animateCounter);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
  );

  targets.forEach((el, i) => {
    // Light sequential delay for standard fade-ups, none for directional
    if (
      el.classList.contains('animate-on-scroll') &&
      !el.classList.contains('anim-left') &&
      !el.classList.contains('anim-right')
    ) {
      el.style.transitionDelay = `${Math.min(i * 45, 200)}ms`;
    }
    observer.observe(el);
  });
}

/* ---- Apply stagger transition-delays to grid/list children ---- */
function applyStaggerDelays() {
  const staggerParents = [
    { selector: '.services__grid',  delay: 130 },
    { selector: '.reviews__grid',   delay: 100 },
    { selector: '.gallery__grid',   delay: 100 },
    { selector: '.faq__list',       delay: 60  },
    { selector: '.zone__tags',      delay: 35  },
  ];

  staggerParents.forEach(({ selector, delay }) => {
    const parent = document.querySelector(selector);
    if (!parent) return;
    [...parent.children].forEach((child, i) => {
      if (child.classList.contains('animate-on-scroll')) {
        child.style.transitionDelay = `${i * delay}ms`;
      }
    });
  });
}

/* ---- Animated counter ---- */
function animateCounter(el) {
  if (el.dataset.counted === 'true') return;
  el.dataset.counted = 'true';

  const target   = parseInt(el.dataset.counter, 10) || 0;
  const suffix   = el.dataset.suffix || '';
  const duration = 1800;
  const start    = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    const value    = Math.round(target * eased);
    el.textContent = value.toLocaleString('fr-FR') + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
