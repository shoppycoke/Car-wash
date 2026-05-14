/* ========== SMOOTH SCROLL — Lerp engine ========== */
export function initSmoothScroll() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch   = window.matchMedia('(pointer: coarse)').matches;

  /* Touch / accessibilité : scroll natif */
  if (reduced || touch) {
    window.__scrollToSection = (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  /* On prend le contrôle total du scroll */
  const html = document.documentElement;
  html.style.scrollSnapType  = 'none';
  html.style.scrollBehavior  = 'auto';

  let cur    = window.scrollY;   /* position rendue           */
  let tgt    = window.scrollY;   /* position cible            */
  let raf    = null;
  let isAnim = false;             /* true pendant goTo()       */

  const LERP  = 0.10;   /* douceur : 0.07 = soyeux, 0.15 = vif */
  const MMULT = 2.8;    /* amplification molette souris         */
  const maxY  = () => html.scrollHeight - window.innerHeight;

  /* ── Boucle lerp ── */
  function loop() {
    const d = tgt - cur;
    if (Math.abs(d) < 0.3) { cur = tgt; window.scrollTo(0, cur); raf = null; return; }
    cur += d * LERP;
    window.scrollTo(0, cur);
    raf = requestAnimationFrame(loop);
  }

  /* ── Molette ── */
  window.addEventListener('wheel', (e) => {
    /* Laisse les enfants scrollables gérer leur propre scroll */
    let node = e.target;
    while (node && node !== html) {
      const oy = getComputedStyle(node).overflowY;
      if (/(auto|scroll)/.test(oy) && node.scrollHeight > node.clientHeight) return;
      node = node.parentElement;
    }
    e.preventDefault();

    if (isAnim) {
      /* Animation programmatique interrompue → reprise lerp */
      cancelAnimationFrame(raf); raf = null; isAnim = false;
      cur = window.scrollY; tgt = window.scrollY;
    } else if (!raf) {
      /* Était inactif → resync depuis la vraie position */
      cur = window.scrollY; tgt = window.scrollY;
    }
    /* Lerp en cours → simple accumulation sur tgt */

    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 32;
    if (e.deltaMode === 2) d *= window.innerHeight;

    /* Souris : delta entier ≥ 50 → amplification */
    if (Number.isInteger(d) && Math.abs(d) >= 50) d *= MMULT;

    tgt = Math.max(0, Math.min(tgt + d, maxY()));
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: false });

  /* ── Clavier ── */
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (e.target.isContentEditable) return;

    let d = 0;
    if (e.key === 'ArrowDown') d =  90;
    if (e.key === 'ArrowUp')   d = -90;
    if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) d =  window.innerHeight * 0.88;
    if (e.key === 'PageUp'   || (e.key === ' ' &&  e.shiftKey)) d = -window.innerHeight * 0.88;
    if (e.key === 'Home') {
      e.preventDefault();
      tgt = 0;
      if (!raf) { cur = window.scrollY; raf = requestAnimationFrame(loop); }
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      tgt = maxY();
      if (!raf) { cur = window.scrollY; raf = requestAnimationFrame(loop); }
      return;
    }
    if (!d) return;
    e.preventDefault();
    if (!raf) { cur = window.scrollY; tgt = window.scrollY; }
    tgt = Math.max(0, Math.min(tgt + d, maxY()));
    if (!raf) raf = requestAnimationFrame(loop);
  });

  /* ── Navigation programmatique (dots, scroll-nav) ── */
  function goTo(y, ms = 700) {
    y = Math.max(0, Math.min(Math.round(y), maxY()));
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    const from = cur;
    const t0   = performance.now();
    isAnim     = true;
    const ease = (t) => 1 - Math.pow(1 - t, 4); /* easeOutQuart */
    function step(now) {
      const p = Math.min((now - t0) / ms, 1);
      cur = from + (y - from) * ease(p);
      tgt = cur;
      window.scrollTo(0, cur);
      if (p < 1) { raf = requestAnimationFrame(step); }
      else        { raf = null; isAnim = false; }
    }
    raf = requestAnimationFrame(step);
  }

  window.__scrollToSection = (el) => {
    if (!el) return;
    goTo(el.getBoundingClientRect().top + window.scrollY);
  };

  /* ── Resync sur resize / scroll externe ── */
  window.addEventListener('scroll', () => {
    if (!raf) { cur = window.scrollY; tgt = window.scrollY; }
  }, { passive: true });

  window.addEventListener('resize', () => {
    cur = window.scrollY; tgt = window.scrollY;
  }, { passive: true });
}
