/* ========== ANTI-INSPECT — Troll / Dissuasion ========== */
export function initAntiInspect() {
  const troll = () => window.location.replace('https://www.youtube.com/watch?v=rlarCLhzfoU');

  document.addEventListener('keydown', (e) => {
    const k    = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;

    if (
      e.key === 'F12'               ||   /* DevTools (Chrome / Firefox / Edge) */
      (ctrl && k === 'u')           ||   /* Ctrl+U  — Voir la source           */
      (ctrl && e.shiftKey && k === 'i') || /* Ctrl+Shift+I — DevTools           */
      (ctrl && e.shiftKey && k === 'j') || /* Ctrl+Shift+J — Console            */
      (ctrl && k === 's')                  /* Ctrl+S  — Enregistrer la page     */
    ) {
      e.preventDefault();
      troll();
    }
  });

  /* Clic droit */
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    troll();
  });
}
