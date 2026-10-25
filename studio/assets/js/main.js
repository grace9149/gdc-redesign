// Mobile menu
const menuBtn = document.querySelector('.menu-btn');
const links = document.querySelector('.nav-links');
if (menuBtn && links) {
  menuBtn.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
}

// Scroll reveal
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// Contact form -> /api/contact (Cloudflare Pages Function)
const form = document.querySelector('#contact-form');
if (form) {
  const msg = form.querySelector('.form-msg');
  const show = (cls, text) => { msg.className = 'form-msg ' + cls; msg.textContent = text; };
  const params = new URLSearchParams(location.search);
  const pkg = params.get('package');
  if (pkg && form.elements.package) form.elements.package.value = pkg;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const res = await fetch('/api/studio-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Something went wrong');
      form.reset();
      show('ok', 'Thank you! Your request is in and you will hear back within one business day.');
    } catch (err) {
      show('err', err.message + '. Please try again or email us directly.');
    } finally {
      btn.disabled = false; btn.textContent = 'Request my free site review';
    }
  });
}

// Look picker (design previews). Remove this block and the .look-picker CSS once a look is chosen.
(() => {
  const looks = [
    ['clay', 'Clay & Cream', '#d4623a'],
    ['ocean', 'Ocean', '#0e8f9c'],
    ['plum', 'Plum & Blush', '#c2307a'],
    ['midnight', 'Midnight & Gold', '#d9ab4e'],
    ['silhouette', 'Silhouette AF-655', '#57504c'],
    ['espresso', 'Cloud Dancer & Espresso', 'linear-gradient(135deg,#f1efea 50%,#2e1f17 50%)'],
  ];
  const root = document.documentElement;
  let cur = new URLSearchParams(location.search).get('look');
  try { cur = cur || localStorage.getItem('look'); } catch (e) {}
  const apply = (name) => {
    if (name === 'clay' || !looks.some((l) => l[0] === name)) root.removeAttribute('data-look');
    else root.setAttribute('data-look', name);
    try { localStorage.setItem('look', name); } catch (e) {}
    box.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.look === (root.dataset.look || 'clay')));
  };
  const box = document.createElement('div');
  box.className = 'look-picker';
  box.innerHTML = '<span>Look</span>' + looks.map(([k, label, c]) =>
    `<button data-look="${k}" title="${label}" aria-label="${label}" style="background:${c}"></button>`).join('');
  box.addEventListener('click', (e) => { if (e.target.dataset.look) apply(e.target.dataset.look); });
  document.body.appendChild(box);
  apply(cur || 'clay');
})();
