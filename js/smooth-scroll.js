/* ============================================================
   SMOOTH SCROLL — Programmable uniquement (dots, clavier, flèche bas)
   Le scroll manuel (molette, trackpad, tactile) est entièrement libre.
   ============================================================ */
export function initSmoothScroll() {
  /* Reduced motion : scroll natif immédiat */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.__scrollToSection = (el) => el?.scrollIntoView({ block: 'start' });
    return;
  }

  /* Desktop (pointeur fin) : désactiver tout CSS snap résiduel */
  if (window.matchMedia('(pointer: fine)').matches) {
    document.documentElement.style.scrollSnapType = 'none';
  }

  let rafId = null;

  /* easeOutExpo — décélération iOS-like (correspond à --ease-smooth) */
  const ease = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

  function smoothScrollTo(targetY, duration) {
    if (rafId) cancelAnimationFrame(rafId);
    const startY = window.scrollY;
    const delta  = targetY - startY;
    if (Math.abs(delta) < 1) return;
    const t0 = performance.now();

    (function tick(now) {
      const p = Math.min((now - t0) / duration, 1);
      window.scrollTo(0, startY + delta * ease(p));
      if (p < 1) rafId = requestAnimationFrame(tick);
      else        rafId = null;
    })(performance.now());
  }

  /* Annuler l'animation si l'utilisateur interagit manuellement */
  const cancelOnInteract = () => {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  };
  window.addEventListener('wheel',      cancelOnInteract, { passive: true });
  window.addEventListener('touchstart', cancelOnInteract, { passive: true });

  /* API publique — utilisée par scroll-nav.js, scroll-next.js, header.js */
  window.__scrollToSection = (el) => {
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY;
    smoothScrollTo(y, 700);
  };
}
