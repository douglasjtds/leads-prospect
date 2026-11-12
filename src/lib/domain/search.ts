import { naoImplementado } from '@/lib/nao-implementado';
import type { Lead } from './types';

/** Busca sem acento e sem maiúsculas, e por dígitos do telefone a partir de 3 (PRODUCT-SPEC §7.3). Fase 3. */
export const buscar: (leads: readonly Lead[], termo: string) => Lead[] = naoImplementado;
