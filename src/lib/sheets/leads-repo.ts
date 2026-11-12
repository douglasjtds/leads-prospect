import { naoImplementado } from '@/lib/nao-implementado';
import type { Lead, Patch } from '@/lib/domain/types';

// ÚNICO ponto de leitura e escrita na planilha (CLAUDE.md). Fase 2 (e appendLeads na Fase 9).

export type NovaLinha = Record<string, string | number | null>;

export interface ResultadoMigracao {
  criadas: string[];
  reaproveitadas: string[];
}

export const listLeads: () => Promise<Lead[]> = naoImplementado;
export const updateLead: (placeId: string, patch: Patch) => Promise<Lead> = naoImplementado;
export const appendLeads: (linhas: readonly NovaLinha[]) => Promise<number> = naoImplementado;
export const ensureColumns: () => Promise<ResultadoMigracao> = naoImplementado;
