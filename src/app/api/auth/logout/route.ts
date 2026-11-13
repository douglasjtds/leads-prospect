import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/session';

export function POST(): Response {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
