(function () {
  'use strict';

  const { createClient } = supabase;
  const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  // ── State ─────────────────────────────────────────────────
  let profile       = null;
  let pendingAction = null;

  // ── DOM ───────────────────────────────────────────────────
  const dashMain        = document.getElementById('dashMain');
  const dashLoading     = document.getElementById('dashLoading');
  const headerName      = document.getElementById('headerName');
  const logoutBtn       = document.getElementById('logoutBtn');
  const pointsTotal     = document.getElementById('pointsTotal');
  const progressBar     = document.getElementById('pointsProgressBar');
  const progressLabel   = document.getElementById('pointsProgressLabel');
  const redeemBtn       = document.getElementById('redeemBtn');
  const statReductions  = document.getElementById('statReductions');
  const statPrestations = document.getElementById('statPrestations');
  const statParrainages = document.getElementById('statParrainages');
  const reductionsList  = document.getElementById('reductionsList');
  const historyList     = document.getElementById('historyList');
  const referralCode    = document.getElementById('referralCode');
  const copyCodeBtn     = document.getElementById('copyCodeBtn');
  const accountInfo     = document.getElementById('accountInfo');
  const deleteBtn       = document.getElementById('deleteAccountBtn');
  const modal           = document.getElementById('confirmModal');
  const modalTitle      = document.getElementById('modalTitle');
  const modalBody       = document.getElementById('modalBody');
  const modalCancel     = document.getElementById('modalCancel');
  const modalConfirm    = document.getElementById('modalConfirm');

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.replace('auth.html'); return; }
    await loadDashboard(session.user.id);
  }

  // ── Chargement données ────────────────────────────────────
  async function loadDashboard(userId) {
    try {
      const [profRes, prestRes, redRes, parRes] = await Promise.all([
        sb.from('profiles').select('*').eq('id', userId).maybeSingle(),
        sb.from('prestations')
          .select('*').eq('client_id', userId).eq('statut', 'completed')
          .order('date', { ascending: false }),
        sb.from('reductions')
          .select('*').eq('client_id', userId).eq('utilisee', false)
          .order('created_at', { ascending: false }),
        sb.from('parrainages')
          .select('*').eq('parrain_id', userId).eq('valide', true)
      ]);

      if (profRes.error) throw profRes.error;
      if (!profRes.data) {
        // Profil absent : l'utilisateur existait avant la migration du schéma
        await sb.auth.signOut();
        window.location.replace('auth.html');
        return;
      }
      profile = profRes.data;

      render(profile, prestRes.data || [], redRes.data || [], parRes.data || []);
    } catch (err) {
      console.error('[Dashboard]', err);
      alert('Erreur de chargement. Veuillez rafraîchir la page.');
    } finally {
      dashLoading.style.display = 'none';
      dashMain.hidden = false;
    }
  }

  // ── Rendu ─────────────────────────────────────────────────
  function render(prof, prestations, reductions, parrainages) {
    const displayName = prof.full_name || 'vous';
    headerName.textContent = `Bonjour, ${displayName}`;

    const pts    = prof.loyalty_points || 0;
    const inCycle = pts % 100;
    const pct    = (inCycle / 100) * 100;
    const needed = 100 - inCycle;

    pointsTotal.textContent   = pts;
    progressBar.style.width   = `${pct}%`;
    progressLabel.textContent = needed === 0
      ? 'Vous pouvez échanger 100 points contre 5 € de réduction !'
      : `Plus que ${needed} point${needed > 1 ? 's' : ''} pour une réduction de 5 €`;

    redeemBtn.disabled           = pts < 100;
    statReductions.textContent   = reductions.length;
    statPrestations.textContent  = prestations.length;
    statParrainages.textContent  = parrainages.length;
    referralCode.textContent     = prof.referral_code || '------';

    accountInfo.innerHTML = `
      <p><strong>Nom :</strong> ${esc(prof.full_name || '—')}</p>
      ${prof.email ? `<p><strong>E-mail :</strong> ${esc(prof.email)}</p>` : ''}
      ${prof.phone ? `<p><strong>Téléphone :</strong> ${esc(prof.phone)}</p>` : ''}
      <p><strong>Membre depuis :</strong> ${fmtDate(prof.created_at)}</p>
    `;

    renderReductions(reductions);
    renderHistory(prestations);
  }

  function renderReductions(list) {
    if (!list.length) {
      reductionsList.innerHTML = '<p class="dash-empty">Aucune réduction disponible pour le moment.</p>';
      return;
    }
    reductionsList.innerHTML = list.map(r => `
      <div class="dash-reduction-card">
        <div class="dash-reduction-card__badge dash-reduction-card__badge--${r.type}">
          ${r.type === '5eur' ? '5 €' : '−10 %'}
        </div>
        <div class="dash-reduction-card__info">
          <strong>${esc(r.description)}</strong>
          <span>Obtenu le ${fmtDate(r.created_at)}</span>
          ${r.expires_at ? `<span class="dash-reduction-card__expires">Expire le ${fmtDate(r.expires_at)}</span>` : ''}
        </div>
        <span class="dash-reduction-card__status">À utiliser lors de votre prochaine réservation</span>
      </div>
    `).join('');
  }

  function renderHistory(list) {
    if (!list.length) {
      historyList.innerHTML = '<p class="dash-empty">Aucune prestation enregistrée.</p>';
      return;
    }
    historyList.innerHTML = `
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead>
            <tr>
              <th>Date</th><th>Prestation</th><th>Montant</th><th>Points gagnés</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(p => `
              <tr>
                <td>${fmtDate(p.date)}</td>
                <td>${esc(p.formule || p.description || 'Detailing')}</td>
                <td>${fmtEur(p.montant)}</td>
                <td class="dash-table__points">+${p.points_credited}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ── Échange de points ─────────────────────────────────────
  redeemBtn.addEventListener('click', () => {
    if (!profile || profile.loyalty_points < 100) return;
    openModal(
      'Échanger des points',
      `Voulez-vous échanger 100 points contre 5 € de réduction ? Il vous restera ${profile.loyalty_points - 100} point(s).`,
      redeemPoints
    );
  });

  async function redeemPoints() {
    const { data: { session } } = await sb.auth.getSession();
    const uid = session.user.id;

    const { error: txErr } = await sb.from('points_transactions').insert({
      client_id:   uid,
      montant:     -100,
      type:        'echange',
      description: 'Échange 100 points fidélité → réduction 5 €'
    });
    if (txErr) { alert('Erreur lors de la transaction. Réessayez.'); return; }

    const { error: redErr } = await sb.from('reductions').insert({
      client_id:   uid,
      type:        '5eur',
      description: 'Réduction obtenue par échange de 100 points fidélité'
    });
    if (redErr) { alert('Erreur lors de la création de la réduction.'); return; }

    await loadDashboard(uid);
  }

  // ── Copier le code ────────────────────────────────────────
  copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(referralCode.textContent).then(() => {
      const orig = copyCodeBtn.innerHTML;
      copyCodeBtn.textContent = '✓ Copié !';
      setTimeout(() => { copyCodeBtn.innerHTML = orig; }, 2000);
    });
  });

  // ── Suppression compte ────────────────────────────────────
  deleteBtn.addEventListener('click', () => {
    openModal(
      'Supprimer mon compte',
      'Cette action est irréversible. Toutes vos données (points, réductions, historique) seront définitivement supprimées.',
      () => {
        alert('Pour supprimer votre compte, contactez-nous directement. Nous traiterons votre demande sous 30 jours conformément au RGPD.');
      },
      'Je comprends'
    );
  });

  // ── Déconnexion ───────────────────────────────────────────
  logoutBtn.addEventListener('click', async () => {
    await sb.auth.signOut();
    window.location.replace('index.html');
  });

  // ── Modal ─────────────────────────────────────────────────
  function openModal(title, body, onConfirm, confirmLabel = 'Confirmer') {
    modalTitle.textContent   = title;
    modalBody.textContent    = body;
    modalConfirm.textContent = confirmLabel;
    pendingAction            = onConfirm;
    modal.hidden             = false;
    setTimeout(() => modalConfirm.focus(), 50);
  }

  function closeModal() {
    modal.hidden  = true;
    pendingAction = null;
  }

  modalCancel.addEventListener('click', closeModal);
  modal.querySelector('.dash-modal__backdrop').addEventListener('click', closeModal);
  modalConfirm.addEventListener('click', () => {
    const fn = pendingAction;
    closeModal();
    if (fn) fn();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // ── Utilitaires ───────────────────────────────────────────
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtDate(d) {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  function fmtEur(n) {
    return Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  }

  init();
})();
