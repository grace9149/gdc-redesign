// ── NAV: switch to light mode when scrolled past hero ──
const nav = document.getElementById('nav');
const hero = document.querySelector('.hero');
function updateNav() {
  if (!hero) return;
  const pastHero = window.scrollY > hero.offsetHeight - 80;
  nav.classList.toggle('light', pastHero);
}
window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

// ── MOBILE MENU ──
const burger = document.getElementById('nav-burger');
const drawer = document.getElementById('nav-drawer');
if (burger && drawer) {
  burger.addEventListener('click', () => {
    const open = drawer.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
  });
  drawer.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      drawer.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('click', e => {
    if (!nav.contains(e.target)) {
      drawer.classList.remove('open');
      burger.classList.remove('open');
    }
  });
}

// ── MANUFACTURER FILTER ──
document.querySelectorAll('.ftab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.ftab').forEach(t => t.classList.remove('is-active'));
    tab.classList.add('is-active');
    const filter = tab.dataset.filter;
    document.querySelectorAll('.mcard').forEach(card => {
      card.classList.toggle('hidden', filter !== 'all' && card.dataset.cat !== filter);
    });
  });
});

// ── SCROLL REVEAL ──
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('in'));
}

// ── SMOOTH SCROLL ──
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#') return;
    const target = document.querySelector(id);
    if (target) {
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' });
    }
  });
});
