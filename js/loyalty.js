/* ========== Loyalty: progress, referral code, copy ========== */
export function initLoyalty() {
  const codeEl = document.getElementById('referralCode');
  const copyBtn = document.getElementById('copyCode');
  const generateBtn = document.getElementById('generateCode');

  // Generate a pseudo unique code per visitor (persistent via localStorage)
  function getOrCreateCode() {
    let code = localStorage.getItem('referralCode');
    if (!code) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      code = '';
      for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
      code += Math.floor(1000 + Math.random() * 9000);
      localStorage.setItem('referralCode', code);
    }
    return code;
  }

  if (codeEl) {
    codeEl.textContent = getOrCreateCode();
  }

  if (copyBtn && codeEl) {
    copyBtn.addEventListener('click', async () => {
      const text = codeEl.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      copyBtn.classList.add('is-copied');
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';
      setTimeout(() => {
        copyBtn.classList.remove('is-copied');
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      }, 2000);
    });
  }

  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      // Force regenerate
      localStorage.removeItem('referralCode');
      const newCode = getOrCreateCode();
      if (codeEl) {
        codeEl.style.opacity = '0';
        setTimeout(() => {
          codeEl.textContent = newCode;
          codeEl.style.opacity = '1';
        }, 200);
      }
      generateBtn.textContent = 'Code généré ✓';
      setTimeout(() => {
        generateBtn.textContent = 'Obtenir mon code';
      }, 2000);
    });
  }
}