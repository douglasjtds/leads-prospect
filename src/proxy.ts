import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verificarSessao } from '@/lib/auth/session';
import { getEnv } from '@/lib/env';

// Proxy (antigo middleware): exige sessão em tudo menos /login e /api/auth/* (ARCHITECTURE §6).
// Os dados são telefones de terceiros: nada além do login responde sem sessão.

function ehPublico(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/api/auth/');
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  if (ehPublico(pathname)) return NextResponse.next();

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && (await verificarSessao(cookie, getEnv().SESSION_SECRET))) {
    return NextResponse.next();
  }

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return NextResponse.json({ erro: 'Sessão expirada. Entre de novo.' }, { status: 401 });
  }

  const login = new URL('/login', request.url);
  if (pathname !== '/') login.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  // Lista explícita de estáticos. Liberar "qualquer caminho com extensão" abriria
  // /api/leads/x.png sem sessão.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico$).*)'],
};
