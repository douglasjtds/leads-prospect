'use client';

import { useSyncExternalStore } from 'react';

// Layout de duas colunas a partir de 860px (DESIGN-GUIDELINES §6), o mesmo `desk:` do Tailwind.
const QUERY = '(min-width: 860px)';

function subscribe(ouvinte: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', ouvinte);
  return () => mql.removeEventListener('change', ouvinte);
}

/** true no layout de duas colunas. No servidor e na hidratação, false. */
export function useDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
