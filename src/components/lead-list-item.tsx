import { Pill } from '@/components/ui/pill';
import { cx } from '@/lib/cx';
import { rotuloPrazo } from '@/lib/domain/dates';
import type { DataISO, Lead } from '@/lib/domain/types';

interface LeadListItemProps {
  lead: Lead;
  hoje: DataISO;
  selecionado: boolean;
  onSelect: (placeId: string) => void;
}

function metadados(lead: Lead, hoje: DataISO): string {
  const local = lead.cidade && lead.uf ? `${lead.cidade}/${lead.uf}` : lead.cidade || lead.uf;
  return [
    local,
    lead.nicho,
    lead.avaliacoes ? `${lead.avaliacoes} aval.` : null,
    rotuloPrazo(lead.proxAcao, hoje),
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Item da lista (DESIGN-GUIDELINES §5): padding 11px 20px, divisória `line`.
 * Selecionado: fundo `raised` e barra interna de 3px `accent` à esquerda.
 */
export function LeadListItem({ lead, hoje, selecionado, onSelect }: LeadListItemProps) {
  return (
    <li>
      <button
        type="button"
        data-place-id={lead.placeId}
        aria-current={selecionado ? 'true' : undefined}
        onClick={() => onSelect(lead.placeId)}
        className={cx(
          'relative block w-full cursor-pointer border-b border-line px-5 py-[11px] text-left',
          'transition-[background-color] duration-150 ease-out hover:bg-raised focus-visible:outline-offset-[-2px]',
          selecionado && 'bg-raised before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-accent',
        )}
      >
        <span className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-body-strong">{lead.empresa}</span>
          <Pill status={lead.status} />
        </span>
        <span className="mt-0.5 block truncate text-small text-ink-muted">{metadados(lead, hoje)}</span>
      </button>
    </li>
  );
}
