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

/** Anterior/Próximo da barra inferior no celular. */
export interface NavegacaoDetalhe {
  /** Posição na lista visível; null se o lead saiu dela (ex.: depois do Enviei). */
  posicao: { atual: number; total: number } | null;
  temAnterior: boolean;
  temProximo: boolean;
  onAnterior: () => void;
  onProximo: () => void;
}

interface LeadDetailProps {
  lead: Lead | null;
  aplicar: (acao: Acao) => void;
  /** Enviei aplica e fica no lead; Pular e Revisar aplicam e seguem na fila do Hoje. */
  concluir: (acao: Acao) => void;
  onVoltar: () => void;
  navegacao: NavegacaoDetalhe;
}

const CLASSE_LINK =
  'rounded-xs text-small text-ink underline decoration-line underline-offset-[0.2em] transition-[text-decoration-color] duration-150 hover:decoration-ink';

/** Detalhe do lead (PRODUCT-SPEC §7.5, DESIGN-GUIDELINES §6). */
export function LeadDetail({ lead, aplicar, concluir, onVoltar, navegacao }: LeadDetailProps) {
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
    <article aria-labelledby="lead-nome" className="max-w-[760px] px-5 pt-0 pb-24 desk:px-7 desk:py-6">
      {/* Celular: nome fixo no topo para não perder de vista em qual lead está. */}
      <div className="sticky top-header z-20 -mx-5 mb-5 flex items-center gap-3 border-b border-line bg-paper px-5 py-2 desk:hidden">
        <Button variant="ghost" className="shrink-0" onClick={onVoltar}>
          ← Lista
        </Button>
        <p aria-hidden="true" className="min-w-0 truncate text-body-strong">
          {lead.empresa}
        </p>
      </div>

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

      {/* Celular: Anterior / Próximo fixos no rodapé, perto do polegar. */}
      <nav
        aria-label="Navegar entre leads"
        className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-line bg-paper px-5 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] desk:hidden"
      >
        <Button variant="ghost" onClick={navegacao.onAnterior} disabled={!navegacao.temAnterior}>
          ‹ Anterior
        </Button>
        {navegacao.posicao ? (
          <span className="font-mono text-label text-ink-muted">
            {navegacao.posicao.atual}/{navegacao.posicao.total}
          </span>
        ) : null}
        <Button variant="ghost" onClick={navegacao.onProximo} disabled={!navegacao.temProximo}>
          Próximo ›
        </Button>
      </nav>
    </article>
  );
}
