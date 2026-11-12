import { naoImplementado } from '@/lib/nao-implementado';
import type { Lead, Variante } from './types';

// Copy exata da PRODUCT-SPEC §6. Fase 3.

export type ChaveMensagem = 'fu3' | 'fu7' | 'furar' | 'cobrarRA' | 'site' | 'proposta';

export interface RespostaRapida {
  rotulo: string;
  texto: string;
}

export const primeiraMensagem: (lead: Lead, variante: Variante) => string = naoImplementado;
export const mensagem: (chave: ChaveMensagem) => string = naoImplementado;
export const nichoPlural: (nicho: string) => string = naoImplementado;
export const respostasRapidas: () => readonly RespostaRapida[] = naoImplementado;
