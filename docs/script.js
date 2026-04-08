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
const properties = [
  {
    "id": "telegrafen-oevre-torvgate-26",
    "address": "Telegrafen, Øvre Torvgate 26–28, Gjøvik",
    "type": "Kontor",
    "category": "naering",
    "sqm": "35–650 kvm",
    "floors": "Flere etasjer",
    "status": "Ledig",
    "renovated": "2024",
    "parking": "30 innendørs, 70 utendørs",
    "facilities": ["Aircondition/Ventilasjon", "Bredbånd", "Heis"],
    "description": "Telegrafen er et rehabilitert signalbygg i Gjøvik sentrum. Moderne kontorlokaler over flere etasjer med fleksible størrelser. Renovert i 2024.",
    "contact": { "name": "Eldar Sofienlund", "phone": "930 20 001", "email": "eldar@mjoseneiendom.no" },
    "coordinates": [60.7962, 10.6925],
    "image": null
  },
  {
    "id": "storgata-10-kontor",
    "address": "Storgata 10, Gjøvik",
    "type": "Kontor",
    "category": "naering",
    "sqm": "15–450 kvm",
    "floors": "1.–7. etasje",
    "status": "Ledig",
    "renovated": "2018",
    "parking": "30 innendørs, 20 utendørs",
    "facilities": ["Aircondition/Ventilasjon", "Bredbånd", "Heis"],
    "description": "Sentralt moderne kontorlokale i hjertet av Gjøvik sentrum. Fleksibelt areal over 7 etasjer – tilpasses leietagers behov.",
    "contact": { "name": "Eldar Sofienlund", "phone": "930 20 001", "email": "eldar@mjoseneiendom.no" },
    "coordinates": [60.7958, 10.6921],
    "image": null
  },
  {
    "id": "storgata-8-naering",
    "address": "Storgata 8, Gjøvik",
    "type": "Butikk/Næring",
    "category": "naering",
    "sqm": "15–400 kvm",
    "floors": "1.–4. etasje",
    "status": "Ledig",
    "renovated": null,
    "parking": "Nærhet til kommunalt parkeringshus",
    "facilities": ["Aircondition/Ventilasjon", "Bredbånd", "Heis"],
    "description": "Kontor- og butikklokaler sentralt i Gjøvik. Inngang fra gateplan. Lokalet kan enkelt tilpasses størrelse og behov.",
    "contact": { "name": "Eldar Sofienlund", "phone": "930 20 001", "email": "eldar@mjoseneiendom.no" },
    "coordinates": [60.7955, 10.6918],
    "image": null
  },
  {
    "id": "storgata-3-naering",
    "address": "Storgata 3, Gjøvik",
    "type": "Butikk/Næring",
    "category": "naering",
    "sqm": "50–500 kvm",
    "floors": "1.–5. etasje",
    "status": "Ledig",
    "renovated": null,
    "parking": "10 plasser",
    "facilities": ["Aircondition/Ventilasjon", "Bredbånd", "Heis"],
    "description": "Kontor- og butikklokaler i Storgata 3 med god synlighet og sentral beliggenhet. Fleksible størrelser over 5 etasjer.",
    "contact": { "name": "Eldar Sofienlund", "phone": "930 20 001", "email": "eldar@mjoseneiendom.no" },
    "coordinates": [60.7950, 10.6910],
    "image": null
  },
  {
    "id": "storgata-1-naering",
    "address": "Storgata 1, Gjøvik",
    "type": "Butikk/Næring",
    "category": "naering",
    "sqm": "85–130 kvm",
    "floors": "1. etasje",
    "status": "Ledig",
    "renovated": null,
    "parking": null,
    "facilities": ["Aircondition/Ventilasjon", "Bredbånd"],
    "description": "Butikklokale i 1. etasje med inngang fra Storgata. God eksponering og sentralt i gangtrafikken i Gjøvik sentrum.",
    "contact": { "name": "Eldar Sofienlund", "phone": "930 20 001", "email": "eldar@mjoseneiendom.no" },
    "coordinates": [60.7945, 10.6905],
    "image": null
  },
  {
    "id": "hunnsveien-5",
    "address": "Hunnsveien 5, Gjøvik",
    "type": "Butikk/Næring",
    "category": "naering",
    "sqm": "50–600 kvm",
    "floors": "1.–5. etasje",
    "status": "Ledig",
    "renovated": null,
    "parking": null,
    "facilities": ["Aircondition/Ventilasjon", "Bredbånd", "Heis"],
    "description": "Butikk- og kontorlokaler i Hunnsveien 5. Stort spenn i størrelser gjør eiendommen egnet for en rekke ulike leietakere.",
    "contact": { "name": "Eldar Sofienlund", "phone": "930 20 001", "email": "eldar@mjoseneiendom.no" },
    "coordinates": [60.7940, 10.6895],
    "image": null
  },
  {
    "id": "glassverksgata-5-naering",
    "address": "Glassverksgata 5, Gjøvik",
    "type": "Butikk/Næring",
    "category": "naering",
    "sqm": "35–250 kvm",
    "floors": "1.–4. etasje",
    "status": "Ledig",
    "renovated": null,
    "parking": null,
    "facilities": ["Aircondition/Ventilasjon", "Bredbånd", "Heis"],
    "description": "Butikk- og kontorlokaler i Glassverksgata 5, like ved Storgata. Sentral beliggenhet med gangavstand til det meste.",
    "contact": { "name": "Eldar Sofienlund", "phone": "930 20 001", "email": "eldar@mjoseneiendom.no" },
    "coordinates": [60.7952, 10.6912],
    "image": null
  },
  {
    "id": "fahlstromsplassen-1",
    "address": "Fahlstrømsplassen 1, Gjøvik",
    "type": "Kontor",
    "category": "naering",
    "sqm": "30–500 kvm",
    "floors": "1.–5. etasje",
    "status": "Ledig",
    "renovated": null,
    "parking": "7 plasser",
    "facilities": ["Aircondition/Ventilasjon", "Bredbånd", "Heis"],
    "description": "Kontorlokaler ved Fahlstrømsplassen i Gjøvik sentrum. Gode parkeringsmuligheter og enkel adkomst.",
    "contact": { "name": "Eldar Sofienlund", "phone": "930 20 001", "email": "eldar@mjoseneiendom.no" },
    "coordinates": [60.7948, 10.6900],
    "image": null
  },
  {
    "id": "hadelandsveien",
    "address": "Hadelandsveien, Gjøvik",
    "type": "Lager/Verksted",
    "category": "naering",
    "sqm": "15–2500 kvm",
    "floors": "2 plan",
    "status": "Ledig",
    "renovated": null,
    "parking": "ca. 50 plasser",
    "facilities": ["Verksted", "Lager", "Kontor"],
    "description": "Stort og fleksibelt næringsbygg med verksted, lager og kontorfasiliteter fordelt på to plan. Rikelig med parkering. Egnet for logistikk, håndverk og industri.",
    "contact": { "name": "Eldar Sofienlund", "phone": "930 20 001", "email": "eldar@mjoseneiendom.no" },
    "coordinates": [60.8010, 10.7000],
    "image": null
  },
  {
    "id": "bryggeveien-7-9",
    "address": "Bryggeveien 7–9, Gjøvik",
    "type": "Kontor",
    "category": "naering",
    "sqm": "590 kvm næring + 160 kvm tilleggsbygg",
    "floors": null,
    "status": "Ledig",
    "renovated": null,
    "parking": "ca. 65 plasser",
    "facilities": ["Aircondition/Ventilasjon", "Bredbånd"],
    "description": "Kontor- og næringslokaler ved Mjøsa med sjeldent gode parkeringsmuligheter. Tilleggsbygg på 160 kvm inkludert.",
    "contact": { "name": "Eldar Sofienlund", "phone": "930 20 001", "email": "eldar@mjoseneiendom.no" },
    "coordinates": [60.7930, 10.6880],
    "image": null
  },
  {
    "id": "kontrollveien-3",
    "address": "Kontrollveien 3, Gjøvik",
    "type": "Lager/Verksted",
    "category": "naering",
    "sqm": "Kontorbygg 265 kvm + Verksted/lager 487 kvm",
    "floors": null,
    "status": "Ledig",
    "renovated": null,
    "parking": "30+ plasser",
    "facilities": ["Verksted/lagerbygg", "Kontorbygg"],
    "description": "Fleksibel eiendom med separat kontorbygg og verksted/lagerbygg. Godt egnet for håndverk, logistikk eller kombinert bruk.",
    "contact": { "name": "Eldar Sofienlund", "phone": "930 20 001", "email": "eldar@mjoseneiendom.no" },
    "coordinates": [60.7920, 10.6870],
    "image": null
  },
  {
    "id": "storgata-10-no10",
    "address": "Storgata 10, Gjøvik – NO10 Kontorhotell",
    "type": "Kontor",
    "category": "naering",
    "sqm": "Fleksibelt",
    "floors": null,
    "status": "Ledig",
    "renovated": "2018",
    "parking": "Tilgjengelig",
    "facilities": ["Bredbånd", "Møterom", "Resepsjon", "Kantine"],
    "description": "NO10 Kontorhotell tilbyr fleksibel kontorplass med alle fasiliteter inkludert. Ideelt for enkeltpersoner og mindre team som ønsker profesjonelle omgivelser uten langsiktige forpliktelser.",
    "contact": { "name": "Eldar Sofienlund", "phone": "930 20 001", "email": "eldar@mjoseneiendom.no" },
    "coordinates": [60.7960, 10.6923],
    "image": null
  },
  {
    "id": "gjoevik-overnatting",
    "address": "Kyrre Grepps gate 23, Gjøvik",
    "type": "Smarthotell",
    "category": "bolig",
    "sqm": "25–35 kvm",
    "floors": null,
    "status": "Ledig",
    "renovated": "2005",
    "parking": "30 plasser",
    "facilities": ["Heis", "Ventilasjon", "Fiber/bredbånd"],
    "description": "Gjøvik Overnatting er et moderne smarthotell sentralt i Gjøvik. Perfekt for forretningsreisende og besøkende til regionen.",
    "contact": { "name": "Christoffer Beck", "phone": "943 78 000", "email": "christoffer@mjoseneiendom.no" },
    "coordinates": [60.7966, 10.6930],
    "image": null
  },
  {
    "id": "glassverksgata-5-bolig",
    "address": "Glassverksgata 5, Gjøvik",
    "type": "Leilighet",
    "category": "bolig",
    "sqm": "60–100 kvm",
    "floors": null,
    "status": "Ledig",
    "renovated": null,
    "parking": null,
    "facilities": ["Terrasse (noen enheter)", "Inntil 3 soverom"],
    "description": "Leiligheter med og uten terrasse i Glassverksgata 5. Romslige enheter med opptil 3 soverom, sentralt i Gjøvik.",
    "contact": { "name": "Christoffer Beck", "phone": "943 78 000", "email": "christoffer@mjoseneiendom.no" },
    "coordinates": [60.7953, 10.6913],
    "image": null
  },
  {
    "id": "storgata-3-bolig",
    "address": "Storgata 3, Gjøvik",
    "type": "Leilighet",
    "category": "bolig",
    "sqm": "60–80 kvm",
    "floors": "Toppetasje",
    "status": "Ledig",
    "renovated": "2015",
    "parking": null,
    "facilities": ["Terrasse", "Fiber/bredbånd"],
    "description": "Leiligheter i toppetasjen i Storgata 3 med privat terrasse. Lyst og romslig med utsikt over Gjøvik sentrum.",
    "contact": { "name": "Christoffer Beck", "phone": "943 78 000", "email": "christoffer@mjoseneiendom.no" },
    "coordinates": [60.7951, 10.6911],
    "image": null
  },
  {
    "id": "storgata-1-bolig",
    "address": "Storgata 1A, Gjøvik",
    "type": "Leilighet",
    "category": "bolig",
    "sqm": "20–123 kvm",
    "floors": null,
    "status": "Ledig",
    "renovated": "2013–2016",
    "parking": null,
    "facilities": ["Fiber/bredbånd"],
    "description": "Leiligheter og hybler i varierende størrelser i Storgata 1A. Renovert i perioden 2013–2016. Sentralt og praktisk.",
    "contact": { "name": "Christoffer Beck", "phone": "943 78 000", "email": "christoffer@mjoseneiendom.no" },
    "coordinates": [60.7945, 10.6905],
    "image": null
  },
  {
    "id": "tordenskioldsgate-11",
    "address": "Tordenskioldsgate 11, Gjøvik",
    "type": "Leilighet",
    "category": "bolig",
    "sqm": null,
    "floors": null,
    "status": "Ledig",
    "renovated": "2021",
    "parking": null,
    "facilities": ["Fiber/bredbånd", "12 leiligheter totalt"],
    "description": "12 moderne leiligheter fra 2 til 4 rom, renovert i 2021. Rolig gate med kort gangavstand til Gjøvik sentrum.",
    "contact": { "name": "Christoffer Beck", "phone": "943 78 000", "email": "christoffer@mjoseneiendom.no" },
    "coordinates": [60.7970, 10.6930],
    "image": null
  },
  {
    "id": "storgata-8-bolig",
    "address": "Storgata 8, Gjøvik",
    "type": "Leilighet",
    "category": "bolig",
    "sqm": "20–110 kvm",
    "floors": null,
    "status": "Ledig",
    "renovated": "2016",
    "parking": null,
    "facilities": ["Aircondition/Ventilasjon", "Bredbånd", "Heis"],
    "description": "Sentralt beliggende leiligheter og hybler i Storgata 8. Varierende størrelser tilgjengelig, renovert i 2016.",
    "contact": { "name": "Christoffer Beck", "phone": "943 78 000", "email": "christoffer@mjoseneiendom.no" },
    "coordinates": [60.7954, 10.6917],
    "image": null
  }
];

state.properties = properties;

if (naeringList)                              { renderNaering(); }
if (boligList)                               { renderBolig();   }
if (document.getElementById('property-map'))   { initNaeringMap(); }
if (document.getElementById('kontakt-map'))    { initKontaktMap(); }
if (document.getElementById('single-pin-map')) { initSinglePinMap(); }
if (document.getElementById('map-naering'))    { initStorgata8Maps(); }

initFilters();
initModal();
initMobileNav();
setActiveNavLink();
initTabs();

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
