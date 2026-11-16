import type { Lead } from './types';

// Linhas sem Place ID (coladas à mão sem rodar o migrate) não têm como ser gravadas: a escrita
// localiza a linha pelo Place ID. Elas ficam fora do app e viram um aviso com os números das linhas.

export interface LeadsSeparados {
  leads: Lead[];
  /** Números das linhas da planilha sem Place ID, em ordem. */
  semPlaceId: number[];
}

export function separarSemPlaceId(todos: readonly Lead[]): LeadsSeparados {
  const leads: Lead[] = [];
  const semPlaceId: number[] = [];
  for (const lead of todos) {
    if (lead.placeId.trim()) leads.push(lead);
    else semPlaceId.push(lead.linha);
  }
  return { leads, semPlaceId };
}

/** Quantas linhas citar pelo número no aviso antes de resumir com "e mais N". */
const MAX_LINHAS_CITADAS = 5;

export function avisoSemPlaceId(linhas: readonly number[]): string | null {
  const n = linhas.length;
  if (n === 0) return null;
  const citadas = linhas.slice(0, MAX_LINHAS_CITADAS).join(', ');
  const resto = n > MAX_LINHAS_CITADAS ? ` e mais ${n - MAX_LINHAS_CITADAS}` : '';
  const quais = n === 1 ? `A linha ${citadas} está sem Place ID e não aparece` : `${n} linhas estão sem Place ID (${citadas}${resto}) e não aparecem`;
  return `${quais} no app. Rode npm run migrate para incluir.`;
}
