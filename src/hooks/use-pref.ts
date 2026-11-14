'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { VARIANTES, type Variante } from '@/lib/domain/types';
import { ABRIR_EM, type AbrirEm } from '@/lib/whatsapp';

// Preferências do navegador (meta diária, abrir no web ou app, curta ou completa).
// localStorage sempre em try/catch: pode estar bloqueado ou indisponível.
// No servidor e na hidratação vale o padrão; depois, o valor salvo.

const ouvintes = new Set<() => void>();

function avisar() {
  for (const ouvinte of ouvintes) ouvinte();
}

function subscribe(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  window.addEventListener('storage', ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener('storage', ouvinte);
  };
}

function ler(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: string): void {
  try {
    window.localStorage.setItem(chave, valor);
  } catch {
    // Sem armazenamento: a preferência vale só até recarregar.
  }
  avisar();
}

/**
 * Lê e grava uma preferência. `parse` devolve null para valor ausente ou inválido, e aí vale o padrão.
 * T precisa ser primitivo (string ou número) para o snapshot ser estável.
 */
export function usePref<T extends string | number>(
  chave: string,
  padrao: T,
  parse: (bruto: string) => T | null,
): [T, (valor: T) => void] {
  const valor = useSyncExternalStore(
    subscribe,
    () => {
      const bruto = ler(chave);
      return bruto === null ? padrao : (parse(bruto) ?? padrao);
    },
    () => padrao,
  );
  const definir = useCallback((novo: T) => gravar(chave, String(novo)), [chave]);
  return [valor, definir];
}

export const META_PADRAO = 25;

function parseMeta(bruto: string): number | null {
  const n = Number(bruto);
  return Number.isInteger(n) && n >= 1 && n <= 200 ? n : null;
}

/** Meta diária de novos envios (PRODUCT-SPEC §7.7), padrão 25. */
export function useMeta(): [number, (valor: number) => void] {
  return usePref('lp:meta', META_PADRAO, parseMeta);
}

function parseVariante(bruto: string): Variante | null {
  return (VARIANTES as readonly string[]).includes(bruto) ? (bruto as Variante) : null;
}

/** Versão da 1ª mensagem (PRODUCT-SPEC §7.5), padrão curta. */
export function useVariante(): [Variante, (valor: Variante) => void] {
  return usePref<Variante>('lp:variante', 'curta', parseVariante);
}

function parseAbrirEm(bruto: string): AbrirEm | null {
  return (ABRIR_EM as readonly string[]).includes(bruto) ? (bruto as AbrirEm) : null;
}

/** Onde abrir o chat: WhatsApp Web ou app (ARCHITECTURE §8), padrão web. */
export function useAbrirEm(): [AbrirEm, (valor: AbrirEm) => void] {
  return usePref<AbrirEm>('lp:abrir', 'whatsapp web', parseAbrirEm);
}
