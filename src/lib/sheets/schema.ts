import { naoImplementado } from '@/lib/nao-implementado';
import type { DataISO } from '@/lib/domain/types';

// Nomes das colunas e conversões de tipo da planilha. Fase 2.

export const serialParaData: (serial: number) => DataISO = naoImplementado;
export const dataParaSerial: (data: DataISO) => number = naoImplementado;
/** Concatena "dd/MM evento" ao Histórico atual, separado por " · ". */
export const concatHistorico: (atual: string, evento: string, hoje: DataISO) => string =
  naoImplementado;
