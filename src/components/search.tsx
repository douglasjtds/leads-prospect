'use client';

import type { Ref } from 'react';
import { Kbd } from '@/components/ui/kbd';
import { cx } from '@/lib/cx';

interface SearchProps {
  ref?: Ref<HTMLInputElement>;
  termo: string;
  onChange: (termo: string) => void;
  /** Esc: limpa e tira o foco. */
  onLimpar: () => void;
  className?: string;
}

/** Busca sempre visível (PRODUCT-SPEC §7.3). Atalho "/" registrado no shell. */
export function Search({ ref, termo, onChange, onLimpar, className }: SearchProps) {
  return (
    <div role="search" className={cx('relative', className)}>
      <label htmlFor="busca" className="sr-only">
        Buscar por empresa, cidade, nicho ou telefone
      </label>
      <input
        ref={ref}
        id="busca"
        type="search"
        autoComplete="off"
        spellCheck={false}
        placeholder="buscar"
        value={termo}
        onChange={(evento) => onChange(evento.target.value)}
        onKeyDown={(evento) => {
          if (evento.key === 'Escape') {
            evento.preventDefault();
            onLimpar();
          }
        }}
        className={cx(
          'peer h-10 w-full rounded-xs border border-line bg-raised pr-16 pl-3 text-body text-ink',
          'placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden',
          'transition-[border-color] duration-150 ease-out focus:border-ink',
        )}
      />
      {termo ? (
        <button
          type="button"
          onClick={onLimpar}
          className="absolute inset-y-1 right-1 cursor-pointer rounded-xs px-2 text-micro text-ink-muted hover:text-ink"
        >
          limpar <span className="sr-only">a busca</span>
        </button>
      ) : (
        <Kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 peer-focus:hidden">/</Kbd>
      )}
    </div>
  );
}
