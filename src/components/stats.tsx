'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import { Kicker } from '@/components/ui/kicker';
import { cx } from '@/lib/cx';
import { AMOSTRA_MINIMA_AB, funil, percentual, resumo, testeAB } from '@/lib/domain/stats';
import { STATUS, type Lead } from '@/lib/domain/types';

interface StatsProps {
  leads: readonly Lead[];
  meta: number;
  onMeta: (meta: number) => void;
}

/** Meta aceita: inteiro de 1 a 200 (mesma regra de useMeta). */
const META_MIN = 1;
const META_MAX = 200;

const fmtPct = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function pct(valor: number): string {
  return `${fmtPct.format(valor)}%`;
}

/** Aba Números (PRODUCT-SPEC §7.7): funil, resumo, teste A/B e meta diária. */
export function Stats({ leads, meta, onMeta }: StatsProps) {
  const porStatus = useMemo(() => funil(leads), [leads]);
  const res = useMemo(() => resumo(leads), [leads]);
  const ab = useMemo(() => testeAB(leads), [leads]);
  const maior = Math.max(0, ...STATUS.map((s) => porStatus[s]));

  return (
    <div className="max-w-[640px]">
      <Kicker>03 / números</Kicker>

      <Secao titulo="Funil">
        <ul className="border-t border-line">
          {STATUS.map((status) => {
            const n = porStatus[status];
            const largura = maior === 0 ? 0 : (n / maior) * 100;
            return (
              <li
                key={status}
                className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-4 border-b border-line py-2.5"
              >
                <span className="truncate text-body">{status}</span>
                <span aria-hidden className="h-1 bg-surface">
                  <span className="block h-full bg-accent" style={{ width: `${largura}%` }} />
                </span>
                <span className="text-right font-mono text-label tabular-nums">{n}</span>
              </li>
            );
          })}
        </ul>
      </Secao>

      <Secao titulo="Resumo">
        <dl className="grid grid-cols-3 border-t border-line">
          <Numero rotulo="contatados" valor={String(res.contatados)} />
          <Numero
            rotulo="conversas reais"
            valor={String(res.conversasReais)}
            extra={res.contatados > 0 ? pct(res.percentualConversas) : undefined}
          />
          <Numero rotulo="respostas automáticas" valor={String(res.respostasAutomaticas)} />
        </dl>
        <p className="mt-3 text-small text-ink-muted">
          Conversas reais: Respondeu, Reunião marcada, Proposta enviada e Fechado. Leads pulados não contam como
          contatados.
        </p>
      </Secao>

      <Secao titulo="Teste A/B da 1ª mensagem">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Resultado por variante da 1ª mensagem</caption>
            <thead>
              <tr className="border-y border-line text-label text-ink-muted">
                <th scope="col" className="py-2 pr-3 font-normal">
                  variante
                </th>
                <th scope="col" className="px-3 py-2 text-right font-normal">
                  enviadas
                </th>
                <th scope="col" className="px-3 py-2 text-right font-normal">
                  responderam
                </th>
                <th scope="col" className="py-2 pl-3 text-right font-normal">
                  humanas
                </th>
              </tr>
            </thead>
            <tbody>
              {ab.map((r) => {
                const qualquer = percentual(r.comQualquerResposta, r.enviadas);
                const humana = percentual(r.comRespostaHumana, r.enviadas);
                const pequena = r.enviadas > 0 && r.enviadas < AMOSTRA_MINIMA_AB;
                return (
                  <tr key={r.variante} className="border-b border-line">
                    <th scope="row" className="py-2.5 pr-3 text-body font-normal">
                      {r.variante}
                      {pequena ? (
                        <span className="block font-mono text-micro text-ink-muted">amostra pequena</span>
                      ) : null}
                    </th>
                    <td className="px-3 py-2.5 text-right font-mono text-label tabular-nums">{r.enviadas}</td>
                    {qualquer === null || humana === null ? (
                      <td colSpan={2} className="py-2.5 pl-3 text-right text-small text-ink-muted">
                        sem envios
                      </td>
                    ) : (
                      <>
                        <td className="px-3 py-2.5 text-right font-mono text-label tabular-nums">
                          {pct(qualquer)}
                          <span className="ml-1.5 hidden text-ink-muted sm:inline">({r.comQualquerResposta})</span>
                        </td>
                        <td className="py-2.5 pl-3 text-right font-mono text-label tabular-nums">
                          {pct(humana)}
                          <span className="ml-1.5 hidden text-ink-muted sm:inline">({r.comRespostaHumana})</span>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-small text-ink-muted">
          Responderam inclui a resposta automática; humanas, só conversas reais. Conclusões só depois de uns{' '}
          {AMOSTRA_MINIMA_AB} envios por variante.
        </p>
      </Secao>

      <Secao titulo="Meta diária">
        <CampoMeta meta={meta} onMeta={onMeta} />
      </Secao>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-title">{titulo}</h2>
      {children}
    </section>
  );
}

function Numero({ rotulo, valor, extra }: { rotulo: string; valor: string; extra?: string }) {
  return (
    <div className="border-b border-line py-3 pr-4">
      <dt className="text-small text-ink-muted">{rotulo}</dt>
      <dd className="mt-1 font-mono text-title tabular-nums">
        {valor}
        {extra ? <span className="ml-2 text-label text-ink-muted">{extra}</span> : null}
      </dd>
    </div>
  );
}

function CampoMeta({ meta, onMeta }: { meta: number; onMeta: (meta: number) => void }) {
  const id = useId();
  const [rascunho, setRascunho] = useState<string | null>(null);
  const texto = rascunho ?? String(meta);
  const n = Number(texto);
  const valido = texto !== '' && Number.isInteger(n) && n >= META_MIN && n <= META_MAX;

  return (
    <div>
      <label htmlFor={id} className="text-small text-ink-muted">
        novos envios por dia (o contador do topo usa este valor; Enter salva)
      </label>
      <div className="mt-2 flex items-center gap-3">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={META_MIN}
          max={META_MAX}
          step={1}
          value={texto}
          aria-invalid={!valido}
          aria-describedby={valido ? undefined : `${id}-erro`}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          onBlur={() => {
            if (valido) onMeta(n);
            setRascunho(null);
          }}
          className={cx(
            'h-10 w-24 rounded-xs border bg-raised px-3 font-mono text-body text-ink tabular-nums',
            'transition-[border-color] duration-150 ease-out focus:border-ink',
            valido ? 'border-line' : 'border-accent',
          )}
        />
        {valido ? null : (
          <p id={`${id}-erro`} className="text-small text-accent">
            Use um número inteiro de {META_MIN} a {META_MAX}.
          </p>
        )}
      </div>
    </div>
  );
}
