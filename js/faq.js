/* ========== FAQ Accordion ========== */
export function initFaq() {
  const items = document.querySelectorAll('.faq__item');
  if (!items.length) return;

  items.forEach((item) => {
    const btn = item.querySelector('.faq__question');
    const answer = item.querySelector('.faq__answer');
    if (!btn || !answer) return;

    btn.setAttribute('aria-expanded', 'false');
    answer.style.maxHeight = '0';

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');

      // Close all
      items.forEach((i) => {
        i.classList.remove('is-open');
        const a = i.querySelector('.faq__answer');
        const q = i.querySelector('.faq__question');
        if (a) a.style.maxHeight = '0';
        if (q) q.setAttribute('aria-expanded', 'false');
      });

      // Open clicked item if it was closed
      if (!isOpen) {
        item.classList.add('is-open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}
