/* ============================================
   GDC Redesign — Shared JS
   Scroll fade-ins, nav scroll state, mobile menu, parallax
   ============================================ */

// ---- SCROLL FADE-IN ----
const fadeEls = document.querySelectorAll('.fade-in');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const siblings = Array.from(entry.target.parentElement.querySelectorAll('.fade-in'));
      const index = siblings.indexOf(entry.target);
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, index * 80);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

fadeEls.forEach(el => observer.observe(el));

// ---- NAV SCROLL STATE ----
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ---- MOBILE MENU ----
const toggle = document.getElementById('navToggle');
const links  = document.getElementById('navLinks');

if (toggle && links) {
  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
  });
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });
}

// ---- PARALLAX CARDS ----
const parallaxCards = document.querySelectorAll('.parallax-card');

if (parallaxCards.length && window.innerWidth > 768) {
  // Set initial staggered offsets
  parallaxCards.forEach((card, i) => {
    const speed = parseFloat(card.dataset.speed) || 0;
    card.style.transform = `translateY(${i % 2 === 0 ? 0 : 40}px)`;
  });

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        parallaxCards.forEach((card) => {
          const speed = parseFloat(card.dataset.speed) || 0;
          const rect = card.closest('section').getBoundingClientRect();
          const sectionTop = rect.top + scrollY;
          const relativeScroll = scrollY - sectionTop + window.innerHeight;
          const offset = relativeScroll * speed;
          card.style.transform = `translateY(${offset}px)`;
        });
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// ---- LOCATIONS MAP ----
if (document.getElementById('map') && typeof L !== 'undefined') {
  const locations = [
    { city: "Fishkill",         state: "NY", zip: "12524", lat: 41.5362, lng: -73.8996 },
    { city: "New Windsor",      state: "NY", zip: "12553", lat: 41.4751, lng: -74.0096 },
    { city: "Napa",             state: "CA", zip: "94559", lat: 38.2975, lng: -122.2869 },
    { city: "Van Nuys",         state: "CA", zip: "91405", lat: 34.1897, lng: -118.4490 },
    { city: "Novato",           state: "CA", zip: "94945", lat: 38.1074, lng: -122.5697 },
    { city: "Gilroy",           state: "CA", zip: "95020", lat: 37.0058, lng: -121.5683 },
    { city: "Niverville",       state: "NY", zip: "12130", lat: 42.4398, lng: -73.6582 },
    { city: "Rio Rancho",       state: "NM", zip: "87124", lat: 35.2328, lng: -106.6630 },
    { city: "Sacramento",       state: "CA", zip: "95825", lat: 38.5816, lng: -121.4944 },
    { city: "Kennesaw",         state: "GA", zip: "30152", lat: 34.0234, lng: -84.6155 },
    { city: "Star",             state: "ID", zip: "83669", lat: 43.6924, lng: -116.4897 },
    { city: "Beloit",           state: "WI", zip: "53511", lat: 42.5083, lng: -89.0318 },
    { city: "Rancho Cucamonga", state: "CA", zip: "91701", lat: 34.1064, lng: -117.5931 },
    { city: "Ft. Wright",       state: "KY", zip: "41011", lat: 39.0514, lng: -84.5313 },
    { city: "Pine Bush",        state: "NY", zip: "12566", lat: 41.6076, lng: -74.2907 },
    { city: "Walnut Creek",     state: "CA", zip: "94596", lat: 37.9101, lng: -122.0652 },
    { city: "Portland",         state: "OR", zip: "97206", lat: 45.4871, lng: -122.6008 },
    { city: "Dallas",           state: "TX", zip: "75219", lat: 32.8135, lng: -96.8120 },
    { city: "Youngstown",       state: "OH", zip: "44515", lat: 41.0998, lng: -80.6495 },
    { city: "Wallkill",         state: "NY", zip: "12589", lat: 41.6012, lng: -74.1657 },
    { city: "Casa Grande",      state: "AZ", zip: "85122", lat: 32.8795, lng: -111.7574 },
    { city: "North Liberty",    state: "IA", zip: "52317", lat: 41.7494, lng: -91.5988 },
    { city: "Laurelville",      state: "OH", zip: "43135", lat: 39.4748, lng: -82.7374 },
    { city: "Baltimore",        state: "MD", zip: "21229", lat: 39.2784, lng: -76.7074 },
    { city: "Cincinnati",       state: "OH", zip: "45247", lat: 39.2128, lng: -84.6202 },
    { city: "Asheville",        state: "NC", zip: "28803", lat: 35.5951, lng: -82.5515 },
    { city: "Heber Springs",    state: "AR", zip: "72543", lat: 35.4912, lng: -92.0296 },
    { city: "Naugatuck",        state: "CT", zip: "06770", lat: 41.4865, lng: -73.0507 },
    { city: "Pewaukee",         state: "WI", zip: "53072", lat: 43.0808, lng: -88.2526 },
  ];

  const locMap = L.map('map', {
    center: [39.5, -98.35],
    zoom: 4,
    zoomControl: true,
    scrollWheelZoom: false,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(locMap);

  const goldIcon = L.divIcon({
    className: '',
    html: `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.625 14 22 14 22S28 23.625 28 14C28 6.268 21.732 0 14 0z" fill="#B8975A"/>
      <circle cx="14" cy="14" r="5.5" fill="white"/>
    </svg>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -38],
  });

  locations.forEach((loc) => {
    L.marker([loc.lat, loc.lng], { icon: goldIcon })
      .addTo(locMap)
      .bindPopup(`
        <div class="popup-city">${loc.city}</div>
        <div class="popup-state">${loc.state} ${loc.zip}</div>
      `);
  });
}
