import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

interface KbdProps {
  children: ReactNode;
  /** Dentro de botão escuro (primary/confirm): borda branca 35% e fundo transparente. */
  onDark?: boolean;
  className?: string;
}

/** Tecla de atalho (DESIGN-GUIDELINES §5, Kbd). */
export function Kbd({ children, onDark = false, className }: KbdProps) {
  return (
    <kbd
      className={cx(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-xs border px-1 text-micro',
        onDark ? 'border-kbd-on-dark-edge bg-transparent text-inherit' : 'border-line bg-raised text-ink-muted',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
