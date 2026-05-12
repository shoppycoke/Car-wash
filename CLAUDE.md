# CLAUDE.md — sitedtl

Site vitrine pour un service de detailing automobile premium à domicile (région toulousaine — La Salvetat-Saint-Gilles).
Stack 100% vanilla : HTML/CSS/JS, aucun framework, modules ES6.

---

## Structure des fichiers

```
index.html
css/
  main.css              — imports uniquement
  base/
    variables.css       — tous les tokens CSS (couleurs, typo, spacing, radius, easing)
    reset.css           — reset + règles section + breakpoints globaux
    components.css      — .btn, .section-head, .section-title, .text-accent
  layout/
    header.css          — header sticky + menu mobile
    footer.css          — footer responsive
    mobile-bar.css      — barre fixe mobile + FAB WhatsApp desktop
  sections/
    hero.css
    services.css
    before-after.css
    gallery.css
    review.css
    loyalty.css
    zone.css
    booking.css
    faq.css
  animations.css        — page-loader, scroll-nav dots, anim-left/right/blur/scale
js/
  main.js               — orchestrateur (DOMContentLoaded)
  smooth-scroll.js      — scroll cinématique desktop (easeInOutQuart, 900ms)
  scroll-nav.js         — dots de navigation + barre de progression + keyboard
  scroll-next.js        — bouton flèche bas dans chaque section
  header.js             — sticky header + burger menu + scroll spy
  animations.js         — IntersectionObserver + stagger delays
  parallax.js           — parallax hero background (desktop uniquement)
  tilt.js               — 3D tilt cards (desktop uniquement)
  before-after.js       — slider avant/après drag+touch
  loyalty.js            — copie code parrainage
  calendly.js           — fallback si Calendly non configuré
  faq.js                — accordion FAQ
  page-loader.js        — loader initial
```

---

## Ordre des sections (index.html)

1. Hero (`#hero`)
2. Services (`#services`)
3. Avant/Après (`#before-after`)
4. Galerie (`#gallery`)
5. Avis (`#reviews`)
6. Fidélité (`#loyalty`)
7. Zone d'intervention (`#zone`)
8. Réservation (`#booking`)
9. FAQ (`#faq`)
10. Footer

---

## Système de design

### Palette (dark luxury)
- `--bg: #0B132B` — fond principal
- `--bg-elev-1/2/3` — élévations successives
- `--accent: #5BC0BE` — cyan turquoise
- `--electric: #3A86FF` — bleu électrique
- `--gradient-accent` — cyan → bleu (CTA principaux)

Fonds alternés sur sections : `.services, .gallery, .faq, .booking { background: var(--bg-elev-1) }` — défini dans `reset.css` et `booking.css`.

### Easing premium (variables.css)
- `--ease-smooth: cubic-bezier(0.16, 1, 0.3, 1)` — easeOutExpo iOS-like
- `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)` — easeInOutCubic
- `--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1)`
- `--transition-fast: 0.18s`, `--transition-base: 0.38s`, `--transition-slow: 0.72s`

### Boutons (components.css)
- `.btn--accent` — gradient électrique bleu, CTA principal
- `.btn--ghost` — glassmorphism avec border
- `.btn--outline` — transparent + border
- `.btn--lg` — grand format, `border-radius: full`
- `.btn--block` — width 100%
- Tous les boutons ont `touch-action: manipulation` et `-webkit-tap-highlight-color: transparent`

---

## Système de scroll

### Desktop (pointer: fine — souris/trackpad)
`smooth-scroll.js` prend le contrôle **en premier** (`initSmoothScroll()` est appelé avant tout autre init dans `main.js`).
- Désactive le CSS snap : `document.documentElement.style.scrollSnapType = 'none'`
- Animation : easeInOutQuart, 900ms, `requestAnimationFrame` GPU-accéléré
- Molette standard (`deltaMode !== 0`) → déclenchement immédiat
- Trackpad (`deltaMode === 0`) → accumulation 60px threshold avant déclenchement
- Expose `window.__scrollToSection(element)` pour tous les autres modules

### Mobile / tablette (pointer: coarse — touch)
`smooth-scroll.js` ne s'active pas. CSS scroll-snap natif :
- `html { scroll-snap-type: y mandatory; scroll-behavior: smooth }`
- `section { scroll-snap-align: start; scroll-snap-stop: always }` — desktop ≥901px
- `section { scroll-snap-stop: normal }` — mobile ≤900px (permet de défiler librement dans les sections hautes)

### Navigation par dots / clavier / flèche bas
Tous les modules utilisent `window.__scrollToSection(el)` en priorité, avec fallback `scrollIntoView({ behavior: 'smooth', block: 'start' })` pour mobile :
- `scroll-nav.js` — dots latéraux + flèches clavier
- `scroll-next.js` — bouton chevron bas dans chaque section
- Les deux utilisent le fallback identique

---

## Responsive — règles et breakpoints

### Breakpoints actifs
| Seuil | Comportement principal |
|---|---|
| ≤1024px | Sections : `justify-content: flex-start` (hero reste `center`) |
| ≤900px | Barre mobile visible, nav masquée, burger actif, `scroll-snap-stop: normal` |
| ≤768px | Grilles → 1 colonne (services, reviews), menu mobile padding-bottom, glows animés désactivés |
| ≤480px | Typo compressée, CTA empilés, gallery 2 colonnes, Calendly 520px, petits paddings |
| ≤360px | Bouton WhatsApp barre mobile → icône seule |

### RÈGLE ABSOLUE iOS Safari — NE JAMAIS VIOLER
**Ne jamais ajouter `overflow-x: hidden` sur `body`** — cela brise `position: fixed` sur iOS Safari (la barre mobile suit le scroll au lieu de rester fixe).
`overflow-x: hidden` existe uniquement sur `html`.

### Mobile bar (≤900px)
```css
position: fixed; bottom: 0; left: 0; right: 0; width: 100%; z-index: 99999;
```
- **Pas de `transform`** sur la barre — brise le repère de positionnement iOS
- Animation d'entrée via `opacity` uniquement (jamais via `translateY`)
- `padding-bottom: max(env(safe-area-inset-bottom, 0px), 10px)` — iPhone notch
- Classe `is-visible` ajoutée par JS après 1050ms (après le page-loader)

### Clearance barre mobile dans les sections
Toutes les sections ont un `padding-bottom` qui inclut la hauteur de la barre (~80px) :
- ≤900px : `calc(var(--space-16) + 80px)` ≈ 144px
- ≤768px : `calc(var(--space-12) + 80px)` ≈ 128px
- ≤480px : `calc(var(--space-8) + 80px)` ≈ 112px

**Exception hero** : `hero.css` override le `padding-bottom` de la section. Il doit impérativement conserver le clearance :
```css
padding-bottom: calc(var(--space-8) + 72px + env(safe-area-inset-bottom, 0px));
```

### FAB WhatsApp desktop
`position: fixed; bottom: 32px; right: 32px; z-index: var(--z-floating)` — visible uniquement via `@media (min-width: 901px)` dans `mobile-bar.css`. Masqué par défaut (`.whatsapp-fab { display: none }`).

---

## Menu mobile (header.css)

- `max-height: calc(100dvh - var(--header-height)); overflow-y: auto` — scrollable si long
- `padding-bottom: calc(var(--space-6) + 80px + env(safe-area-inset-bottom, 0px))` — dernier lien visible au-dessus de la barre mobile
- `header.js` bloque le scroll body (`document.body.style.overflow = 'hidden'`) quand le menu est ouvert — le ferme au clic sur un lien

---

## Sections supprimées (ne pas réintroduire)

- **"Notre histoire" (about)** — section, `css/sections/about.css`, import dans `main.css`, liens dans nav/footer, dot dans `scroll-nav`, stats/values dans `animations.js` → tout supprimé

---

## Points de vigilance

### Sections hautes sur mobile
Services (3 cartes), Booking (Calendly), Reviews (6 cartes), Gallery dépassent 100dvh sur mobile. C'est voulu : `scroll-snap-stop: normal` à ≤900px permet de scroller librement à l'intérieur, puis de snapper à la section suivante.

### Calendly
- Widget : `min-width: 320px; height: 720px` inline dans HTML
- Overrides CSS avec `!important` dans `booking.css` : `580px` ≤768px, `520px` ≤480px
- Fallback `#bookingFallback` (display:none) activé par script après 4s si pas d'iframe

### Animations mobile
- Glows du hero : `animation: none` à ≤768px (coût `filter: blur(140px)` sur deux éléments animés)
- `tilt.js` + `parallax.js` : `if (matchMedia('(hover: none)').matches) return` — désactivés sur touch
- `backdrop-filter: blur()` conservé sur mobile (design premium, GPU-accéléré sur iOS 9+)

### Overflow horizontal
- `overflow-wrap: break-word` sur `body` — prévient les débordements de mots longs
- `overflow: hidden` sur toutes les `section` — clippe les glows et décorations absolus
- Ne pas ajouter `overflow-x: hidden` à `body` (règle iOS ci-dessus)

### Z-index stack
| Élément | z-index |
|---|---|
| Header | 100 (`--z-header`) |
| Scroll-nav dots | 10 (`--z-elevated`) |
| WhatsApp FAB | 200 (`--z-floating`) |
| Mobile bar | 99999 |
| Page loader | 9999 |

---

## Identité — déjà renseignée

| Élément | Valeur |
|---|---|
| Nom | **Dracarys Auto** |
| Logo | `assets/images/logo.png` (PNG 1080×1080, dragon + voiture, fond noir) |
| Favicon | `<link rel="icon" type="image/png" href="assets/images/logo.png">` |

## Ce qui reste à personnaliser (placeholders)

| Placeholder | Emplacement |
|---|---|
| `+33600000000` | `index.html` — mobile-bar, zone, footer WhatsApp |
| `LIEN_CALENDLY` | `index.html` — `data-url` du widget Calendly |
| `LIEN_GOOGLE` | `index.html` — liens avis Google dans reviews |
| `@nom_instagram` | `index.html` — carte Instagram dans gallery |
| `votre-domaine.fr` | `index.html` — meta canonical, OG url, schema.org |
| `hero-bg.jpg` | `assets/images/` — photo hero (LCP, preload déjà en place) |
| `before-1.jpg` / `after-1.jpg` | `assets/images/before-after/` |
