import { LeadListItem } from '@/components/lead-list-item';
import { cx } from '@/lib/cx';
import type { DataISO, Lead } from '@/lib/domain/types';

export interface GrupoLista {
  chave: string;
  /** Sem título: lista corrida, sem cabeçalho de seção. */
  titulo?: string;
  dica?: string;
  leads: readonly Lead[];
}

interface LeadListProps {
  grupos: readonly GrupoLista[];
  hoje: DataISO;
  selecionadoId: string | null;
  onSelect: (placeId: string) => void;
}

/** Lista de leads, com cabeçalhos de seção quando o grupo tem título (aba Hoje). */
export function LeadList({ grupos, hoje, selecionadoId, onSelect }: LeadListProps) {
  return (
    <div>
      {grupos.map((grupo) => {
        const idTitulo = `secao-${grupo.chave}`;
        return (
          <section key={grupo.chave} aria-labelledby={grupo.titulo ? idTitulo : undefined}>
            {grupo.titulo ? (
              <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-line bg-paper px-5 pt-5 pb-2 desk:sticky desk:top-0 desk:z-10">
                <h2 id={idTitulo} className="text-small font-semibold">
                  {grupo.titulo} <span className="ml-1 font-mono font-normal text-ink-muted">{grupo.leads.length}</span>
                </h2>
                {grupo.dica ? <p className="text-label text-ink-muted">{grupo.dica}</p> : null}
              </header>
            ) : null}
            <ul aria-labelledby={grupo.titulo ? idTitulo : undefined}>
              {grupo.leads.map((lead) => (
                <LeadListItem
                  key={lead.placeId}
                  lead={lead}
                  hoje={hoje}
                  selecionado={lead.placeId === selecionadoId}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

const LARGURAS = ['w-3/5', 'w-2/3', 'w-1/2', 'w-3/4'] as const;

/** Skeleton de 8 itens (DESIGN-GUIDELINES §7): blocos `surface`, sem brilho. */
export function LeadListSkeleton() {
  return (
    <ul aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="border-b border-line px-5 py-[11px]">
          <span className="flex items-center gap-3">
            <span className={cx('h-[15px] rounded-xs bg-surface', LARGURAS[i % LARGURAS.length])} />
            <span className="ml-auto h-5 w-16 rounded-xs bg-surface" />
          </span>
          <span className="mt-2 block h-[11px] w-2/3 rounded-xs bg-surface" />
        </li>
      ))}
    </ul>
  );
}
