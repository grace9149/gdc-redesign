// Keep the /charlotte site on *.pages.dev only; the custom domain sends visitors to the main homepage.
export async function onRequest({ request, next }) {
  const host = new URL(request.url).hostname;
  if (!host.endsWith('.pages.dev')) return Response.redirect(new URL('/', request.url).href, 302);
  return next();
}
