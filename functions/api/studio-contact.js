// Cloudflare Pages Function: POST /api/studio-contact (contact form for /studio)
// Env vars (set in the Cloudflare dashboard, never in git):
//   RESEND_API_KEY  - Resend API key
//   CONTACT_TO      - inbox that receives inquiries
//   CONTACT_FROM    - verified sender, e.g. "Website <hello@yourdomain.com>"

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ error: 'Invalid request' }, 400); }

  // Honeypot: bots fill the hidden field. Pretend success.
  if (d.company_url) return json({ ok: true });

  const name = String(d.name || '').trim().slice(0, 120);
  const email = String(d.email || '').trim().slice(0, 200);
  const message = String(d.message || '').trim().slice(0, 4000);
  if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: 'Please fill in your name, a valid email and a message' }, 400);
  }
  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) {
    return json({ error: 'Email is not configured yet' }, 500);
  }

  const rows = [
    ['Name', name], ['Email', email], ['Business', d.business], ['Website', d.website], ['Package', d.package],
  ].map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#666">${k}</td><td>${esc(v)}</td></tr>`).join('');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO],
      reply_to: email,
      subject: `New site review request from ${name}`,
      html: `<table>${rows}</table><p style="white-space:pre-wrap">${esc(message)}</p>`,
    }),
  });
  if (!res.ok) return json({ error: 'We could not send your message' }, 502);
  return json({ ok: true });
}
