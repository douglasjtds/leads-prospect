'use client';

import { useEffect, useSyncExternalStore } from 'react';

// Toast único (DESIGN-GUIDELINES §5): fundo inverse, embaixo ao centro, 2,2s.
// Erros usam a mesma forma, com o texto começando por "Erro:".

const DURACAO_MS = 2200;

interface ToastAtual {
  id: number;
  texto: string;
}

let atual: ToastAtual | null = null;
let seq = 0;
const ouvintes = new Set<() => void>();

function definir(novo: ToastAtual | null) {
  atual = novo;
  for (const ouvinte of ouvintes) ouvinte();
}

export function mostrarToast(texto: string): void {
  seq += 1;
  definir({ id: seq, texto });
}

export function mostrarErro(mensagem: string): void {
  mostrarToast(mensagem.startsWith('Erro:') ? mensagem : `Erro: ${mensagem}`);
}

function subscribe(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function Toast() {
  const toast = useSyncExternalStore(
    subscribe,
    () => atual,
    () => null,
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      if (atual?.id === toast.id) definir(null);
    }, DURACAO_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-5">
      {toast ? (
        <p
          key={toast.id}
          data-surface="inverse"
          className="max-w-[560px] animate-toast-in rounded-xs bg-inverse px-4 py-2.5 text-small text-on-inverse"
        >
          {toast.texto}
        </p>
      ) : null}
    </div>
  );
}
