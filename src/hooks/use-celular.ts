'use client';

import { useSyncExternalStore } from 'react';
import { ehCelular } from '@/lib/whatsapp';

// Celular ou desktop (ARCHITECTURE §8). Não muda durante a sessão, então não há o que ouvir.
// No servidor e na hidratação vale desktop; depois, o valor real.

function subscribe(): () => void {
  return () => {};
}

export function useCelular(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => ehCelular(navigator.userAgent, navigator.maxTouchPoints),
    () => false,
  );
}
