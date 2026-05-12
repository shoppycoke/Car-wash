(function () {
  'use strict';

  const { createClient } = supabase;
  const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  // ── DOM ───────────────────────────────────────────────────
  const adminLoading      = document.getElementById('adminLoading');
  const adminLayout       = document.getElementById('adminLayout');
  const logoutBtn         = document.getElementById('logoutBtn');
  const clientListEl      = document.getElementById('clientList');
  const adminPanel        = document.getElementById('adminPanel');
  const searchInput       = document.getElementById('searchInput');
  const statTotalClients  = document.getElementById('statTotalClients');
  const statTotalPrest    = document.getElementById('statTotalPrestations');
  const toastEl           = document.getElementById('adminToast');

  // ── State ─────────────────────────────────────────────────
  let allClients    = [];
  let selectedId    = null;
  let toastTimer    = null;

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.href = 'auth.html'; return; }

    // Vérifie le rôle admin
    const { data: prof } = await sb.from('profiles')
      .select('role').eq('id', session.user.id).single();

    if (!prof || prof.role !== 'admin') {
      window.location.href = 'dashboard.html';
      return;
    }

    await loadClients();
    adminLoading.style.display = 'none';
    adminLayout.hidden = false;
  }

  // ── Clients ───────────────────────────────────────────────
  async function loadClients() {
    const { data, error } = await sb
      .from('profiles')
      .select('id, prenom, telephone, points, code_parrainage, created_at, role')
      .eq('role', 'client')
      .order('created_at', { ascending: false });

    if (error) { toast('Erreur de chargement des clients.', 'error'); return; }

    allClients = data || [];
    statTotalClients.textContent = allClients.length;

    const { count } = await sb.from('prestations')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'completed');
    statTotalPrest.textContent = count ?? '—';

    renderClientList(allClients);
  }

  function renderClientList(clients) {
    if (!clients.length) {
      clientListEl.innerHTML = '<p class="admin-clients-empty">Aucun client trouvé.</p>';
      return;
    }
    clientListEl.innerHTML = clients.map(c => `
      <div class="admin-client-item ${selectedId === c.id ? 'is-active' : ''}"
           data-id="${esc(c.id)}" role="button" tabindex="0">
        <div class="admin-client-avatar">${esc(c.prenom[0])}</div>
        <div class="admin-client-info">
          <div class="admin-client-info__name">${esc(c.prenom)}</div>
          <div class="admin-client-info__email">${c.telephone ? esc(c.telephone) : 'Pas de tel.'}</div>
        </div>
        <span class="admin-client-pts">${c.points} pts</span>
      </div>
    `).join('');

    clientListEl.querySelectorAll('.admin-client-item').forEach(el => {
      el.addEventListener('click', () => selectClient(el.dataset.id));
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') selectClient(el.dataset.id);
      });
    });
  }

  // ── Recherche ─────────────────────────────────────────────
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    const filtered = allClients.filter(c =>
      c.prenom.toLowerCase().includes(q) ||
      (c.telephone || '').includes(q) ||
      c.code_parrainage.toLowerCase().includes(q)
    );
    renderClientList(filtered);
  });

  // ── Sélection client ──────────────────────────────────────
  async function selectClient(id) {
    selectedId = id;

    // Highlight
    clientListEl.querySelectorAll('.admin-client-item').forEach(el => {
      el.classList.toggle('is-active', el.dataset.id === id);
    });

    adminPanel.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-dim)">Chargement…</div>';

    const client = allClients.find(c => c.id === id);
    if (!client) return;

    // Charger données complètes
    const [prestRes, txRes, redRes, parrRes] = await Promise.all([
      sb.from('prestations').select('*').eq('client_id', id).order('date', { ascending: false }).limit(20),
      sb.from('points_transactions').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(30),
      sb.from('reductions').select('*').eq('client_id', id).eq('utilisee', false),
      sb.from('parrainages').select('*, filleul:filleul_id(prenom)').eq('parrain_id', id).order('created_at', { ascending: false })
    ]);

    renderClientDetail(client, prestRes.data || [], txRes.data || [], redRes.data || [], parrRes.data || []);
  }

  // ── Rendu détail client ───────────────────────────────────
  function renderClientDetail(c, prestations, transactions, reductions, parrainages) {
    adminPanel.innerHTML = `
      <div class="admin-client-detail">

        <!-- Head -->
        <div class="admin-detail-head">
          <div class="admin-detail-avatar">${esc(c.prenom[0])}</div>
          <div class="admin-detail-info">
            <div class="admin-detail-info__name">${esc(c.prenom)}</div>
            <div class="admin-detail-info__meta">
              ${c.telephone ? esc(c.telephone) : 'Pas de téléphone'} ·
              Code: <strong>${esc(c.code_parrainage)}</strong> ·
              Depuis ${fmtDate(c.created_at)}
            </div>
          </div>
          <div class="admin-detail-info__pts">
            <div class="admin-detail-info__pts-val">${c.points}</div>
            <div class="admin-detail-info__pts-lbl">points</div>
          </div>
        </div>

        <!-- Actions -->
        <div class="admin-actions-grid">

          <!-- Ajouter prestation -->
          <div class="admin-action-card">
            <div class="admin-action-card__title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Ajouter une prestation
            </div>
            <div class="admin-form" id="formPrestation">
              <div class="admin-field">
                <label>Date</label>
                <input type="date" id="prestDate" value="${todayStr()}" />
              </div>
              <div class="admin-field">
                <label>Formule</label>
                <select id="prestFormule">
                  <option value="Essentiel">Essentiel (49 €)</option>
                  <option value="Premium" selected>Premium (89 €)</option>
                  <option value="Complet">Complet (149 €)</option>
                  <option value="Sur-mesure">Sur-mesure</option>
                </select>
              </div>
              <div class="admin-field">
                <label>Montant (€)</label>
                <input type="number" id="prestMontant" min="0" step="1" value="89" />
              </div>
              <div class="admin-field">
                <label>Note (facultatif)</label>
                <input type="text" id="prestNote" placeholder="Ex: véhicule SUV, état initial délicat…" />
              </div>
              <button class="admin-btn admin-btn--primary" id="btnAddPrestation">
                Valider + créditer les points
              </button>
            </div>
          </div>

          <!-- Points manuels -->
          <div class="admin-action-card">
            <div class="admin-action-card__title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Ajustement manuel des points
            </div>
            <div class="admin-form" id="formManuel">
              <div class="admin-field">
                <label>Action</label>
                <select id="manuelAction">
                  <option value="add">Ajouter des points</option>
                  <option value="remove">Retirer des points</option>
                </select>
              </div>
              <div class="admin-field">
                <label>Nombre de points</label>
                <input type="number" id="manuelPts" min="1" value="10" />
              </div>
              <div class="admin-field">
                <label>Raison</label>
                <input type="text" id="manuelRaison" placeholder="Ex: correction, geste commercial…" />
              </div>
              <button class="admin-btn admin-btn--warn" id="btnManuel">
                Appliquer l'ajustement
              </button>
            </div>
          </div>

          <!-- Valider avis -->
          <div class="admin-action-card">
            <div class="admin-action-card__title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Valider un avis Google
            </div>
            <div class="admin-form">
              <p style="font-size:var(--fs-xs);color:var(--text-muted);line-height:1.5">
                Accordez une réduction de <strong>5 €</strong> au client après vérification de son avis positif sur Google.
              </p>
              <div class="admin-field">
                <label>Commentaire (facultatif)</label>
                <input type="text" id="avisComment" placeholder="Ex: avis vérifié le 12/05/2026" />
              </div>
              <button class="admin-btn admin-btn--success" id="btnValiderAvis">
                Accorder 5 € de réduction
              </button>
            </div>
          </div>

          <!-- Valider parrainage -->
          <div class="admin-action-card">
            <div class="admin-action-card__title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Valider un parrainage
            </div>
            <div class="admin-form">
              ${parrainages.length ? `
                <div class="admin-parr-list" id="parrList">
                  ${parrainages.map(p => `
                    <div class="admin-parr-item">
                      <div>
                        <div class="admin-parr-item__name">${esc(p.filleul?.prenom || 'Filleul')}</div>
                        <div class="admin-parr-item__date">${fmtDate(p.created_at)}</div>
                      </div>
                      <div style="display:flex;align-items:center;gap:.5rem">
                        ${p.valide
                          ? `<span class="admin-parr-item__status admin-parr-item__status--done">Validé</span>`
                          : `<button class="admin-btn admin-btn--success" style="padding:.3rem .625rem"
                                    data-parr-id="${esc(p.id)}">Valider → −10 %</button>`
                        }
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : '<p style="font-size:var(--fs-xs);color:var(--text-dim)">Aucun parrainage en attente.</p>'}
            </div>
          </div>

        </div>

        <!-- Réductions actives -->
        <div class="admin-section">
          <div class="admin-section__title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Réductions disponibles (${reductions.length})
          </div>
          ${reductions.length
            ? `<div class="admin-table-wrap"><table class="admin-table">
                <thead><tr><th>Type</th><th>Description</th><th>Créée le</th></tr></thead>
                <tbody>
                  ${reductions.map(r => `<tr>
                    <td><span class="admin-table__badge admin-table__badge--${r.type === '5eur' ? 'avis' : 'parrainage'}">${r.type === '5eur' ? '5 €' : '−10 %'}</span></td>
                    <td>${esc(r.description)}</td>
                    <td>${fmtDate(r.created_at)}</td>
                  </tr>`).join('')}
                </tbody>
              </table></div>`
            : '<p class="admin-empty">Aucune réduction disponible.</p>'
          }
        </div>

        <!-- Historique prestations -->
        <div class="admin-section">
          <div class="admin-section__title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            Prestations (${prestations.length})
          </div>
          ${prestations.length
            ? `<div class="admin-table-wrap"><table class="admin-table">
                <thead><tr><th>Date</th><th>Formule</th><th>Montant</th><th>Points</th><th>Statut</th></tr></thead>
                <tbody>
                  ${prestations.map(p => `<tr>
                    <td>${fmtDate(p.date)}</td>
                    <td>${esc(p.formule || p.description || '—')}</td>
                    <td>${fmtEur(p.montant)}</td>
                    <td class="admin-table__pts-pos">+${p.points_credited}</td>
                    <td><span class="admin-table__badge admin-table__badge--prestation">${p.statut}</span></td>
                  </tr>`).join('')}
                </tbody>
              </table></div>`
            : '<p class="admin-empty">Aucune prestation.</p>'
          }
        </div>

        <!-- Historique points -->
        <div class="admin-section">
          <div class="admin-section__title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Transactions de points
          </div>
          ${transactions.length
            ? `<div class="admin-table-wrap"><table class="admin-table">
                <thead><tr><th>Date</th><th>Type</th><th>Points</th><th>Description</th></tr></thead>
                <tbody>
                  ${transactions.map(t => `<tr>
                    <td>${fmtDate(t.created_at)}</td>
                    <td><span class="admin-table__badge admin-table__badge--${t.type}">${t.type}</span></td>
                    <td class="${t.montant >= 0 ? 'admin-table__pts-pos' : 'admin-table__pts-neg'}">${t.montant > 0 ? '+' : ''}${t.montant}</td>
                    <td>${esc(t.description || '—')}</td>
                  </tr>`).join('')}
                </tbody>
              </table></div>`
            : '<p class="admin-empty">Aucune transaction.</p>'
          }
        </div>

      </div>
    `;

    // Attacher les listeners sur les boutons du panel rendu
    bindPanelActions(c, parrainages);
  }

  // ── Liaisons actions ──────────────────────────────────────
  function bindPanelActions(c, parrainages) {
    // Préfill montant selon formule
    const formuleSelect = document.getElementById('prestFormule');
    const montantInput  = document.getElementById('prestMontant');
    const formulePrices = { 'Essentiel': 49, 'Premium': 89, 'Complet': 149 };
    formuleSelect?.addEventListener('change', () => {
      const price = formulePrices[formuleSelect.value];
      if (price) montantInput.value = price;
    });

    // Ajouter prestation
    document.getElementById('btnAddPrestation')?.addEventListener('click', async () => {
      const btn     = document.getElementById('btnAddPrestation');
      const date    = document.getElementById('prestDate').value;
      const formule = document.getElementById('prestFormule').value;
      const montant = parseFloat(document.getElementById('prestMontant').value);
      const note    = document.getElementById('prestNote').value.trim();

      if (!date || isNaN(montant) || montant <= 0) {
        toast('Remplissez tous les champs obligatoires.', 'error'); return;
      }

      btn.disabled = true;
      const points = Math.floor(montant);
      const desc   = [formule, note].filter(Boolean).join(' — ');

      const { data: prest, error: pErr } = await sb.from('prestations').insert({
        client_id:       c.id,
        date,
        montant,
        formule,
        description:     desc,
        statut:          'completed',
        points_credited: points
      }).select().single();

      if (pErr) { toast('Erreur lors de l\'ajout de la prestation.', 'error'); btn.disabled = false; return; }

      const { error: tErr } = await sb.from('points_transactions').insert({
        client_id:     c.id,
        montant:       points,
        type:          'prestation',
        description:   `Prestation ${formule} — ${fmtEur(montant)}`,
        prestation_id: prest.id
      });

      if (tErr) { toast('Prestation créée mais erreur sur les points.', 'error'); }
      else       { toast(`Prestation ajoutée. +${points} points crédités.`, 'success'); }

      await refreshClient(c.id);
    });

    // Ajustement manuel
    document.getElementById('btnManuel')?.addEventListener('click', async () => {
      const btn    = document.getElementById('btnManuel');
      const action = document.getElementById('manuelAction').value;
      const pts    = parseInt(document.getElementById('manuelPts').value, 10);
      const raison = document.getElementById('manuelRaison').value.trim();

      if (isNaN(pts) || pts <= 0) { toast('Entrez un nombre de points valide.', 'error'); return; }

      btn.disabled = true;
      const montant = action === 'remove' ? -pts : pts;
      const desc    = raison || (action === 'add' ? 'Ajout manuel' : 'Retrait manuel');

      const { error } = await sb.from('points_transactions').insert({
        client_id:   c.id,
        montant,
        type:        'manuel',
        description: desc
      });

      if (error) { toast('Erreur lors de l\'ajustement.', 'error'); }
      else       { toast(`${montant > 0 ? '+' : ''}${montant} points appliqués.`, 'success'); }

      await refreshClient(c.id);
    });

    // Valider avis
    document.getElementById('btnValiderAvis')?.addEventListener('click', async () => {
      const btn     = document.getElementById('btnValiderAvis');
      const comment = document.getElementById('avisComment').value.trim();

      btn.disabled = true;
      const { error } = await sb.from('reductions').insert({
        client_id:   c.id,
        type:        '5eur',
        description: comment || 'Réduction pour avis Google positif validé par l\'admin'
      });

      if (error) { toast('Erreur lors de la création de la réduction.', 'error'); }
      else       { toast('Réduction de 5 € accordée pour l\'avis.', 'success'); }

      await refreshClient(c.id);
    });

    // Valider parrainage
    adminPanel.querySelectorAll('[data-parr-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const parrId   = btn.dataset.parrId;
        btn.disabled   = true;

        const { error: pErr } = await sb.from('parrainages')
          .update({ valide: true, valide_at: new Date().toISOString(), reduction_creee: true })
          .eq('id', parrId);

        if (pErr) { toast('Erreur lors de la validation.', 'error'); btn.disabled = false; return; }

        const { error: rErr } = await sb.from('reductions').insert({
          client_id:   c.id,
          type:        '10pct',
          description: 'Réduction −10 % obtenue par parrainage validé'
        });

        if (rErr) { toast('Parrainage validé mais erreur sur la réduction.', 'error'); }
        else      { toast('Parrainage validé. Réduction −10 % accordée.', 'success'); }

        await refreshClient(c.id);
      });
    });
  }

  // ── Rechargement client après action ─────────────────────
  async function refreshClient(id) {
    await loadClients();

    const updated = allClients.find(c => c.id === id);
    if (updated) await selectClient(id);
  }

  // ── Déconnexion ───────────────────────────────────────────
  logoutBtn.addEventListener('click', async () => {
    await sb.auth.signOut();
    window.location.href = 'auth.html';
  });

  // ── Toast ─────────────────────────────────────────────────
  function toast(msg, type = 'success') {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.className = `admin-toast admin-toast--${type} is-visible`;
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 3500);
  }

  // ── Helpers ───────────────────────────────────────────────
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtDate(d) {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  function fmtEur(n) {
    return Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  }

  function todayStr() {
    return new Date().toISOString().split('T')[0];
  }

  init();
})();
