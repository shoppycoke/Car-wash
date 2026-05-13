(function () {
  'use strict';

  const { createClient } = supabase;
  const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true }
  });

  // ── DOM ───────────────────────────────────────────────────
  const form         = document.getElementById('rgForm');
  const alertEl      = document.getElementById('rgAlert');
  const submitBtn    = document.getElementById('rgSubmit');

  const nameInput    = document.getElementById('rgFullName');
  const phoneInput   = document.getElementById('rgPhone');
  const emailInput   = document.getElementById('rgEmail');
  const pwdInput     = document.getElementById('rgPassword');
  const confirmInput = document.getElementById('rgConfirm');
  const codeInput    = document.getElementById('rgCode');
  const rgpdInput    = document.getElementById('rgRgpd');

  const strengthEl   = document.getElementById('rgStrength');
  const strengthLbl  = document.getElementById('rgStrengthLabel');
  const confirmMsg   = document.getElementById('rgConfirmMsg');
  const codeMsg      = document.getElementById('rgCodeMsg');

  // ── Helpers ───────────────────────────────────────────────
  function showAlert(msg, type = 'error') {
    alertEl.textContent = msg;
    alertEl.className = `rg-alert rg-alert--${type}`;
    alertEl.hidden = false;
    alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.classList.toggle('is-loading', on);
  }

  function setFieldState(fieldId, state, msg) {
    const el = document.getElementById(fieldId);
    if (!el) return;
    el.classList.remove('rg-field--valid', 'rg-field--error');
    if (state) el.classList.add(`rg-field--${state}`);
    const msgEl = el.querySelector('.rg-field__msg');
    if (msgEl) {
      msgEl.textContent = msg || '';
      msgEl.hidden = !msg;
    }
  }

  function translateError(msg) {
    if (/Invalid login credentials/i.test(msg))  return 'E-mail ou mot de passe incorrect.';
    if (/Email not confirmed/i.test(msg))         return 'Confirmez votre e-mail avant de vous connecter.';
    if (/User already registered/i.test(msg))     return 'Un compte existe déjà avec cet e-mail.';
    if (/Password should be/i.test(msg))          return 'Le mot de passe doit contenir au moins 8 caractères.';
    if (/rate limit/i.test(msg))                  return 'Trop de tentatives. Réessayez dans quelques minutes.';
    return msg;
  }

  // ── Show / hide password ──────────────────────────────────
  function setupEye(btnId, inputId, openId, closedId) {
    const btn = document.getElementById(btnId);
    const inp = document.getElementById(inputId);
    const open = document.getElementById(openId);
    const closed = document.getElementById(closedId);
    if (!btn || !inp) return;
    btn.addEventListener('click', () => {
      const isText = inp.type === 'text';
      inp.type = isText ? 'password' : 'text';
      if (open)   open.hidden   = !isText;
      if (closed) closed.hidden = isText;
    });
  }

  setupEye('rgTogglePwd', 'rgPassword', 'rgEyeOpen', 'rgEyeClosed');
  setupEye('rgToggleConfirm', 'rgConfirm', 'rgConfirmEyeOpen', 'rgConfirmEyeClosed');

  // ── Password strength ─────────────────────────────────────
  const STRENGTH_LABELS = ['', 'Faible', 'Moyen', 'Bon', 'Fort'];

  function calcStrength(pwd) {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8)  score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    // Compress to 1-4
    if (score <= 1) return 1;
    if (score === 2) return 2;
    if (score === 3) return 3;
    return 4;
  }

  pwdInput.addEventListener('input', () => {
    const pwd = pwdInput.value;
    if (!pwd) {
      strengthEl.className = 'rg-strength';
      strengthLbl.textContent = 'Entrez un mot de passe';
      return;
    }
    const score = calcStrength(pwd);
    strengthEl.className = `rg-strength rg-strength--${score}`;
    strengthLbl.textContent = STRENGTH_LABELS[score];

    // Re-validate confirm if it has content
    if (confirmInput.value) validateConfirm();
  });

  // ── Confirm password validation ───────────────────────────
  function validateConfirm() {
    const pwd  = pwdInput.value;
    const conf = confirmInput.value;
    if (!conf) return true;
    const field = document.getElementById('rgFieldConfirm');
    if (!field) return true;
    if (pwd === conf) {
      setFieldState('rgFieldConfirm', 'valid', '');
      return true;
    } else {
      setFieldState('rgFieldConfirm', 'error', 'Les mots de passe ne correspondent pas.');
      return false;
    }
  }

  confirmInput.addEventListener('input', validateConfirm);

  // ── Field blur validation ─────────────────────────────────
  nameInput.addEventListener('blur', () => {
    const val = nameInput.value.trim();
    if (!val) {
      setFieldState('rgFieldName', 'error', 'Votre nom est requis.');
    } else if (val.length < 2) {
      setFieldState('rgFieldName', 'error', 'Nom trop court.');
    } else {
      setFieldState('rgFieldName', 'valid', '');
    }
  });

  emailInput.addEventListener('blur', () => {
    const val = emailInput.value.trim();
    if (!val) {
      setFieldState('rgFieldEmail', 'error', 'Votre e-mail est requis.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setFieldState('rgFieldEmail', 'error', 'Adresse e-mail invalide.');
    } else {
      setFieldState('rgFieldEmail', 'valid', '');
    }
  });

  pwdInput.addEventListener('blur', () => {
    if (pwdInput.value.length > 0 && pwdInput.value.length < 8) {
      setFieldState('rgFieldPwd', 'error', '');
    } else if (pwdInput.value.length >= 8) {
      setFieldState('rgFieldPwd', 'valid', '');
    }
  });

  confirmInput.addEventListener('blur', validateConfirm);

  // Code parrainage : uppercase + validation visuelle
  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (codeInput.value.length === 6) {
      setFieldState('rgFieldCode', '', '');
    } else if (codeInput.value.length > 0) {
      setFieldState('rgFieldCode', '', '');
    }
  });

  // ── Auth state ────────────────────────────────────────────
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      window.location.replace('dashboard.html');
    }
  });

  // ── Form submit ───────────────────────────────────────────
  form.addEventListener('submit', async e => {
    e.preventDefault();
    e.stopPropagation();
    alertEl.hidden = true;

    const fullName = nameInput.value.trim();
    const phone    = phoneInput.value.trim();
    const email    = emailInput.value.trim();
    const password = pwdInput.value;
    const confirm  = confirmInput.value;
    const codeRef  = codeInput.value.trim().toUpperCase();
    const rgpd     = rgpdInput.checked;

    // Validation
    let hasError = false;

    if (!fullName || fullName.length < 2) {
      setFieldState('rgFieldName', 'error', 'Votre nom complet est requis.');
      hasError = true;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldState('rgFieldEmail', 'error', !email ? 'Votre e-mail est requis.' : 'Adresse e-mail invalide.');
      hasError = true;
    }

    if (password.length < 8) {
      setFieldState('rgFieldPwd', 'error', '');
      showAlert('Le mot de passe doit contenir au moins 8 caractères.');
      hasError = true;
    }

    if (password !== confirm) {
      setFieldState('rgFieldConfirm', 'error', 'Les mots de passe ne correspondent pas.');
      hasError = true;
    }

    if (!rgpd) {
      showAlert('Vous devez accepter la politique de confidentialité.');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);

    // Valide le code de parrainage si fourni (RPC security definer)
    if (codeRef) {
      const { data: valid, error: rpcErr } = await sb.rpc('check_referral_code', { code: codeRef });
      if (rpcErr || !valid) {
        setLoading(false);
        setFieldState('rgFieldCode', 'error', 'Code de parrainage invalide.');
        const msgEl = document.getElementById('rgCodeMsg');
        if (msgEl) { msgEl.textContent = 'Code invalide ou inexistant.'; msgEl.hidden = false; }
        return;
      }
      setFieldState('rgFieldCode', 'valid', '');
    }

    // Inscription — toutes les données passent en metadata (trigger côté serveur)
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

    setLoading(false);

    if (error) {
      showAlert(translateError(error.message));
      return;
    }

    if (!data.session) {
      // Email confirmation requise
      showAlert('Inscription réussie ! Vérifiez votre e-mail pour confirmer votre compte.', 'success');
      submitBtn.disabled = true;
      return;
    }

    // onAuthStateChange (SIGNED_IN) gère la redirection
  });

  // ── Déjà connecté ─────────────────────────────────────────
  sb.auth.getSession().then(({ data: { session } }) => {
    if (session) window.location.replace('dashboard.html');
  });

})();
