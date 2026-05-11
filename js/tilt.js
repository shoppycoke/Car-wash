/* ========== 3D tilt hover on cards ========== */
export function initTilt() {
  if (window.matchMedia('(hover: none)').matches) return; // skip on touch
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cards = document.querySelectorAll('[data-tilt]');
  const maxTilt = 8;

  cards.forEach((card) => {
    let rect = null;
    let rafId = null;

    function onEnter() {
      rect = card.getBoundingClientRect();
      card.style.transition = 'transform 0.1s var(--ease-smooth), border-color 0.3s var(--ease-smooth), box-shadow 0.3s var(--ease-smooth)';
    }

    function onMove(e) {
      if (!rect) rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rx = ((y - cy) / cy) * -maxTilt;
      const ry = ((x - cx) / cx) * maxTilt;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
        card.style.setProperty('--mx', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--my', `${(y / rect.height) * 100}%`);
      });
    }

    function onLeave() {
      card.style.transition = 'transform 0.5s var(--ease-smooth), border-color 0.3s var(--ease-smooth), box-shadow 0.3s var(--ease-smooth)';
      card.style.transform = '';
      rect = null;
    }

    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
  });
}