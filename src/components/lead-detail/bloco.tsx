import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/** Bloco do detalhe (DESIGN-GUIDELINES §6): divisória `line` e rótulo `label` em minúsculas. */
export function Bloco({ rotulo, children, className }: { rotulo: string; children: ReactNode; className?: string }) {
  const id = `bloco-${rotulo.replace(/\s+/g, '-')}`;
  return (
    <section aria-labelledby={id} className={cx('border-t border-line py-5', className)}>
      <h2 id={id} className="text-label text-ink-muted lowercase">
        {rotulo}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Classes da caixa de texto (DESIGN-GUIDELINES §5, Inputs e textarea): fundo `paper`, raio 2px. */
export const CLASSE_TEXTAREA = cx(
  'block w-full resize-y rounded-xs border border-line bg-paper px-3 py-2.5 text-body text-ink',
  'transition-[border-color] duration-150 ease-out focus:border-ink',
);
