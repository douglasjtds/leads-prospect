'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { mostrarErro } from '@/components/toast';
import { AcaoInvalida, aplicarAcao, aplicarPatch } from '@/lib/domain/next-action';
import type { Acao, DataISO, Lead } from '@/lib/domain/types';

// Lista em memória com atualização otimista (ARCHITECTURE §4.5 e §5).
// O cliente calcula o patch com a mesma função do servidor só para exibir na hora;
// o que vale é o lead devolvido pela API.

export const TIMEOUT_MS = 20_000;
/** Recarrega ao focar a aba se o último carregamento tiver mais que isso. */
const RECARREGAR_APOS_MS = 60_000;

const ERRO_REDE = 'não consegui falar com o servidor. Confira a conexão e tente de novo.';
const ERRO_TIMEOUT = 'o servidor demorou mais de 20s para responder. Tente de novo.';

export interface UseLeads {
  leads: Lead[];
  hoje: DataISO | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
  /** Aplica a ação com otimismo. Devolve o lead gravado, ou null se falhou (já revertido, com toast). */
  aplicar: (placeId: string, acao: Acao) => Promise<Lead | null>;
}

export class ErroApi extends Error {}

export function irParaLogin(): never {
  const destino = window.location.pathname + window.location.search;
  // Navegação completa de propósito: a sessão expirou e o proxy precisa reavaliar a requisição.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/login?next=${encodeURIComponent(destino)}`);
  throw new ErroApi('Sessão expirada. Entre de novo.');
}

export async function lerErro(resposta: Response): Promise<string> {
  const corpo: unknown = await resposta.json().catch(() => null);
  if (typeof corpo === 'object' && corpo !== null && 'erro' in corpo && typeof corpo.erro === 'string') {
    return corpo.erro;
  }
  return `o servidor respondeu ${resposta.status}.`;
}

export function mensagemDe(erro: unknown): string {
  if (erro instanceof DOMException && (erro.name === 'TimeoutError' || erro.name === 'AbortError')) return ERRO_TIMEOUT;
  if (erro instanceof ErroApi) return erro.message;
  return ERRO_REDE;
}

function ehListaDeLeads(corpo: unknown): corpo is { leads: Lead[]; hoje: DataISO } {
  return (
    typeof corpo === 'object' &&
    corpo !== null &&
    'leads' in corpo &&
    Array.isArray(corpo.leads) &&
    'hoje' in corpo &&
    typeof corpo.hoje === 'string'
  );
}

function ehRespostaLead(corpo: unknown): corpo is { lead: Lead } {
  return typeof corpo === 'object' && corpo !== null && 'lead' in corpo && typeof corpo.lead === 'object';
}

export function useLeads(): UseLeads {
  const [leads, setLeadsState] = useState<Lead[]>([]);
  const [hoje, setHoje] = useState<DataISO | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Espelhos para ler o estado atual dentro de callbacks assíncronos.
  const leadsRef = useRef<Lead[]>([]);
  const hojeRef = useRef<DataISO | null>(null);
  const ultimoCarregamento = useRef(0);
  const emVoo = useRef(false);
  const pendentes = useRef(0);

  const setLeads = useCallback((atualizar: (atual: Lead[]) => Lead[]) => {
    leadsRef.current = atualizar(leadsRef.current);
    setLeadsState(leadsRef.current);
  }, []);

  const substituir = useCallback(
    (lead: Lead) => setLeads((atual) => atual.map((l) => (l.placeId === lead.placeId ? lead : l))),
    [setLeads],
  );

  /** `silencioso`: recarga em segundo plano; mantém a lista e avisa erro por toast. */
  const carregar = useCallback(
    async (silencioso: boolean) => {
      if (emVoo.current) return;
      emVoo.current = true;
      if (!silencioso) {
        setCarregando(true);
        setErro(null);
      }
      try {
        const resposta = await fetch('/api/leads', { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (resposta.status === 401) irParaLogin();
        if (!resposta.ok) throw new ErroApi(await lerErro(resposta));
        const corpo: unknown = await resposta.json();
        if (!ehListaDeLeads(corpo)) throw new ErroApi('resposta inesperada do servidor.');
        // Uma ação ainda em voo vence a recarga: o PATCH devolve o lead gravado logo depois.
        if (pendentes.current === 0) setLeads(() => corpo.leads);
        hojeRef.current = corpo.hoje;
        setHoje(corpo.hoje);
        setErro(null);
        ultimoCarregamento.current = Date.now();
      } catch (e) {
        const mensagem = mensagemDe(e);
        if (silencioso) mostrarErro(`não consegui atualizar a lista: ${mensagem}`);
        else setErro(mensagem);
      } finally {
        emVoo.current = false;
        setCarregando(false);
      }
    },
    [setLeads],
  );

  const recarregar = useCallback(() => carregar(false), [carregar]);

  useEffect(() => {
    // Busca inicial: o estado é atualizado quando a resposta chega, não durante o efeito.
    const id = window.setTimeout(() => void carregar(false), 0);

    const aoFocar = () => {
      if (document.visibilityState !== 'visible') return;
      if (ultimoCarregamento.current === 0) return;
      if (Date.now() - ultimoCarregamento.current < RECARREGAR_APOS_MS) return;
      if (pendentes.current > 0) return;
      void carregar(true);
    };
    window.addEventListener('focus', aoFocar);
    document.addEventListener('visibilitychange', aoFocar);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('focus', aoFocar);
      document.removeEventListener('visibilitychange', aoFocar);
    };
  }, [carregar]);

  const aplicar = useCallback(
    async (placeId: string, acao: Acao): Promise<Lead | null> => {
      const antes = leadsRef.current.find((l) => l.placeId === placeId);
      const dia = hojeRef.current;
      if (!antes || !dia) return null;

      try {
        substituir(aplicarPatch(antes, aplicarAcao(antes, acao, dia), dia));
      } catch (e) {
        if (e instanceof AcaoInvalida) {
          mostrarErro(e.message);
          return null;
        }
        throw e;
      }

      pendentes.current += 1;
      try {
        const resposta = await fetch(`/api/leads/${encodeURIComponent(placeId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acao }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (resposta.status === 401) irParaLogin();
        if (!resposta.ok) throw new ErroApi(await lerErro(resposta));
        const corpo: unknown = await resposta.json();
        if (!ehRespostaLead(corpo)) throw new ErroApi('resposta inesperada do servidor.');
        substituir(corpo.lead);
        return corpo.lead;
      } catch (e) {
        substituir(antes);
        mostrarErro(mensagemDe(e));
        return null;
      } finally {
        pendentes.current -= 1;
      }
    },
    [substituir],
  );

  return { leads, hoje, carregando, erro, recarregar, aplicar };
}
