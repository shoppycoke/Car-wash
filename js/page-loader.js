/* ========== Page Loader ========== */
export function initPageLoader() {
  const loader = document.getElementById('page-loader');
  if (!loader) return;

  const MINIMUM_MS = 900;
  const start = performance.now();

  function hide() {
    const elapsed = performance.now() - start;
    const remaining = Math.max(0, MINIMUM_MS - elapsed);

    setTimeout(() => {
      loader.classList.add('is-hidden');
      loader.addEventListener('transitionend', () => loader.remove(), { once: true });
    }, remaining);
  }

  if (document.readyState === 'complete') {
    hide();
  } else {
    window.addEventListener('load', hide, { once: true });
  }
}
