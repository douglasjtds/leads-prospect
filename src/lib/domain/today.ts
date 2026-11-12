import { naoImplementado } from '@/lib/nao-implementado';
import type { DataISO, Lead } from './types';

// Seções da aba Hoje (PRODUCT-SPEC §7.4). Fase 3.

export type ChaveSecao = 'responderam' | 'automaticas' | 'followups' | 'revisar' | 'novos';

export interface SecaoHoje {
  chave: ChaveSecao;
  titulo: string;
  dica: string;
  leads: Lead[];
}

export const secoesHoje: (
  leads: readonly Lead[],
  hoje: DataISO,
  meta: number,
  enviadosHoje: number,
) => SecaoHoje[] = naoImplementado;
