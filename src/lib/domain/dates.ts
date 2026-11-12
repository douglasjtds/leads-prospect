import { naoImplementado } from '@/lib/nao-implementado';
import type { DataISO } from './types';

/** Hoje em yyyy-MM-dd no fuso informado (America/Sao_Paulo). Fase 3. */
export const hoje: (timezone: string) => DataISO = naoImplementado;
export const addDias: (data: DataISO, dias: number) => DataISO = naoImplementado;
/** Formata yyyy-MM-dd como dd/MM. */
export const fmtDiaMes: (data: DataISO) => string = naoImplementado;
