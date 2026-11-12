import { naoImplementado } from '@/lib/nao-implementado';
import type { Lead, Status, Variante } from './types';

// Funil e teste A/B (PRODUCT-SPEC §7.7). Fase 3.

export type Funil = Record<Status, number>;

export interface ResultadoVariante {
  variante: Variante;
  enviadas: number;
  comQualquerResposta: number;
  comRespostaHumana: number;
}

export const funil: (leads: readonly Lead[]) => Funil = naoImplementado;
export const testeAB: (leads: readonly Lead[]) => ResultadoVariante[] = naoImplementado;
