import { naoImplementado } from '@/lib/nao-implementado';
import type { Acao, DataISO, Lead, Patch } from './types';

// Máquina de próxima ação da PRODUCT-SPEC §5.2 e §5.3. Fase 3.

export type TipoProximaAcao =
  | 'primeira'
  | 'revisar'
  | 'fu3'
  | 'fu7'
  | 'encerrada'
  | 'furar'
  | 'cobrarRA'
  | 'aguardando'
  | 'site'
  | 'emConversa'
  | 'proposta'
  | 'nenhuma';

export interface ProximaAcao {
  tipo: TipoProximaAcao;
  titulo: string;
  sub: string;
  texto?: string;
}

/** Ação que não se aplica ao estado atual do lead. Vira 409 na API. */
export class AcaoInvalida extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AcaoInvalida';
  }
}

export const proximaAcao: (lead: Lead) => ProximaAcao = naoImplementado;
export const aplicarAcao: (lead: Lead, acao: Acao, hoje: DataISO) => Patch = naoImplementado;
