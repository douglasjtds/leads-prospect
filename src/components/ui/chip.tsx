import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  active: boolean;
}

/**
 * Chip de status (DESIGN-GUIDELINES §5): raio 2px, 32px no desktop (40px no mobile, §9),
 * `small`. Botão com aria-pressed.
 */
export function Chip({ active, className, type = 'button', ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cx(
        'inline-flex h-10 cursor-pointer items-center rounded-xs border px-3 text-small whitespace-nowrap desk:h-8',
        'transition-[color,background-color,border-color] duration-150 ease-out',
        active
          ? 'border-ink bg-ink text-on-inverse'
          : 'border-line bg-raised text-ink hover:border-ink',
        className,
      )}
      {...props}
    />
  );
}
