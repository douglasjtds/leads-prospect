import { fmtDiaMes } from './dates';
import type { DataISO } from './types';

// Histórico do lead: eventos "dd/MM texto" separados por " · " (PRODUCT-SPEC §4).
// Puro: usado no servidor (gravação) e no cliente (atualização otimista e exibição).

export const SEPARADOR_HISTORICO = ' · ';

export function concatHistorico(atual: string, evento: string, hoje: DataISO): string {
  const novo = `${fmtDiaMes(hoje)} ${evento}`;
  const base = atual.trim();
  return base ? `${base}${SEPARADOR_HISTORICO}${novo}` : novo;
}

export interface EventoHistorico {
  /** dd/MM, ou vazio se o texto foi escrito à mão sem data. */
  data: string;
  texto: string;
}

/** Eventos na ordem em que aparecem na célula (do mais antigo para o mais recente). */
export function parseHistorico(texto: string): EventoHistorico[] {
  return texto
    .split(SEPARADOR_HISTORICO)
    .map((parte) => parte.trim())
    .filter(Boolean)
    .map((parte) => {
      const m = /^(\d{2}\/\d{2}) (.+)$/.exec(parte);
      return m ? { data: m[1]!, texto: m[2]! } : { data: '', texto: parte };
    });
}
