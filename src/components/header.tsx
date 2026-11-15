import type { ReactNode } from 'react';

interface HeaderProps {
  /** Campo de busca. */
  busca: ReactNode;
  /** Novos enviados hoje e meta do dia. null enquanto carrega. */
  contador: { enviados: number; meta: number } | null;
}

/** Header fixo de 64px (DESIGN-GUIDELINES §6). O contador some abaixo de 860px. */
export function Header({ busca, contador }: HeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 h-header border-b border-line bg-paper">
      <div className="mx-auto flex h-full max-w-content items-center gap-4 px-5 md:px-8 desk:gap-6">
        <p className="shrink-0 font-bold tracking-[-0.02em] whitespace-nowrap">
          Douglas Tertuliano
          <span className="hidden font-mono text-label tracking-normal font-normal text-ink-muted sm:inline"> / prospecção</span>
        </p>
        <div className="min-w-0 flex-1 desk:max-w-[480px]">{busca}</div>
        {contador ? (
          <p className="ml-auto hidden shrink-0 text-label whitespace-nowrap text-ink-muted desk:block">
            hoje{' '}
            <span className="text-ink">
              {contador.enviados}/{contador.meta}
            </span>{' '}
            novos
          </p>
        ) : null}
      </div>
    </header>
  );
}
