import { NextResponse } from 'next/server';

// Proxy (antigo middleware). Na Fase 4 passa a exigir sessão em tudo menos /login e /api/auth/*.
export function proxy(): NextResponse {
  return NextResponse.next();
}
