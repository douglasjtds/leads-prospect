// Destino depois do login. Só aceita caminho interno, para o ?next= não virar open redirect.

const BASE = 'http://interno.invalid';

export function destinoSeguro(next: string | null | undefined): string {
  if (!next || !next.startsWith('/')) return '/';
  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return '/';
  }
  // "//evil.com" e "/\evil.com" mudam a origem ao serem resolvidos.
  if (url.origin !== BASE) return '/';
  const { pathname } = url;
  if (pathname === '/login' || pathname === '/api' || pathname.startsWith('/api/')) return '/';
  // Valida o que é devolvido de fato: "/.//evil.com" normaliza para "//evil.com" sem mudar a origem.
  const destino = `${pathname}${url.search}${url.hash}`;
  if (!destino.startsWith('/') || destino.startsWith('//') || destino.startsWith('/\\')) return '/';
  return destino;
}
