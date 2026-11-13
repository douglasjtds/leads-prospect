import type { DataISO } from './types';

// Datas do domínio, sempre como yyyy-MM-dd no fuso do app (America/Sao_Paulo).

const RE_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Hoje em yyyy-MM-dd no fuso informado. */
export function hoje(timezone: string, agora: Date = new Date()): DataISO {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}

/** Soma (ou subtrai) dias a uma data yyyy-MM-dd. Aritmética em UTC, independente do fuso da máquina. */
export function addDias(data: DataISO, dias: number): DataISO {
  const m = RE_DATA.exec(data);
  if (!m) throw new Error(`Data inválida: "${data}"`);
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + dias);
  return new Date(ms).toISOString().slice(0, 10);
}

/** Formata yyyy-MM-dd como dd/MM. */
export function fmtDiaMes(data: DataISO): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}`;
}

/**
 * Prazo da Próx. ação para a linha da lista (DESIGN-GUIDELINES §5, item da lista):
 * "venceu dd/MM", "vence hoje", "volta dd/MM" ou null quando não há data.
 */
export function rotuloPrazo(proxAcao: DataISO | null, hoje: DataISO): string | null {
  if (proxAcao === null) return null;
  if (proxAcao === hoje) return 'vence hoje';
  return proxAcao < hoje ? `venceu ${fmtDiaMes(proxAcao)}` : `volta ${fmtDiaMes(proxAcao)}`;
}
