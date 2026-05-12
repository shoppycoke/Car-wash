/* ========== Scroll-to-next-section button ========== */
export function initScrollNext() {
  const sections = [...document.querySelectorAll('main > section')];
  if (sections.length < 2) return;

  const SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;

  sections.forEach((section, i) => {
    /* No button on the last section */
    if (i === sections.length - 1) return;

    const nextSection = sections[i + 1];

    /* Wrapper — handles absolute positioning + opacity fade */
    const wrap = document.createElement('div');
    wrap.className = 'scroll-next-wrap';
    wrap.setAttribute('aria-hidden', 'true');

    /* Button */
    const btn = document.createElement('button');
    btn.className = 'scroll-next';
    btn.setAttribute('aria-label', 'Passer à la section suivante');
    btn.setAttribute('tabindex', '-1'); // keyboard handled by scroll-nav dots
    btn.innerHTML = SVG;

    btn.addEventListener('click', () => {
      if (window.__scrollToSection) window.__scrollToSection(nextSection);
      else nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    wrap.appendChild(btn);
    section.appendChild(wrap);

    /* Fade in / out as section enters / leaves viewport */
    const io = new IntersectionObserver(
      ([entry]) => {
        wrap.classList.toggle('is-visible', entry.isIntersecting);
      },
      { threshold: 0.12 }
    );
    io.observe(section);
  });
}
