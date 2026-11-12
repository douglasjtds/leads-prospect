import { cx } from '@/lib/cx';

interface SegmentedProps<T extends string> {
  /** Rótulo acessível do grupo (ex.: "versão da mensagem"). */
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Segmentado (DESIGN-GUIDELINES §5): mono `micro`, borda `line`, opção ativa fundo `ink`. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx('inline-flex rounded-xs border border-line bg-raised p-0.5', className)}
    >
      {options.map((option) => {
        const ativo = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={ativo}
            onClick={() => onChange(option)}
            className={cx(
              'h-9 cursor-pointer rounded-xs px-2.5 text-micro desk:h-7',
              'transition-[color,background-color] duration-150 ease-out',
              ativo ? 'bg-ink text-on-inverse' : 'text-ink-muted hover:text-ink',
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
