/* ========== Calendly init (script loaded inline in HTML) ========== */
export function initCalendly() {
  // The Calendly embed script auto-initializes any .calendly-inline-widget
  // present on page load. If the widget mounts late, this re-checks once.
  setTimeout(() => {
    const widget = document.querySelector('.calendly-inline-widget');
    if (!widget) return;
    // If Calendly object is available and widget is empty, force re-init
    if (window.Calendly && !widget.querySelector('iframe')) {
      window.Calendly.initInlineWidget({
        url: widget.getAttribute('data-url'),
        parentElement: widget,
      });
    }
  }, 1500);
}