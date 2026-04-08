'use strict';

/* ══════════════════════════════════════════════════════════════
   MJØSEN EIENDOM – script.js
   Works across: index.html, naering.html, bolig.html,
                 kontakt.html, property-*.html
   All DOM operations are guarded with null-checks so the
   script never throws on pages that don't have a given element.
══════════════════════════════════════════════════════════════ */

// ── Property → page mapping ────────────────────────────────────
const PROPERTY_PAGE_LINKS = {
  'telegrafen-oevre-torvgate-26': 'property-telegrafen.html',
  'storgata-10-kontor':           'property-storgata10.html',
  'storgata-8-naering':           'property-storgata8.html',
};

// ── State ──────────────────────────────────────────────────────
const state = {
  properties:       [],
  naeringFilter:    'alle',
  boligFilter:      'alle',
  naeringLedigOnly: false,
  boligLedigOnly:   false,
  map:              null,
  markers:          {},
  activeMarkerId:   null,
};

// ── Cached DOM refs (may be null on pages without them) ────────
const naeringList   = document.getElementById('naering-list');
const boligList     = document.getElementById('bolig-list');
const modalOverlay  = document.getElementById('modal-overlay');
const modalClose    = document.getElementById('modal-close');

/* ══════════════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════════════ */
fetch('../content/properties.json')
  .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
  .then(data => {
    state.properties = data;

    if (naeringList)                           { renderNaering(); }
    if (boligList)                             { renderBolig();   }
    if (document.getElementById('property-map'))  { initNaeringMap(); }
    if (document.getElementById('kontakt-map'))   { initKontaktMap(); }
    if (document.getElementById('single-pin-map')){ initSinglePinMap(); }
    if (document.getElementById('map-naering'))   { initStorgata8Maps(); }

    initFilters();
    initModal();
    initMobileNav();
    setActiveNavLink();
    initTabs();
  })
  .catch(err => {
    console.error('Kunne ikke laste eiendommer:', err);
    if (naeringList) naeringList.innerHTML =
      '<p class="no-results">Kunne ikke laste eiendommer. Åpne via en lokal server.</p>';
  });

/* ══════════════════════════════════════════════════════════════
   NÆRING MAP  (#property-map — naering.html + index.html)
══════════════════════════════════════════════════════════════ */
function initNaeringMap() {
  const mapEl = document.getElementById('property-map');
  if (!mapEl) return;

  const map = L.map(mapEl, {
    center: [60.7954, 10.6917],
    zoom: 15,
    zoomControl: true,
    scrollWheelZoom: false,
  });
  state.map = map;
  addCartoLayer(map);

  const mapCategory = mapEl.dataset.mapCategory;
  state.properties
    .filter(p => p.coordinates)
    .filter(p => !mapCategory || p.category === mapCategory)
    .forEach(prop => addNaeringMarker(prop));
}

function addNaeringMarker(prop) {
  const marker = L.marker(prop.coordinates, {
    icon: makePinIcon(false),
    title: prop.address,
  });

  marker.bindPopup(buildPopupHtml(prop), { maxWidth: 260, minWidth: 200 });

  marker.on('click', () => {
    setActiveMarker(prop.id);
    highlightCard(prop.id);
    scrollCardIntoView(prop.id);
  });

  marker.on('popupopen', () => {
    setTimeout(() => {
      const btn = document.querySelector(`.map-popup__btn[data-popup-id="${prop.id}"]`);
      if (!btn) return;
      btn.addEventListener('click', () => {
        if (PROPERTY_PAGE_LINKS[prop.id]) {
          window.location.href = PROPERTY_PAGE_LINKS[prop.id];
        } else {
          openModal(prop);
        }
      });
    }, 30);
  });

  marker.addTo(state.map);
  state.markers[prop.id] = marker;
}

/* ══════════════════════════════════════════════════════════════
   KONTAKT MAP  (#kontakt-map — all 18 pins, no sidebar)
══════════════════════════════════════════════════════════════ */
function initKontaktMap() {
  const mapEl = document.getElementById('kontakt-map');
  if (!mapEl) return;

  const map = L.map(mapEl, {
    center: [60.7954, 10.6917],
    zoom: 14,
    zoomControl: true,
    scrollWheelZoom: false,
  });
  addCartoLayer(map);

  state.properties
    .filter(p => p.coordinates)
    .forEach(prop => {
      const marker = L.marker(prop.coordinates, {
        icon: makePinIcon(false),
        title: prop.address,
      });
      marker.bindPopup(buildPopupHtml(prop), { maxWidth: 240 });
      marker.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.querySelector(`.map-popup__btn[data-popup-id="${prop.id}"]`);
          if (btn) btn.addEventListener('click', () => {
            if (PROPERTY_PAGE_LINKS[prop.id]) {
              window.location.href = PROPERTY_PAGE_LINKS[prop.id];
            }
          });
        }, 30);
      });
      marker.addTo(map);
    });
}

/* ══════════════════════════════════════════════════════════════
   SINGLE-PIN MAP  (#single-pin-map — property pages)
   Reads [data-lat] and [data-lng] from the element.
══════════════════════════════════════════════════════════════ */
function initSinglePinMap() {
  const mapEl = document.getElementById('single-pin-map');
  if (!mapEl) return;

  const lat = parseFloat(mapEl.dataset.lat);
  const lng = parseFloat(mapEl.dataset.lng);
  if (isNaN(lat) || isNaN(lng)) return;

  const map = L.map(mapEl, {
    center: [lat, lng],
    zoom: 16,
    zoomControl: false,
    scrollWheelZoom: false,
    dragging: false,
  });
  addCartoLayer(map);

  L.marker([lat, lng], { icon: makePinIcon(true) }).addTo(map);
}

/* ══════════════════════════════════════════════════════════════
   STORGATA 8 MAPS  (#map-naering + #map-bolig)
   Two separate Leaflet instances sharing the same pin coordinate.
   invalidateSize() is called on tab switch (see initTabs).
══════════════════════════════════════════════════════════════ */
function initStorgata8Maps() {
  const COORDS = [60.7955, 10.6918];
  const MAP_OPTIONS = {
    zoom: 16,
    zoomControl: false,
    scrollWheelZoom: false,
    dragging: false,
  };

  const naeringEl = document.getElementById('map-naering');
  const boligEl   = document.getElementById('map-bolig');

  if (naeringEl) {
    const mapN = L.map(naeringEl, { ...MAP_OPTIONS, center: COORDS });
    addCartoLayer(mapN);
    L.marker(COORDS, { icon: makePinIcon(true) }).addTo(mapN);
    state.mapNaering = mapN;
  }

  if (boligEl) {
    const mapB = L.map(boligEl, { ...MAP_OPTIONS, center: COORDS });
    addCartoLayer(mapB);
    L.marker(COORDS, { icon: makePinIcon(true) }).addTo(mapB);
    state.mapBolig = mapB;
  }
}

/* ══════════════════════════════════════════════════════════════
   MAP HELPERS
══════════════════════════════════════════════════════════════ */
function addCartoLayer(map) {
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
  }).addTo(map);
}

function makePinIcon(highlighted = false) {
  return L.divIcon({
    className: '',
    html: `<div class="map-pin${highlighted ? ' highlighted' : ''}"></div>`,
    iconSize:    [14, 14],
    iconAnchor:  [7, 7],
    popupAnchor: [0, -12],
  });
}

function buildPopupHtml(prop) {
  return `
    <div class="map-popup">
      <div class="map-popup__address">${prop.address}</div>
      <div class="map-popup__meta">${prop.type}${prop.sqm ? ' · ' + prop.sqm : ''}</div>
      <button class="map-popup__btn" data-popup-id="${prop.id}">Se detaljer →</button>
    </div>`;
}

function setActiveMarker(id) {
  Object.entries(state.markers).forEach(([mid, marker]) => {
    marker.setIcon(makePinIcon(mid === id));
  });
  state.activeMarkerId = id || null;
}

function panToMarker(prop) {
  if (!state.map || !prop.coordinates) return;
  state.map.setView(prop.coordinates, Math.max(state.map.getZoom(), 16), { animate: true });
  const marker = state.markers[prop.id];
  if (marker) marker.openPopup();
}

/* ══════════════════════════════════════════════════════════════
   CARD RENDERING – NÆRING (list layout)
══════════════════════════════════════════════════════════════ */
function renderNaering() {
  if (!naeringList) return;
  const filtered = state.properties
    .filter(p => p.category === 'naering')
    .filter(p => state.naeringFilter === 'alle' || p.type === state.naeringFilter)
    .filter(p => !state.naeringLedigOnly || p.status === 'Ledig');

  naeringList.innerHTML = '';
  if (filtered.length === 0) {
    naeringList.innerHTML = '<p class="no-results">Ingen lokaler matcher valgte filtre.</p>';
    return;
  }
  filtered.forEach(prop => naeringList.appendChild(buildNaeringCard(prop)));
}

function buildNaeringCard(prop) {
  const card = document.createElement('article');
  card.className = 'property-card';
  card.dataset.propertyId = prop.id;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label',
    `${prop.address} – ${prop.type}${prop.sqm ? ', ' + prop.sqm : ''}`);

  const statusClass = prop.status === 'Ledig' ? 'badge--ledig' : 'badge--utleid';
  const imgSrc = `https://picsum.photos/seed/${prop.id}/800/500`;

  card.innerHTML = `
    <div class="property-card__image" aria-hidden="true">
      <img src="${imgSrc}"
           alt="Bilde av ${prop.address}"
           loading="lazy"
           style="width:100%;height:100%;object-fit:cover;border-radius:3px;">
    </div>
    <div class="property-card__body">
      <div class="property-card__header">
        <h3 class="property-card__address">${prop.address}</h3>
        <span class="badge ${statusClass}">${prop.status}</span>
      </div>
      <div class="property-card__meta">
        <span class="property-card__type">${prop.type}</span>
        ${prop.sqm    ? `<span class="property-card__meta-item">${prop.sqm}</span>`    : ''}
        ${prop.floors ? `<span class="property-card__meta-item">${prop.floors}</span>` : ''}
      </div>
      <p class="property-card__desc">${prop.description}</p>
    </div>`;

  const isLinked = !!PROPERTY_PAGE_LINKS[prop.id];

  const onClick = () => {
    if (isLinked) {
      window.location.href = PROPERTY_PAGE_LINKS[prop.id];
    } else {
      openModal(prop);
      setActiveMarker(prop.id);
      panToMarker(prop);
      highlightCard(prop.id);
    }
  };

  card.addEventListener('click', onClick);
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
  });

  return card;
}

/* ══════════════════════════════════════════════════════════════
   CARD RENDERING – BOLIG (grid layout)
══════════════════════════════════════════════════════════════ */
function renderBolig() {
  if (!boligList) return;
  const filtered = state.properties
    .filter(p => p.category === 'bolig')
    .filter(p => state.boligFilter === 'alle' || p.type === state.boligFilter)
    .filter(p => !state.boligLedigOnly || p.status === 'Ledig');

  boligList.innerHTML = '';
  if (filtered.length === 0) {
    boligList.innerHTML = '<p class="no-results">Ingen boliger matcher valgte filtre.</p>';
    return;
  }
  filtered.forEach(prop => boligList.appendChild(buildBoligCard(prop)));
}

function buildBoligCard(prop) {
  const card = document.createElement('article');
  card.className = 'property-card property-card--grid';
  card.dataset.propertyId = prop.id;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label',
    `${prop.address} – ${prop.type}${prop.sqm ? ', ' + prop.sqm : ''}`);

  const statusClass = prop.status === 'Ledig' ? 'badge--ledig' : 'badge--utleid';
  const imgSrc = `https://picsum.photos/seed/${prop.id}/800/500`;

  card.innerHTML = `
    <div class="property-card__image" aria-hidden="true">
      <img src="${imgSrc}"
           alt="Bilde av ${prop.address}"
           loading="lazy"
           style="width:100%;height:100%;object-fit:cover;">
    </div>
    <div class="property-card__body">
      <div class="property-card__header">
        <h3 class="property-card__address">${prop.address}</h3>
        <span class="badge ${statusClass}">${prop.status}</span>
      </div>
      <div class="property-card__meta">
        <span class="property-card__type">${prop.type}</span>
        ${prop.sqm ? `<span class="property-card__meta-item">${prop.sqm}</span>` : ''}
      </div>
      <p class="property-card__desc">${prop.description}</p>
    </div>`;

  card.addEventListener('click', () => openModal(prop));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
  });
  return card;
}

/* ══════════════════════════════════════════════════════════════
   CARD HIGHLIGHT & SCROLL
══════════════════════════════════════════════════════════════ */
function highlightCard(id) {
  document.querySelectorAll('.property-card').forEach(c => c.classList.remove('highlighted'));
  const card = document.querySelector(`[data-property-id="${id}"]`);
  if (card) card.classList.add('highlighted');
}

function scrollCardIntoView(id) {
  const card = document.querySelector(`[data-property-id="${id}"]`);
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ══════════════════════════════════════════════════════════════
   FILTERS
══════════════════════════════════════════════════════════════ */
function initFilters() {
  // Næring type chips
  document.querySelectorAll('[data-filter-naering]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.naeringFilter = btn.dataset.filterNaering;
      syncChips('[data-filter-naering]', btn);
      renderNaering();
    });
  });

  const naeringToggle = document.getElementById('naering-ledig-toggle');
  if (naeringToggle) {
    naeringToggle.addEventListener('change', e => {
      state.naeringLedigOnly = e.target.checked;
      renderNaering();
    });
  }

  // Bolig type chips
  document.querySelectorAll('[data-filter-bolig]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.boligFilter = btn.dataset.filterBolig;
      syncChips('[data-filter-bolig]', btn);
      renderBolig();
    });
  });

  const boligToggle = document.getElementById('bolig-ledig-toggle');
  if (boligToggle) {
    boligToggle.addEventListener('change', e => {
      state.boligLedigOnly = e.target.checked;
      renderBolig();
    });
  }
}

function syncChips(selector, activeBtn) {
  document.querySelectorAll(selector).forEach(b => {
    b.classList.toggle('active', b === activeBtn);
    b.setAttribute('aria-pressed', b === activeBtn ? 'true' : 'false');
  });
}

/* ══════════════════════════════════════════════════════════════
   MODAL  (present on index.html, naering.html, bolig.html)
══════════════════════════════════════════════════════════════ */
function initModal() {
  if (!modalOverlay || !modalClose) return;

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
  });
}

function openModal(prop) {
  if (!modalOverlay) return;

  const badge = document.getElementById('modal-badge');
  if (badge) {
    badge.className = `badge ${prop.status === 'Ledig' ? 'badge--ledig' : 'badge--utleid'}`;
    badge.textContent = prop.status;
  }

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('modal-type',  prop.type);
  setEl('modal-title', prop.address);
  setEl('modal-desc',  prop.description);

  const specsEl = document.getElementById('modal-specs');
  if (specsEl) {
    const specs = [
      { label: 'Areal',     value: prop.sqm        || '–' },
      { label: 'Type',      value: prop.type              },
      { label: 'Etasjer',   value: prop.floors     || '–' },
      { label: 'Renovert',  value: prop.renovated  || '–' },
      { label: 'Parkering', value: prop.parking    || '–' },
      { label: 'Status',    value: prop.status           },
    ];
    specsEl.innerHTML = specs.map(s => `
      <div class="spec-item">
        <div class="spec-item__label">${s.label}</div>
        <div class="spec-item__value">${s.value}</div>
      </div>`).join('');
  }

  const facilWrap = document.getElementById('modal-facilities-wrap');
  const facilList = document.getElementById('modal-facilities');
  if (facilWrap && facilList) {
    if (prop.facilities && prop.facilities.length > 0) {
      facilList.innerHTML = prop.facilities.map(f => `<span class="facility-tag">${f}</span>`).join('');
      facilWrap.style.display = '';
    } else {
      facilWrap.style.display = 'none';
    }
  }

  if (prop.contact) {
    setEl('modal-contact-name',  prop.contact.name);
    setEl('modal-contact-phone', prop.contact.phone);
    const ctaBtn = document.getElementById('modal-cta-btn');
    if (ctaBtn) ctaBtn.href = `tel:${prop.contact.phone.replace(/\s/g, '')}`;
  }

  modalOverlay.classList.add('open');
  modalOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => { if (modalClose) modalClose.focus(); });
}

function closeModal() {
  if (!modalOverlay) return;
  modalOverlay.classList.remove('open');
  modalOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* ══════════════════════════════════════════════════════════════
   NAV ACTIVE STATE
   On index.html: IntersectionObserver drives it.
   On all other pages: match by filename.
══════════════════════════════════════════════════════════════ */
function setActiveNavLink() {
  const filename = window.location.pathname.split('/').pop() || 'index.html';

  // Pages where a specific nav link should be active
  const pageToHref = {
    'naering.html':               'naering.html',
    'bolig.html':                 'bolig.html',
    'no10.html':                  '#tjenester',
    'kontakt.html':               'kontakt.html',
    'property-telegrafen.html':   'naering.html',
    'property-storgata10.html':   'naering.html',
    'property-storgata8.html':    'naering.html',
  };

  const activeHref = pageToHref[filename];
  if (activeHref) {
    document.querySelectorAll('.site-nav__link, .mobile-nav__link').forEach(link => {
      if (link.getAttribute('href') === activeHref) {
        link.classList.add('active');
      }
    });
    return; // Don't run IntersectionObserver on sub-pages
  }

  // index.html: scroll-driven active link
  const sections  = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.site-nav__link');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          const href = link.getAttribute('href');
          link.classList.toggle('active', href === `#${entry.target.id}`);
        });
      }
    });
  }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

  sections.forEach(s => observer.observe(s));
}

/* ══════════════════════════════════════════════════════════════
   MOBILE NAV
══════════════════════════════════════════════════════════════ */
function initMobileNav() {
  const toggle    = document.querySelector('.nav-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  if (!toggle || !mobileNav) return;

  const open = () => {
    toggle.classList.add('open');
    mobileNav.classList.add('open');
    mobileNav.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    toggle.classList.remove('open');
    mobileNav.classList.remove('open');
    mobileNav.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  toggle.addEventListener('click', () =>
    toggle.classList.contains('open') ? close() : open());

  mobileNav.querySelectorAll('.mobile-nav__link').forEach(link =>
    link.addEventListener('click', close));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mobileNav.classList.contains('open')) close();
  });
}

/* ══════════════════════════════════════════════════════════════
   TABS  (property-storgata8.html two-section view)
══════════════════════════════════════════════════════════════ */
function initTabs() {
  const tabBtns = document.querySelectorAll('[data-tab-btn]');
  if (!tabBtns.length) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tabBtn;

      tabBtns.forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });

      document.querySelectorAll('[data-tab-content]').forEach(panel => {
        const isTarget = panel.dataset.tabContent === target;
        panel.hidden = !isTarget;
        panel.setAttribute('aria-hidden', isTarget ? 'false' : 'true');
      });

      // Invalidate the Leaflet instance whose tab just became visible
      if (target === 'naering' && state.mapNaering) {
        state.mapNaering.invalidateSize();
      } else if (target === 'bolig' && state.mapBolig) {
        state.mapBolig.invalidateSize();
      }
    });
  });
}
