/* ========== Scroll navigation: dots + progress bar ========== */
export function initScrollNav() {
  const nav      = document.getElementById('scrollNav');
  const progress = document.getElementById('scrollProgress');
  const dots     = nav ? [...nav.querySelectorAll('.scroll-nav__dot')] : [];

  const heroEl    = document.querySelector('.hero');
  const heroThreshold = () => (heroEl ? heroEl.offsetHeight * 0.45 : window.innerHeight * 0.45);

  /* ---- Progress bar ---- */
  function updateProgress() {
    if (!progress) return;
    const scrollTop  = window.scrollY;
    const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progress.style.width = `${Math.min(pct, 100)}%`;
  }

  /* ---- Active dot ---- */
  function updateDots() {
    if (!dots.length) return;

    const viewMid = window.innerHeight * 0.5;
    let activeIdx = 0;

    dots.forEach((dot, i) => {
      const section = document.getElementById(dot.dataset.target);
      if (!section) return;
      const top = section.getBoundingClientRect().top;
      if (top <= viewMid) activeIdx = i;
    });

    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === activeIdx));
  }

  /* ---- Nav visibility ---- */
  function updateVisibility() {
    if (!nav) return;
    nav.classList.toggle('is-visible', window.scrollY > heroThreshold());
  }

  /* ---- Click to navigate ---- */
  const scrollTo = (el) => {
    if (!el) return;
    if (window.__scrollToSection) window.__scrollToSection(el);
    else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      scrollTo(document.getElementById(dot.dataset.target));
    });
  });

  /* ---- Keyboard navigation (arrow keys) ---- */
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const sectionIds = dots.map((d) => d.dataset.target);
    const currentId  = dots.find((d) => d.classList.contains('is-active'))?.dataset.target;
    const idx        = sectionIds.indexOf(currentId);

    if (e.key === 'ArrowDown' && idx < sectionIds.length - 1) {
      e.preventDefault();
      scrollTo(document.getElementById(sectionIds[idx + 1]));
    }
    if (e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault();
      scrollTo(document.getElementById(sectionIds[idx - 1]));
    }
  });

  /* ---- Throttled scroll handler ---- */
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateProgress();
        updateDots();
        updateVisibility();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  /* Initial state */
  updateProgress();
  updateDots();
  updateVisibility();
}
