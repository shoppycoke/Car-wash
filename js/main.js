/* ========== MAIN — Orchestrator ========== */
import { initAnimations }  from './animations.js';
import { initHeader }      from './header.js';
import { initTilt }        from './tilt.js';
import { initBeforeAfter } from './before-after.js';
import { initLoyalty }     from './loyalty.js';
import { initCalendly }    from './calendly.js';
import { initFaq }         from './faq.js';
import { initPageLoader }  from './page-loader.js';
import { initScrollNav }   from './scroll-nav.js';
import { initParallax }    from './parallax.js';
import { initScrollNext }  from './scroll-next.js';

document.addEventListener('DOMContentLoaded', () => {
  initPageLoader();
  initHeader();
  initAnimations();
  initTilt();
  initBeforeAfter();
  initLoyalty();
  initCalendly();
  initFaq();
  initScrollNav();
  initParallax();
  initScrollNext();

  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile bar — slide-up après le page loader (900ms minimum)
  const mobileBar = document.getElementById('mobileBar');
  if (mobileBar) {
    setTimeout(() => mobileBar.classList.add('is-visible'), 1050);
  }
});
