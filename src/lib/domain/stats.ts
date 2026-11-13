import { STATUS, VARIANTES, type Lead, type Status, type Variante } from './types';

// Funil e teste A/B (PRODUCT-SPEC §7.7).

export type Funil = Record<Status, number>;

export interface ResultadoVariante {
  variante: Variante;
  enviadas: number;
  comQualquerResposta: number;
  comRespostaHumana: number;
}

export interface Resumo {
  contatados: number;
  conversasReais: number;
  /** Conversas reais sobre contatados, de 0 a 100 (0 se ninguém foi contatado). */
  percentualConversas: number;
  respostasAutomaticas: number;
}

/** Envios por variante a partir dos quais o A/B começa a dizer algo. */
export const AMOSTRA_MINIMA_AB = 30;

/** Respondeu, Reunião marcada, Proposta enviada e Fechado. */
export const STATUS_CONVERSA_REAL: readonly Status[] = ['Respondeu', 'Reunião marcada', 'Proposta enviada', 'Fechado'];

export function funil(leads: readonly Lead[]): Funil {
  const contagem = Object.fromEntries(STATUS.map((s) => [s, 0])) as Funil;
  for (const l of leads) contagem[l.status] += 1;
  return contagem;
}

function conversaReal(l: Lead): boolean {
  return STATUS_CONVERSA_REAL.includes(l.status);
}

function pulado(l: Lead): boolean {
  return l.historico.includes('pulado:');
}

export function resumo(leads: readonly Lead[]): Resumo {
  const contatados = leads.filter((l) => l.status !== 'A contatar' && !pulado(l)).length;
  const conversasReais = leads.filter(conversaReal).length;
  return {
    contatados,
    conversasReais,
    percentualConversas: contatados === 0 ? 0 : (conversasReais / contatados) * 100,
    respostasAutomaticas: leads.filter((l) => l.status === 'Resposta automática').length,
  };
}

/** Por variante: enviadas, com qualquer resposta (inclui automática) e com resposta humana. */
export function testeAB(leads: readonly Lead[]): ResultadoVariante[] {
  return VARIANTES.map((variante) => {
    const enviadas = leads.filter((l) => l.variante === variante);
    return {
      variante,
      enviadas: enviadas.length,
      comQualquerResposta: enviadas.filter((l) => conversaReal(l) || l.status === 'Resposta automática').length,
      comRespostaHumana: enviadas.filter(conversaReal).length,
    };
  });
}
