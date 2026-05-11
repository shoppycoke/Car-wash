/* ========== Sticky header + scroll spy ========== */
export function initHeader() {
  const header = document.getElementById('header');
  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobileMenu');

  if (!header) return;

  let ticking = false;

  function update() {
    header.classList.toggle('is-scrolled', window.scrollY > 30);
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  // Mobile menu toggle
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // Scroll spy
  const navLinks = document.querySelectorAll('.header__nav a[href^="#"]');
  if (!navLinks.length) return;

  const sectionIds = Array.from(navLinks).map((l) => l.getAttribute('href').slice(1));
  const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

  const spyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      });
    },
    { threshold: 0.3, rootMargin: `-${header.offsetHeight}px 0px -40% 0px` }
  );

  sections.forEach((s) => spyObserver.observe(s));
}
