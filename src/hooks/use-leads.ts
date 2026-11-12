import { naoImplementado } from '@/lib/nao-implementado';
import type { Acao, DataISO, Lead } from '@/lib/domain/types';

// Lista em memória com atualização otimista. Fase 6.

export interface UseLeads {
  leads: Lead[];
  hoje: DataISO | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
  aplicar: (placeId: string, acao: Acao) => Promise<void>;
}

export const useLeads: () => UseLeads = naoImplementado;
