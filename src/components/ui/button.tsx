import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { Kbd } from './kbd';

export type ButtonVariant = 'primary' | 'confirm' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Ícone à esquerda (16px, currentColor). */
  icon?: ReactNode;
  /** Atalho exibido em <kbd> à direita, como no CTA do site. */
  shortcut?: string;
}

// DESIGN-GUIDELINES §5, Botões: 40px de altura, raio 4px, peso 500.
const variantes: Record<ButtonVariant, string> = {
  primary: 'border-accent bg-accent text-on-accent hover:border-accent-hover hover:bg-accent-hover',
  confirm: 'border-ink bg-ink text-on-inverse hover:border-ink-muted hover:bg-ink-muted',
  secondary: 'border-ink bg-transparent text-ink hover:bg-surface',
  ghost: 'border-line bg-transparent text-ink hover:border-ink',
};

const escuro: Record<ButtonVariant, boolean> = {
  primary: true,
  confirm: true,
  secondary: false,
  ghost: false,
};

export function Button({
  variant = 'secondary',
  icon,
  shortcut,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm border px-4',
        'text-body font-medium whitespace-nowrap select-none',
        'transition-[color,background-color,border-color] duration-150 ease-out',
        'disabled:pointer-events-none disabled:opacity-50',
        variantes[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      {shortcut ? (
        <Kbd onDark={escuro[variant]} className="ml-1">
          {shortcut}
        </Kbd>
      ) : null}
    </button>
  );
}
