import type { Status } from '@/lib/domain/types';
import { cx } from '@/lib/cx';

// DESIGN-GUIDELINES §3, tabela "Status → pill". O texto do status é sempre escrito (§9).
const estilos: Record<Status, string> = {
  'A contatar': 'border-line bg-paper text-ink',
  Contatado: 'border-line bg-surface text-ink',
  'Resposta automática': 'border-warn-soft-edge bg-warn-soft text-warn',
  Respondeu: 'border-accent-soft-edge bg-accent-soft text-accent-hover',
  'Reunião marcada': 'border-accent-soft-edge bg-accent-soft text-accent-hover',
  'Proposta enviada': 'border-violet-soft-edge bg-violet-soft text-ink',
  Fechado: 'border-ok-soft-edge bg-ok-soft text-ok',
  'Sem interesse': 'border-line bg-transparent text-ink-muted line-through',
};

export function Pill({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex h-5 shrink-0 items-center rounded-xs border px-1.5 text-micro whitespace-nowrap',
        estilos[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
