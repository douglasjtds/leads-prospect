'use client';

import { useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Header } from '@/components/header';
import { LeadList, LeadListSkeleton, type GrupoLista } from '@/components/lead-list';
import { Search } from '@/components/search';
import { Tabs, idAba, idPainel, type Aba } from '@/components/tabs';
import { Toast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Kicker } from '@/components/ui/kicker';
import { LeadDetail } from '@/components/lead-detail/lead-detail';
import { useDesktop } from '@/hooks/use-desktop';
import { useLeads } from '@/hooks/use-leads';
import { useMeta } from '@/hooks/use-pref';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { cx } from '@/lib/cx';
import { buscar } from '@/lib/domain/search';
import { funil } from '@/lib/domain/stats';
import { contarEnviadosHoje, proximoNaFila, secoesHoje } from '@/lib/domain/today';
import { STATUS, type Acao, type Status } from '@/lib/domain/types';
import { vizinho } from '@/lib/nav';

/** Paginação da aba Todos (PRODUCT-SPEC §7.6). */
const POR_PAGINA = 60;

export function AppShell() {
  const { leads, hoje, carregando, erro, recarregar, aplicar } = useLeads();
  const [meta] = useMeta();
  const desktop = useDesktop();

  const [aba, setAba] = useState<Aba>('hoje');
  const [termo, setTermo] = useState('');
  const [filtro, setFiltro] = useState<Status | null>(null);
  const [limite, setLimite] = useState(POR_PAGINA);
  /** undefined: o usuário ainda não escolheu; no desktop vale o primeiro item do Hoje. */
  const [escolhido, setEscolhido] = useState<string | null | undefined>(undefined);
  const [vista, setVista] = useState<'lista' | 'detalhe'>('lista');

  const buscaRef = useRef<HTMLInputElement>(null);
  const rolagemLista = useRef(0);
  const detalheRef = useRef<HTMLDivElement>(null);

  const buscando = termo.trim() !== '';
  const enviadosHoje = useMemo(() => (hoje ? contarEnviadosHoje(leads, hoje) : 0), [leads, hoje]);
  const secoes = useMemo(
    () => (hoje ? secoesHoje(leads, hoje, meta, enviadosHoje) : []),
    [leads, hoje, meta, enviadosHoje],
  );
  const totalHoje = secoes.reduce((soma, s) => soma + s.leads.length, 0);
  const porStatus = useMemo(() => funil(leads), [leads]);
  const resultados = useMemo(() => (buscando ? buscar(leads, termo) : []), [leads, termo, buscando]);
  const filtrados = useMemo(() => (filtro ? leads.filter((l) => l.status === filtro) : leads), [leads, filtro]);
  const visiveis = useMemo(() => filtrados.slice(0, limite), [filtrados, limite]);

  const primeiroHoje = secoes[0]?.leads[0]?.placeId ?? null;
  const selecionadoId = escolhido !== undefined ? escolhido : desktop ? primeiroHoje : null;
  const selecionado = selecionadoId ? (leads.find((l) => l.placeId === selecionadoId) ?? null) : null;
  const mostrandoDetalhe = !desktop && vista === 'detalhe' && selecionado !== null;

  function limparBusca() {
    setTermo('');
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  /** Ordem da lista na tela, para J/K. */
  function ordemVisivel(): string[] {
    if (buscando) return resultados.map((l) => l.placeId);
    if (aba === 'hoje') return secoes.flatMap((s) => s.leads.map((l) => l.placeId));
    if (aba === 'todos') return visiveis.map((l) => l.placeId);
    return [];
  }

  /** Mostra o detalhe do topo e mantém o item visível na lista. */
  function irPara(placeId: string) {
    setEscolhido(placeId);
    detalheRef.current?.scrollTo(0, 0);
    if (!desktop && vista === 'detalhe') window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-place-id="${CSS.escape(placeId)}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    });
  }

  function andar(passo: 1 | -1) {
    const proximo = vizinho(ordemVisivel(), selecionadoId, passo);
    if (proximo) irPara(proximo);
  }

  const aplicarNoSelecionado = (acao: Acao) => {
    if (selecionado) void aplicar(selecionado.placeId, acao);
  };

  /** Enviei, Pular e Revisar: aplica e segue para o item logo abaixo na mesma fila do Hoje. */
  const concluir = (acao: Acao) => {
    if (!selecionado) return;
    const proximo = buscando ? null : proximoNaFila(secoes, selecionado.placeId);
    void aplicar(selecionado.placeId, acao);
    if (proximo) irPara(proximo);
  };

  useShortcuts({
    '/': () => {
      buscaRef.current?.focus();
      buscaRef.current?.select();
    },
    Escape: limparBusca,
    j: () => andar(1),
    k: () => andar(-1),
  });

  function trocarAba(nova: Aba) {
    setAba(nova);
    setTermo('');
  }

  function selecionar(placeId: string) {
    setEscolhido(placeId);
    if (desktop) return;
    rolagemLista.current = window.scrollY;
    flushSync(() => setVista('detalhe'));
    window.scrollTo(0, 0);
  }

  function voltarParaLista() {
    flushSync(() => setVista('lista'));
    window.scrollTo(0, rolagemLista.current);
    const item = document.querySelector<HTMLElement>(`[data-place-id="${CSS.escape(selecionadoId ?? '')}"]`);
    item?.focus({ preventScroll: true });
  }

  function trocarFiltro(status: Status | null) {
    setFiltro(status);
    setLimite(POR_PAGINA);
  }

  function lista(grupos: readonly GrupoLista[]) {
    if (!hoje) return null;
    return <LeadList grupos={grupos} hoje={hoje} selecionadoId={selecionadoId} onSelect={selecionar} />;
  }

  function conteudoLista() {
    if (buscando) {
      const n = resultados.length;
      return (
        <>
          <Kicker className="px-5 pt-5 pb-3">
            busca / {n} {n === 1 ? 'resultado' : 'resultados'}
          </Kicker>
          {n === 0 ? (
            <p className="border-t border-line px-5 py-6 text-body">Nada com “{termo.trim()}”.</p>
          ) : (
            <div className="border-t border-line">{lista([{ chave: 'busca', leads: resultados }])}</div>
          )}
        </>
      );
    }

    const kicker = aba === 'hoje' ? '01 / hoje' : '02 / todos';

    if (leads.length === 0 && (carregando || erro)) {
      return (
        <>
          <Kicker className="px-5 pt-5 pb-3">{kicker}</Kicker>
          {erro ? (
            <div role="alert" className="border-t border-line px-5 py-6">
              <p className="text-body">Erro: {erro}</p>
              <Button variant="secondary" className="mt-4" onClick={() => void recarregar()} disabled={carregando}>
                {carregando ? 'Carregando' : 'Tentar de novo'}
              </Button>
            </div>
          ) : (
            <div className="border-t border-line">
              <p className="sr-only" role="status">
                Carregando leads
              </p>
              <LeadListSkeleton />
            </div>
          )}
        </>
      );
    }

    if (aba === 'hoje') {
      if (secoes.length === 0) {
        return (
          <div className="px-5 py-6">
            <Kicker>01 / hoje</Kicker>
            <h2 className="mt-3 text-display">
              Nada pendente <em className="emphasis">hoje</em>.
            </h2>
            <p className="mt-3 text-body text-ink-muted">Para ver a planilha inteira, abra a lista completa.</p>
            <Button variant="ghost" className="mt-5" onClick={() => trocarAba('todos')}>
              Abrir Todos
            </Button>
          </div>
        );
      }
      return (
        <>
          <Kicker className="px-5 pt-5">{kicker}</Kicker>
          {lista(secoes.map((s) => ({ chave: s.chave, titulo: s.titulo, dica: s.dica, leads: s.leads })))}
        </>
      );
    }

    return (
      <>
        <Kicker className="px-5 pt-5">{kicker}</Kicker>
        <div role="group" aria-label="Filtrar por status" className="flex flex-wrap gap-1.5 px-5 pt-3 pb-4">
          <Chip active={filtro === null} onClick={() => trocarFiltro(null)}>
            todos <span className="ml-1.5 font-mono text-micro opacity-80">{leads.length}</span>
          </Chip>
          {STATUS.map((status) => (
            <Chip key={status} active={filtro === status} onClick={() => trocarFiltro(status)}>
              {status} <span className="ml-1.5 font-mono text-micro opacity-80">{porStatus[status]}</span>
            </Chip>
          ))}
        </div>
        <div className="border-t border-line">
          {visiveis.length === 0 ? (
            <p className="px-5 py-6 text-body text-ink-muted">Nenhum lead em “{filtro}”.</p>
          ) : (
            lista([{ chave: 'todos', leads: visiveis }])
          )}
        </div>
        {filtrados.length > visiveis.length ? (
          <div className="flex items-center gap-3 px-5 py-5">
            <Button variant="ghost" onClick={() => setLimite((l) => l + POR_PAGINA)}>
              Mostrar mais
            </Button>
            <span className="text-label text-ink-muted">
              {visiveis.length} de {filtrados.length}
            </span>
          </div>
        ) : null}
      </>
    );
  }

  const painelLista = buscando
    ? { role: 'region', 'aria-label': 'Resultados da busca' }
    : { role: 'tabpanel', id: idPainel(aba), 'aria-labelledby': idAba(aba) };

  return (
    <>
      <Header
        busca={<Search ref={buscaRef} termo={termo} onChange={setTermo} onLimpar={limparBusca} />}
        contador={hoje ? { enviados: enviadosHoje, meta } : null}
      />

      <div className="pt-header">
        <nav
          aria-label="Abas"
          className={cx(
            'sticky top-header z-20 h-tabs border-b border-line bg-paper',
            mostrandoDetalhe && 'hidden',
          )}
        >
          <div className="mx-auto h-full max-w-content px-5">
            <Tabs
              ativa={aba}
              onChange={trocarAba}
              contagens={hoje ? { hoje: totalHoje, todos: leads.length } : {}}
            />
          </div>
        </nav>

        {aba === 'numeros' && !buscando ? (
          <main {...painelLista} className="mx-auto max-w-content px-5 py-6">
            <Kicker>03 / números</Kicker>
            <p className="mt-3 text-body text-ink-muted">Funil e teste A/B entram na próxima etapa.</p>
          </main>
        ) : (
          <main
            className={cx(
              'mx-auto max-w-content',
              'desk:grid desk:h-[calc(100dvh-var(--header-height)-var(--spacing-tabs))] desk:grid-cols-[minmax(300px,420px)_1fr]',
            )}
          >
            <div
              {...painelLista}
              className={cx(
                'border-line pb-16 desk:overflow-y-auto desk:border-r desk:pb-8 min-[1281px]:border-l',
                mostrandoDetalhe && 'hidden',
              )}
            >
              {conteudoLista()}
            </div>

            <div ref={detalheRef} className={cx('desk:overflow-y-auto', !mostrandoDetalhe && 'hidden desk:block')}>
              <LeadDetail
                lead={selecionado}
                aplicar={aplicarNoSelecionado}
                concluir={concluir}
                onVoltar={voltarParaLista}
              />
            </div>
          </main>
        )}
      </div>

      <Toast />
    </>
  );
}
