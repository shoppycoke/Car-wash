/* ============================================================
   SMOOTH SCROLL — Navigation cinématographique section par section
   - Actif uniquement sur appareils avec pointeur fin (souris/trackpad)
   - Sur mobile : CSS scroll-snap natif reste en place
   ============================================================ */
export function initSmoothScroll() {
  /* Reduced motion : ne rien faire */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* Uniquement sur appareils avec souris/trackpad (pointeur fin) */
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  if (!hasFinePointer) return;

  /* Désactiver CSS scroll-snap : on prend la main */
  document.documentElement.style.scrollSnapType = 'none';

  /* ── Cibles de navigation : sections + footer ── */
  const getTargets = () => [
    ...document.querySelectorAll('section[id]'),
    document.querySelector('footer'),
  ].filter(Boolean);

  /* ── État interne ── */
  let isAnimating  = false;
  let wheelAccum   = 0;
  let wheelTimer   = null;
  const WHEEL_THRESHOLD = 60;  /* px accumulés pour déclencher sur trackpad */
  const ANIM_MS         = 900; /* durée animation ms — feel cinématographique */

  /* ── Easing easeInOutQuart : accélération douce + décélération longue ── */
  const ease = (t) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

  /* ── Index de la section active (la plus proche du dessus) ── */
  function getActiveIdx(targets) {
    const mid = window.innerHeight * 0.45;
    let idx = 0;
    targets.forEach((el, i) => {
      if (el.getBoundingClientRect().top <= mid) idx = i;
    });
    return idx;
  }

  /* ── Animation GPU-accélérée vers une position Y ── */
  function animateTo(targetY) {
    const startY = window.scrollY;
    const diff   = targetY - startY;
    if (Math.abs(diff) < 2) { isAnimating = false; return; }

    isAnimating = true;
    const t0 = performance.now();

    (function tick(now) {
      const p = Math.min((now - t0) / ANIM_MS, 1);
      window.scrollTo(0, startY + diff * ease(p));
      if (p < 1) requestAnimationFrame(tick);
      else        isAnimating = false;
    })(performance.now());
  }

  /* ── Naviguer vers section +dir ── */
  function navigate(dir) {
    if (isAnimating) return;
    const targets = getTargets();
    const cur     = getActiveIdx(targets);
    const nxt     = Math.max(0, Math.min(targets.length - 1, cur + dir));
    if (nxt === cur) return;
    const targetY = targets[nxt].getBoundingClientRect().top + window.scrollY;
    animateTo(targetY);
  }

  /* ── Molette souris / trackpad ── */
  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (isAnimating) return;

    /* Souris standard (deltaMode ligne/page) → déclenchement immédiat */
    if (e.deltaMode !== 0) {
      navigate(e.deltaY > 0 ? 1 : -1);
      return;
    }

    /* Trackpad (deltaMode pixel) → accumulation pour ignorer micro-mouvements */
    wheelAccum += e.deltaY;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { wheelAccum = 0; }, 250);

    if (Math.abs(wheelAccum) >= WHEEL_THRESHOLD) {
      const dir  = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      navigate(dir);
    }
  }, { passive: false });

  /* ── Expose navigateTo pour scroll-nav et raccourcis clavier ── */
  window.__scrollToSection = (targetEl) => {
    if (!targetEl || isAnimating) return;
    const targetY = targetEl.getBoundingClientRect().top + window.scrollY;
    animateTo(targetY);
  };
}
