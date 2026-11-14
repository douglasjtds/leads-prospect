'use client';

import { Button } from '@/components/ui/button';
import { Kicker } from '@/components/ui/kicker';
import { formatarNota } from '@/lib/domain/messages';
import type { Acao, Lead } from '@/lib/domain/types';
import { urlDm, urlMaps } from '@/lib/whatsapp';
import { Bloco } from './bloco';
import { History } from './history';
import { NextAction } from './next-action';
import { Notes } from './notes';
import { QuickReplies, temRespostasRapidas } from './quick-replies';
import { StatusChips } from './status-chips';

interface LeadDetailProps {
  lead: Lead | null;
  aplicar: (acao: Acao) => void;
  /** Aplica e seleciona o próximo item da mesma fila do Hoje. */
  concluir: (acao: Acao) => void;
  onVoltar: () => void;
}

const CLASSE_LINK =
  'rounded-xs text-small text-ink underline decoration-line underline-offset-[0.2em] transition-[text-decoration-color] duration-150 hover:decoration-ink';

/** Detalhe do lead (PRODUCT-SPEC §7.5, DESIGN-GUIDELINES §6). */
export function LeadDetail({ lead, aplicar, concluir, onVoltar }: LeadDetailProps) {
  if (!lead) {
    return (
      <div className="flex h-full min-h-60 items-center justify-center px-7 py-6">
        <p className="text-small text-ink-muted">Escolha um lead na lista</p>
      </div>
    );
  }

  const kicker = [`linha ${lead.linha}`, lead.nicho, lead.prioridade ? `prioridade ${lead.prioridade}` : null]
    .filter(Boolean)
    .join(' / ');
  const local = lead.cidade && lead.uf ? `${lead.cidade}/${lead.uf}` : lead.cidade || lead.uf;
  const dm = urlDm(lead);

  return (
    <article aria-labelledby="lead-nome" className="max-w-[760px] px-5 py-6 desk:px-7">
      <Button variant="ghost" className="mb-6 desk:hidden" onClick={onVoltar}>
        ← Lista
      </Button>

      <Kicker>{kicker}</Kicker>
      <h1 id="lead-nome" className="mt-2 text-display">
        {lead.empresa}
      </h1>

      <p className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-small text-ink-muted">
        {[
          local ? <span key="local">{local}</span> : null,
          lead.nota !== null ? (
            <span key="nota">
              nota <span className="font-mono text-ink">{formatarNota(lead.nota)}</span>
            </span>
          ) : null,
          lead.avaliacoes !== null ? (
            <span key="aval">
              <span className="font-mono text-ink">{lead.avaliacoes}</span> avaliações
            </span>
          ) : null,
          lead.telefone ? (
            <span key="tel" className="font-mono text-ink">
              {lead.telefone}
            </span>
          ) : null,
          lead.situacao ? <span key="sit">{lead.situacao}</span> : null,
        ]
          .filter((parte) => parte !== null)
          .flatMap((parte, i) =>
            i === 0
              ? [parte]
              : [
                  <span key={`sep-${i}`} aria-hidden="true">
                    ·
                  </span>,
                  parte,
                ],
          )}
      </p>

      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
        <a href={urlMaps(lead)} target="_blank" rel="noopener noreferrer" className={CLASSE_LINK}>
          Google Maps ↗<span className="sr-only"> (abre em nova aba)</span>
        </a>
        {dm ? (
          <a href={dm} target="_blank" rel="noopener noreferrer" className={CLASSE_LINK}>
            Link atual ↗<span className="sr-only"> (abre em nova aba)</span>
          </a>
        ) : null}
      </p>

      <div className="mt-6">
        <Bloco rotulo="status">
          <StatusChips atual={lead.status} aplicar={aplicar} />
        </Bloco>

        <Bloco rotulo="próxima ação">
          <NextAction lead={lead} concluir={concluir} />
        </Bloco>

        {temRespostasRapidas(lead.status) ? (
          <Bloco rotulo="respostas rápidas">
            <QuickReplies />
          </Bloco>
        ) : null}

        <Bloco rotulo="observações">
          <Notes key={`${lead.placeId}:${lead.observacoes}`} observacoes={lead.observacoes} aplicar={aplicar} />
        </Bloco>

        <Bloco rotulo="histórico">
          <History historico={lead.historico} />
        </Bloco>
      </div>
    </article>
  );
}
