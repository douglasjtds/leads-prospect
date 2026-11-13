'use client';

import { useEffect, useRef } from 'react';

// Atalhos de teclado (PRODUCT-SPEC §7.8). Atalhos de letra e "/" não disparam com foco em
// campo de texto; Esc dispara sempre (limpa e tira o foco).

export type Tecla = '/' | 'Escape' | 'c' | 'e' | 'j' | 'k';
export type Atalhos = Partial<Record<Tecla, () => void>>;

function emCampoDeTexto(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  if (alvo.isContentEditable) return true;
  if (alvo instanceof HTMLTextAreaElement || alvo instanceof HTMLSelectElement) return true;
  if (alvo instanceof HTMLInputElement) {
    return !['button', 'checkbox', 'radio', 'submit', 'reset'].includes(alvo.type);
  }
  return false;
}

export function useShortcuts(atalhos: Atalhos): void {
  const ref = useRef(atalhos);
  useEffect(() => {
    ref.current = atalhos;
  });

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.defaultPrevented || evento.isComposing) return;
      if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
      const tecla = evento.key === 'Escape' ? 'Escape' : evento.key.toLowerCase();
      if (tecla !== 'Escape' && emCampoDeTexto(evento.target)) return;
      const acao = ref.current[tecla as Tecla];
      if (!acao) return;
      evento.preventDefault();
      acao();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);
}
