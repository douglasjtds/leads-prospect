'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Acao } from '@/lib/domain/types';
import { CLASSE_TEXTAREA } from './bloco';

interface NotesProps {
  /** Valor salvo. O componente é remontado (key) quando ele muda. */
  observacoes: string;
  aplicar: (acao: Acao) => void;
}

/** Observações com Salvar (PRODUCT-SPEC §7.5). */
export function Notes({ observacoes, aplicar }: NotesProps) {
  const [texto, setTexto] = useState(observacoes);
  const mudou = texto !== observacoes;
  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        if (mudou) aplicar({ tipo: 'salvarObs', texto });
      }}
    >
      <label htmlFor="observacoes" className="sr-only">
        Observações
      </label>
      <textarea
        id="observacoes"
        rows={3}
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        placeholder="Anotações livres"
        className={`${CLASSE_TEXTAREA} placeholder:text-ink-muted`}
      />
      <Button type="submit" variant="secondary" className="mt-3" disabled={!mudou}>
        Salvar
      </Button>
    </form>
  );
}
