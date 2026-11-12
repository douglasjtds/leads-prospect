import { naoImplementado } from '@/lib/nao-implementado';

// Atalhos de teclado (PRODUCT-SPEC §7.8). Fase 7.

export type Atalhos = Partial<Record<'/' | 'Escape' | 'c' | 'e' | 'j' | 'k', () => void>>;

export const useShortcuts: (atalhos: Atalhos) => void = naoImplementado;
