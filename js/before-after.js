/* ========== Before/After draggable slider ========== */
export function initBeforeAfter() {
  const slider = document.getElementById('baSlider');
  if (!slider) return;

  const beforeWrap = slider.querySelector('.ba__before-wrap');
  const handle = slider.querySelector('.ba__handle');
  if (!beforeWrap || !handle) return;

  let isDragging = false;
  let rect = null;

  function setPos(clientX) {
    if (!rect) rect = slider.getBoundingClientRect();
    let pct = ((clientX - rect.left) / rect.width) * 100;
    pct = Math.max(0, Math.min(100, pct));
    beforeWrap.style.width = pct + '%';
    handle.style.left = pct + '%';
  }

  function start(e) {
    isDragging = true;
    rect = slider.getBoundingClientRect();
    slider.style.cursor = 'grabbing';
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    setPos(clientX);
    e.preventDefault();
  }

  function move(e) {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    setPos(clientX);
  }

  function stop() {
    isDragging = false;
    slider.style.cursor = 'ew-resize';
    rect = null;
  }

  slider.addEventListener('mousedown', start);
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', stop);

  slider.addEventListener('touchstart', start, { passive: false });
  window.addEventListener('touchmove', move, { passive: true });
  window.addEventListener('touchend', stop);

  slider.addEventListener('click', (e) => {
    if (isDragging) return;
    rect = slider.getBoundingClientRect();
    setPos(e.clientX);
    rect = null;
  });

  // Keyboard support
  slider.setAttribute('tabindex', '0');
  slider.setAttribute('role', 'slider');
  slider.setAttribute('aria-label', 'Comparaison avant/après — utilisez les flèches gauche/droite');
  slider.setAttribute('aria-valuemin', '0');
  slider.setAttribute('aria-valuemax', '100');
  slider.setAttribute('aria-valuenow', '50');

  slider.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const step = e.shiftKey ? 10 : 3;
    const current = parseFloat(beforeWrap.style.width) || 50;
    const next = e.key === 'ArrowLeft'
      ? Math.max(0, current - step)
      : Math.min(100, current + step);
    beforeWrap.style.width = next + '%';
    handle.style.left = next + '%';
    slider.setAttribute('aria-valuenow', Math.round(next));
  });

  // Auto-animate on first reveal
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          beforeWrap.style.transition = 'width 1.4s var(--ease-smooth)';
          handle.style.transition = 'left 1.4s var(--ease-smooth)';
          beforeWrap.style.width = '90%';
          handle.style.left = '90%';
          setTimeout(() => {
            beforeWrap.style.width = '50%';
            handle.style.left = '50%';
          }, 700);
          setTimeout(() => {
            beforeWrap.style.transition = '';
            handle.style.transition = '';
          }, 2200);
          observer.unobserve(slider);
        }
      });
    },
    { threshold: 0.4 }
  );
  observer.observe(slider);
}
