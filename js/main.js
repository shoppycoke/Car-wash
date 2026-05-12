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

  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
