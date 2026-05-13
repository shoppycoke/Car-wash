(function () {
  'use strict';

  const { createClient } = supabase;
  const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    }
  });

  // ── DOM ───────────────────────────────────────────────────
  const loginForm           = document.getElementById('loginForm');
  const registerForm        = document.getElementById('registerForm');
  const tabs                = document.querySelectorAll('.auth-tab');
  const alertEl             = document.getElementById('authAlert');
  const loginBtn            = document.getElementById('loginBtn');
  const magicLinkBtn        = document.getElementById('magicLinkBtn');
  const loginPasswordField  = document.getElementById('loginPasswordField');
  const magicLinkInfo       = document.getElementById('magicLinkInfo');
  const toggleMagicLink     = document.getElementById('toggleMagicLink');
  const togglePasswordLogin = document.getElementById('togglePasswordLogin');

  let useMagicLink = false;

  // ── Helpers ───────────────────────────────────────────────
  function showAlert(msg, type = 'error') {
    alertEl.textContent = msg;
    alertEl.className = `auth-alert auth-alert--${type}`;
    alertEl.hidden = false;
  }

  function hideAlert() { alertEl.hidden = true; }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    if (loading) {
      btn.dataset.txt  = btn.textContent;
      btn.textContent  = 'Chargement…';
    } else {
      btn.textContent  = btn.dataset.txt || btn.textContent;
    }
  }

  function translateError(msg) {
    if (/Invalid login credentials/i.test(msg))  return 'E-mail ou mot de passe incorrect.';
    if (/Email not confirmed/i.test(msg))         return 'Confirmez votre e-mail avant de vous connecter.';
    if (/User already registered/i.test(msg))     return 'Un compte existe déjà avec cet e-mail.';
    if (/Password should be/i.test(msg))          return 'Le mot de passe doit contenir au moins 8 caractères.';
    if (/rate limit/i.test(msg))                  return 'Trop de tentatives. Réessayez dans quelques minutes.';
    if (/Unable to validate/i.test(msg))          return 'E-mail ou mot de passe incorrect.';
    return msg;
  }

  // ── Onglets ───────────────────────────────────────────────
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      hideAlert();
      const target = tab.dataset.tab;
      loginForm.hidden    = target !== 'login';
      registerForm.hidden = target !== 'register';
    });
  });

  // ── Bascule lien magique / mot de passe ──────────────────
  toggleMagicLink?.addEventListener('click', () => {
    useMagicLink = true;
    loginPasswordField.hidden = true;
    magicLinkInfo.hidden      = false;
    loginBtn.hidden           = true;
    magicLinkBtn.hidden       = false;
    hideAlert();
  });

  togglePasswordLogin?.addEventListener('click', () => {
    useMagicLink = false;
    loginPasswordField.hidden = false;
    magicLinkInfo.hidden      = true;
    loginBtn.hidden           = false;
    magicLinkBtn.hidden       = true;
    hideAlert();
  });

  // ── Gestion de l'état d'authentification ─────────────────
  // Redirige vers le dashboard dès qu'une session s'ouvre
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      window.location.replace('dashboard.html');
    }
  });

  // ── Connexion par mot de passe ────────────────────────────
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    e.stopPropagation();
    hideAlert();

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email)    { showAlert('Veuillez saisir votre e-mail.'); return; }
    if (!password) { showAlert('Veuillez saisir votre mot de passe.'); return; }

    setLoading(loginBtn, true);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setLoading(loginBtn, false);

    if (error) {
      showAlert(translateError(error.message));
    }
    // La redirection est gérée par onAuthStateChange (SIGNED_IN)
  });

  // ── Connexion par lien magique ────────────────────────────
  magicLinkBtn.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value.trim();
    if (!email) { showAlert('Veuillez saisir votre e-mail.'); return; }

    setLoading(magicLinkBtn, true);
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/dashboard.html' }
    });
    setLoading(magicLinkBtn, false);

    if (error) { showAlert(translateError(error.message)); return; }
    showAlert('Lien envoyé ! Vérifiez votre boîte e-mail.', 'success');
  });

  // ── Inscription ───────────────────────────────────────────
  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    e.stopPropagation();
    hideAlert();

    const fullName = document.getElementById('regFullName').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const phone    = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    const codeRef  = document.getElementById('regCode').value.trim().toUpperCase();
    const rgpd     = document.getElementById('regRgpd').checked;

    if (!fullName)            { showAlert('Veuillez saisir votre nom complet.'); return; }
    if (!email)               { showAlert('Veuillez saisir votre e-mail.'); return; }
    if (password.length < 8)  { showAlert('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (!rgpd)                { showAlert('Vous devez accepter la politique de confidentialité.'); return; }

    const regBtn = document.getElementById('registerBtn');
    setLoading(regBtn, true);

    // Valide le code de parrainage via RPC (security definer — fonctionne sans session)
    if (codeRef) {
      const { data: codeValid, error: rpcErr } = await sb.rpc('check_referral_code', { code: codeRef });
      if (rpcErr || !codeValid) {
        setLoading(regBtn, false);
        showAlert('Code de parrainage invalide.');
        return;
      }
    }

    // Inscription — toutes les données passent en metadata,
    // le trigger handle_new_user() crée le profil et le parrainage côté serveur
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name:   fullName,
          phone:       phone   || null,
          referred_by: codeRef || null,
        }
      }
    });

    setLoading(regBtn, false);

    if (error) {
      showAlert(translateError(error.message));
      return;
    }

    // Pas de session → confirmation e-mail requise dans Supabase
    if (!data.session) {
      showAlert('Inscription réussie ! Vérifiez votre e-mail pour confirmer votre compte.', 'success');
      return;
    }

    // Session présente → onAuthStateChange gère la redirection
  });

  // ── Redirection si déjà connecté ─────────────────────────
  sb.auth.getSession().then(({ data: { session } }) => {
    if (session) window.location.replace('dashboard.html');
  });

})();
