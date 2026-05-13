(function () {
  'use strict';

  const { createClient } = supabase;
  const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true }
  });

  const form        = document.getElementById('lnForm');
  const emailInput  = document.getElementById('lnEmail');
  const pwdInput    = document.getElementById('lnPassword');
  const submitBtn   = document.getElementById('lnSubmit');
  const alertEl     = document.getElementById('lnAlert');
  const togglePwd   = document.getElementById('lnTogglePwd');
  const eyeOpen     = document.getElementById('lnEyeOpen');
  const eyeClosed   = document.getElementById('lnEyeClosed');
  const forgotBtn   = document.getElementById('lnForgot');
  const modal       = document.getElementById('lnModal');
  const modalBg     = document.getElementById('lnModalBg');
  const modalClose  = document.getElementById('lnModalClose');
  const modalAlert  = document.getElementById('lnModalAlert');
  const forgotEmail = document.getElementById('lnForgotEmail');
  const forgotSub   = document.getElementById('lnForgotSubmit');

  // ── Helpers ───────────────────────────────────────────────
  function showAlert(el, msg, type = 'error') {
    el.textContent = msg;
    el.className = `ln-alert ln-alert--${type}`;
    el.hidden = false;
  }

  function setLoading(btn, on) {
    btn.disabled = on;
    btn.classList.toggle('is-loading', on);
  }

  function translateError(msg) {
    if (/Invalid login credentials/i.test(msg))  return 'E-mail ou mot de passe incorrect.';
    if (/Email not confirmed/i.test(msg))         return 'Confirmez votre e-mail avant de vous connecter.';
    if (/rate limit/i.test(msg))                  return 'Trop de tentatives. Réessayez dans quelques minutes.';
    if (/Unable to validate/i.test(msg))          return 'E-mail ou mot de passe incorrect.';
    return msg;
  }

  // ── Show / hide password ──────────────────────────────────
  togglePwd.addEventListener('click', () => {
    const isText = pwdInput.type === 'text';
    pwdInput.type = isText ? 'password' : 'text';
    eyeOpen.hidden   = !isText;
    eyeClosed.hidden = isText;
    togglePwd.setAttribute('aria-label', isText ? 'Afficher le mot de passe' : 'Masquer le mot de passe');
  });

  // ── Auth state → redirect on sign-in ─────────────────────
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      window.location.replace('dashboard.html');
    }
  });

  // ── Login form ────────────────────────────────────────────
  form.addEventListener('submit', async e => {
    e.preventDefault();
    e.stopPropagation();
    alertEl.hidden = true;

    const email = emailInput.value.trim();
    const pwd   = pwdInput.value;

    if (!email) { showAlert(alertEl, 'Veuillez saisir votre adresse e-mail.'); return; }
    if (!pwd)   { showAlert(alertEl, 'Veuillez saisir votre mot de passe.'); return; }

    setLoading(submitBtn, true);
    const { error } = await sb.auth.signInWithPassword({ email, password: pwd });
    setLoading(submitBtn, false);

    if (error) showAlert(alertEl, translateError(error.message));
    // La redirection est gérée par onAuthStateChange
  });

  // ── Forgot password modal ─────────────────────────────────
  function openModal() {
    modal.hidden = false;
    forgotEmail.value = emailInput.value;
    modalAlert.hidden = true;
    requestAnimationFrame(() => forgotEmail.focus());
  }

  function closeModal() { modal.hidden = true; }

  forgotBtn.addEventListener('click', openModal);
  modalBg.addEventListener('click', closeModal);
  modalClose.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  forgotSub.addEventListener('click', async () => {
    const email = forgotEmail.value.trim();
    if (!email) { showAlert(modalAlert, 'Veuillez saisir votre adresse e-mail.'); return; }

    setLoading(forgotSub, true);
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth.html'
    });
    setLoading(forgotSub, false);

    if (error) {
      showAlert(modalAlert, error.message);
    } else {
      showAlert(modalAlert, 'Lien envoyé ! Vérifiez votre boîte e-mail.', 'success');
      setTimeout(closeModal, 3000);
    }
  });

  // ── Session check ─────────────────────────────────────────
  sb.auth.getSession().then(({ data: { session } }) => {
    if (session) window.location.replace('dashboard.html');
  });

})();
