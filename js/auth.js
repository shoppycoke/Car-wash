(function () {
  'use strict';

  // ── DEBUG ─────────────────────────────────────────────────
  const DBG = true;
  function log(...args) { if (DBG) console.log('[AUTH]', ...args); }
  function err(...args) { console.error('[AUTH]', ...args); }

  log('Script chargé. URL:', location.href);
  log('SUPABASE_URL:', window.SUPABASE_URL);
  log('SUPABASE_ANON_KEY (début):', window.SUPABASE_ANON_KEY?.slice(0, 20) + '…');

  // Intercepte les popups natifs pour connaître leur source
  const _confirm = window.confirm;
  window.confirm = function(msg) {
    err('window.confirm intercepté !', msg, new Error().stack);
    return _confirm.call(window, msg);
  };

  // Détecte les tentatives de navigation "quitter la page"
  window.addEventListener('beforeunload', e => {
    log('beforeunload déclenché. État:', { readyState: document.readyState });
  });

  // ── Init Supabase ─────────────────────────────────────────
  const { createClient } = supabase;
  log('createClient disponible:', typeof createClient);

  const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
  log('Client Supabase créé');

  // Observe les changements d'état d'auth pour debug
  sb.auth.onAuthStateChange((event, session) => {
    log('onAuthStateChange →', event, 'session:', session ? 'présente (user=' + session.user?.email + ')' : 'nulle');
    if (event === 'SIGNED_IN' && session) {
      log('Redirection vers dashboard (onAuthStateChange SIGNED_IN)');
      window.location.replace('dashboard.html');
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
    log('showAlert:', type, msg);
    alertEl.textContent = msg;
    alertEl.className = `auth-alert auth-alert--${type}`;
    alertEl.hidden = false;
  }

  function hideAlert() { alertEl.hidden = true; }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    if (loading) {
      btn.dataset.txt = btn.textContent;
      btn.textContent = 'Chargement…';
    } else {
      btn.textContent = btn.dataset.txt || btn.textContent;
    }
  }

  function translateError(msg) {
    err('Erreur Supabase brute:', msg);
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
    magicLinkInfo.hidden = false;
    loginBtn.hidden = true;
    magicLinkBtn.hidden = false;
    hideAlert();
  });

  togglePasswordLogin?.addEventListener('click', () => {
    useMagicLink = false;
    loginPasswordField.hidden = false;
    magicLinkInfo.hidden = true;
    loginBtn.hidden = false;
    magicLinkBtn.hidden = true;
    hideAlert();
  });

  // ── Connexion par mot de passe ────────────────────────────
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    e.stopPropagation();
    log('loginForm submit déclenché');
    hideAlert();

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    log('Tentative de connexion pour:', email);

    if (!email)    { showAlert('Veuillez saisir votre e-mail.'); return; }
    if (!password) { showAlert('Veuillez saisir votre mot de passe.'); return; }

    setLoading(loginBtn, true);

    try {
      log('Appel signInWithPassword…');
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      log('Réponse signInWithPassword → data:', data, '| error:', error);

      if (error) {
        setLoading(loginBtn, false);
        showAlert(translateError(error.message));
        return;
      }

      log('Connexion réussie. User:', data.user?.email, '| Session expire:', data.session?.expires_at);
      // La redirection est gérée par onAuthStateChange (SIGNED_IN)
      // Fallback au cas où l'événement ne se déclenche pas
      setTimeout(() => {
        log('Fallback redirect vers dashboard.html');
        window.location.replace('dashboard.html');
      }, 300);

    } catch (ex) {
      err('Exception non gérée dans signInWithPassword:', ex);
      setLoading(loginBtn, false);
      showAlert('Une erreur inattendue s\'est produite. Vérifiez la console.');
    }
  });

  // ── Connexion par lien magique ────────────────────────────
  magicLinkBtn.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value.trim();
    log('Magic link pour:', email);
    if (!email) { showAlert('Veuillez saisir votre e-mail.'); return; }

    setLoading(magicLinkBtn, true);
    try {
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin + '/dashboard.html' }
      });
      log('signInWithOtp →', error || 'OK');
      setLoading(magicLinkBtn, false);
      if (error) { showAlert(translateError(error.message)); return; }
      showAlert('Lien envoyé ! Vérifiez votre boîte e-mail.', 'success');
    } catch (ex) {
      err('Exception magic link:', ex);
      setLoading(magicLinkBtn, false);
      showAlert('Erreur lors de l\'envoi du lien.');
    }
  });

  // ── Inscription ───────────────────────────────────────────
  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    e.stopPropagation();
    log('registerForm submit déclenché');
    hideAlert();

    const prenom    = document.getElementById('regPrenom').value.trim();
    const email     = document.getElementById('regEmail').value.trim();
    const telephone = document.getElementById('regPhone').value.trim();
    const password  = document.getElementById('regPassword').value;
    const codeRef   = document.getElementById('regCode').value.trim().toUpperCase();
    const rgpd      = document.getElementById('regRgpd').checked;

    log('Données inscription:', { prenom, email, telephone: !!telephone, codeRef, rgpd });

    if (!prenom)              { showAlert('Veuillez saisir votre prénom.'); return; }
    if (!email)               { showAlert('Veuillez saisir votre e-mail.'); return; }
    if (password.length < 8)  { showAlert('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (!rgpd)                { showAlert('Vous devez accepter la politique de confidentialité.'); return; }

    const regBtn = document.getElementById('registerBtn');
    setLoading(regBtn, true);

    try {
      // Vérifier le code parrain si fourni
      let parrainId = null;
      if (codeRef) {
        log('Vérification code parrainage:', codeRef);
        const { data: parrain, error: eParrain } = await sb
          .from('profiles')
          .select('id')
          .eq('code_parrainage', codeRef)
          .maybeSingle();
        log('Résultat parrainage:', parrain, eParrain);
        if (!parrain) {
          setLoading(regBtn, false);
          showAlert('Code de parrainage invalide.');
          return;
        }
        parrainId = parrain.id;
      }

      // Création du compte
      log('Appel signUp…');
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { prenom } }
      });
      log('Réponse signUp → data:', data, '| error:', error);

      if (error) {
        setLoading(regBtn, false);
        showAlert(translateError(error.message));
        return;
      }

      const userId = data.user?.id;
      log('userId:', userId, '| identities:', data.user?.identities?.length);

      if (!userId) {
        setLoading(regBtn, false);
        showAlert('Vérifiez votre e-mail pour confirmer votre inscription.', 'success');
        return;
      }

      // Compléter le profil
      const updates = { prenom, rgpd_accepted_at: new Date().toISOString() };
      if (telephone) updates.telephone = telephone;
      if (parrainId) updates.parrain_id = parrainId;

      log('Mise à jour profil:', updates);
      const { error: eProfile } = await sb.from('profiles').update(updates).eq('id', userId);
      if (eProfile) err('Erreur mise à jour profil:', eProfile);

      // Enregistrer le parrainage
      if (parrainId) {
        log('Enregistrement parrainage:', { parrainId, userId });
        const { error: ePar } = await sb.from('parrainages').insert({ parrain_id: parrainId, filleul_id: userId });
        if (ePar) err('Erreur enregistrement parrainage:', ePar);
      }

      setLoading(regBtn, false);
      showAlert('Compte créé avec succès ! Bienvenue chez Dracarys Auto.', 'success');
      setTimeout(() => {
        log('Redirection vers dashboard.html (post-inscription)');
        window.location.replace('dashboard.html');
      }, 1500);

    } catch (ex) {
      err('Exception non gérée dans registerForm:', ex);
      setLoading(regBtn, false);
      showAlert('Une erreur inattendue s\'est produite. Vérifiez la console.');
    }
  });

  // ── Vérification session existante ────────────────────────
  log('Vérification session existante…');
  sb.auth.getSession().then(({ data: { session }, error }) => {
    log('getSession →', session ? 'session active (user=' + session.user?.email + ')' : 'aucune session', error || '');
    if (session) {
      log('Déjà connecté → redirection dashboard');
      window.location.replace('dashboard.html');
    }
  });

})();
