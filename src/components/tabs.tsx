'use client';

import { useRef, type KeyboardEvent } from 'react';
import { cx } from '@/lib/cx';

export type Aba = 'hoje' | 'todos' | 'numeros';

export const ABAS: ReadonlyArray<{ id: Aba; rotulo: string }> = [
  { id: 'hoje', rotulo: 'Hoje' },
  { id: 'todos', rotulo: 'Todos' },
  { id: 'numeros', rotulo: 'Números' },
];

export const idPainel = (aba: Aba) => `painel-${aba}`;
export const idAba = (aba: Aba) => `aba-${aba}`;

interface TabsProps {
  ativa: Aba;
  onChange: (aba: Aba) => void;
  /** Contagem em mono ao lado do rótulo; ausente não mostra nada. */
  contagens: Partial<Record<Aba, number>>;
}

/** Abas com borda inferior accent na ativa (DESIGN-GUIDELINES §5 e §9: role="tablist", setas). */
export function Tabs({ ativa, onChange, contagens }: TabsProps) {
  const refs = useRef<Partial<Record<Aba, HTMLButtonElement | null>>>({});

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    const i = ABAS.findIndex((a) => a.id === ativa);
    let destino: number | null = null;
    if (evento.key === 'ArrowRight') destino = (i + 1) % ABAS.length;
    if (evento.key === 'ArrowLeft') destino = (i - 1 + ABAS.length) % ABAS.length;
    if (evento.key === 'Home') destino = 0;
    if (evento.key === 'End') destino = ABAS.length - 1;
    if (destino === null) return;
    evento.preventDefault();
    const aba = ABAS[destino]!.id;
    onChange(aba);
    refs.current[aba]?.focus();
  }

  return (
    <div role="tablist" aria-label="Listas" onKeyDown={aoTeclar} className="flex h-full items-stretch gap-5">
      {ABAS.map(({ id, rotulo }) => {
        const selecionada = id === ativa;
        const contagem = contagens[id];
        return (
          <button
            key={id}
            ref={(el) => {
              refs.current[id] = el;
            }}
            id={idAba(id)}
            type="button"
            role="tab"
            aria-selected={selecionada}
            aria-controls={idPainel(id)}
            tabIndex={selecionada ? 0 : -1}
            onClick={() => onChange(id)}
            className={cx(
              '-mb-px flex cursor-pointer items-center gap-1.5 border-b-2 text-body',
              'transition-[color,border-color] duration-150 ease-out focus-visible:outline-offset-[-2px]',
              selecionada ? 'border-accent font-semibold text-ink' : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {rotulo}
            {contagem !== undefined ? <span className="text-micro font-normal text-ink-muted">{contagem}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
