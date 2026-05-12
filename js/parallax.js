/* ========== Parallax — hero background ========== */
export function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(hover: none)').matches) return; // Skip on mobile/touch

  const heroBg   = document.querySelector('.hero__bg');
  const heroEl   = document.querySelector('.hero');
  if (!heroBg || !heroEl) return;

  let ticking   = false;
  let heroH     = heroEl.offsetHeight;

  // Keep heroH updated on resize
  const ro = new ResizeObserver(() => { heroH = heroEl.offsetHeight; });
  ro.observe(heroEl);

  function update() {
    const scrollY = window.scrollY;
    if (scrollY >= heroH) {
      ticking = false;
      return;
    }

    const progress = scrollY / heroH; // 0 → 1
    const yOffset  = scrollY * 0.28;  // 28% parallax factor
    const opacity  = 1 - progress * 0.25; // subtle fade

    heroBg.style.transform = `translateY(${yOffset}px)`;
    heroBg.style.opacity   = opacity;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
}
