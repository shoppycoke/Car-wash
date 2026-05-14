/* ============================================================
   GOOGLE REVIEWS — Chargement automatique via Places API
   ============================================================

   Pour activer l'affichage automatique des avis :

   ÉTAPE 1 — Trouvez votre Place ID :
     → https://developers.google.com/maps/documentation/places/web-service/place-id
     → Cherchez "Clairys Auto" dans le champ de recherche

   ÉTAPE 2 — Créez une clé API gratuite :
     → https://console.cloud.google.com
     → Activez "Maps JavaScript API" + "Places API"
     → Créez une clé API, restreignez-la à votre domaine

   ÉTAPE 3 — Remplissez les deux constantes ci-dessous
   ============================================================ */

const GOOGLE_PLACE_ID = '';  /* ex: 'ChIJxxxxxxxxxxxxxxxxxxxxxxxx' */
const GOOGLE_API_KEY  = '';  /* ex: 'AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx' */
const MIN_RATING      = 4;   /* Affiche uniquement les avis ≥ 4 étoiles */

/* Palette couleurs avatars */
const AVATAR_COLORS = [
  { bg: 'rgba(58,134,255,0.18)',  text: '#3A86FF' },
  { bg: 'rgba(91,192,190,0.18)',  text: '#5BC0BE' },
  { bg: 'rgba(74,222,128,0.16)',  text: '#4ade80' },
  { bg: 'rgba(248,113,113,0.16)', text: '#F87171' },
  { bg: 'rgba(167,139,250,0.16)', text: '#A78BFA' },
  { bg: 'rgba(251,191,36,0.16)',  text: '#FBBF24' },
];

export function initReviews() {
  if (!GOOGLE_PLACE_ID || !GOOGLE_API_KEY) return; /* pas configuré → état vide */

  /* Injecter le SDK Maps une seule fois */
  if (!window.google) {
    window.__initGooglePlaces = loadPlaces;
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places&callback=__initGooglePlaces`;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  } else {
    loadPlaces();
  }
}

function loadPlaces() {
  const service = new google.maps.places.PlacesService(document.createElement('div'));
  service.getDetails(
    { placeId: GOOGLE_PLACE_ID, fields: ['rating', 'user_ratings_total', 'reviews'] },
    (place, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !place) return;
      updateScore(place);
      updateGrid(place.reviews || []);
    }
  );
}

/* ── Mise à jour du bloc note ── */
function updateScore(place) {
  const rating = place.rating;
  const total  = place.user_ratings_total;

  const elRating = document.getElementById('reviewsRating');
  const elStars  = document.getElementById('reviewsStars');
  const elCount  = document.getElementById('reviewsCount');

  if (elRating && rating) elRating.textContent = rating.toFixed(1);

  if (elStars && rating) {
    const full    = Math.floor(rating);
    const partial = rating % 1 >= 0.5 ? 1 : 0;
    const empty   = 5 - full - partial;
    elStars.setAttribute('aria-label', `${rating.toFixed(1)} étoiles sur 5`);
    elStars.innerHTML =
      '<span aria-hidden="true">★</span>'.repeat(full) +
      (partial ? '<span aria-hidden="true" style="opacity:.55">★</span>' : '') +
      '<span aria-hidden="true" style="opacity:.22">★</span>'.repeat(empty);
  }

  if (elCount && total) {
    elCount.textContent = `${total} avis Google`;
  }
}

/* ── Mise à jour de la grille ── */
function updateGrid(reviews) {
  const grid = document.getElementById('reviewsGrid');
  if (!grid) return;

  const filtered = reviews.filter(r => r.rating >= MIN_RATING);
  if (!filtered.length) return; /* aucun avis qualifié → garde l'état vide */

  grid.innerHTML = filtered.map(buildCard).join('');

  /* Déclenche les animations d'entrée */
  grid.querySelectorAll('.review-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 80}ms`;
    requestAnimationFrame(() => card.classList.add('is-visible'));
  });
}

/* ── Construction d'une carte ── */
function buildCard(review) {
  const initials = review.author_name
    .split(' ')
    .map(w => w[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const color   = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const stars   = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  const timeAgo = formatTime(review.time);
  const text    = escHtml(review.text).replace(/\n/g, ' ');

  return `<article class="review-card animate-on-scroll">
    <div class="review-card__stars" aria-label="${review.rating} étoiles">${stars}</div>
    <p class="review-card__text">"${text}"</p>
    <div class="review-card__author">
      <svg class="review-card__avatar" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
        <circle cx="20" cy="20" r="20" fill="${color.bg}"/>
        <text x="20" y="26" text-anchor="middle" font-family="Inter,sans-serif" font-size="14" font-weight="600" fill="${color.text}">${initials}</text>
      </svg>
      <div><strong>${escHtml(review.author_name)}</strong><span>${timeAgo}</span></div>
    </div>
  </article>`;
}

/* ── Helpers ── */
function formatTime(ts) {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 86400)    return "Aujourd'hui";
  if (s < 604800)   return `Il y a ${Math.floor(s / 86400)} jour${Math.floor(s/86400) > 1 ? 's' : ''}`;
  if (s < 2592000)  return `Il y a ${Math.floor(s / 604800)} semaine${Math.floor(s/604800) > 1 ? 's' : ''}`;
  if (s < 31536000) return `Il y a ${Math.floor(s / 2592000)} mois`;
  return `Il y a ${Math.floor(s / 31536000)} an${Math.floor(s/31536000) > 1 ? 's' : ''}`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
