import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SESSION_COOKIE, SESSION_MAX_AGE_S, criarSessao } from '@/lib/auth/session';
import { getEnv } from '@/lib/env';

const bodySchema = z.object({ senha: z.string().min(1).max(200) });

const ATRASO_ERRO_MS = 500;

// O hash iguala os tamanhos, que o timingSafeEqual exige.
function senhaConfere(enviada: string, esperada: string): boolean {
  const a = createHash('sha256').update(enviada).digest();
  const b = createHash('sha256').update(esperada).digest();
  return timingSafeEqual(a, b);
}

function ehLocalhost(request: Request): boolean {
  const { hostname } = new URL(request.url);
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export async function POST(request: Request): Promise<Response> {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ erro: 'Informe a senha.' }, { status: 400 });
  }

  const env = getEnv();
  if (!senhaConfere(body.data.senha, env.APP_PASSWORD)) {
    // Freio simples contra força bruta (ARCHITECTURE §6).
    await new Promise((resolve) => setTimeout(resolve, ATRASO_ERRO_MS));
    return NextResponse.json({ erro: 'Senha incorreta. Tente de novo.' }, { status: 401 });
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE, await criarSessao(env.SESSION_SECRET), {
    httpOnly: true,
    secure: !ehLocalhost(request),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_S,
  });
  return response;
}
