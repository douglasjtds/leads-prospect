import { digits } from './phone';
import type { Lead } from './types';

/** Mínimo de dígitos para buscar pelo telefone. */
export const MINIMO_DIGITOS = 3;

export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/**
 * Busca sem acento e sem maiúsculas por empresa, cidade e nicho, e por dígitos do telefone
 * quando o termo é só número (aceita espaços, parênteses, + e -) com 3 dígitos ou mais
 * (PRODUCT-SPEC §7.3). Termo vazio devolve a lista inteira.
 */
export function buscar(leads: readonly Lead[], termo: string): Lead[] {
  const t = normalizar(termo);
  if (!t) return [...leads];

  const soNumero = /^[\d\s()+-]+$/.test(t);
  const d = soNumero ? digits(t) : '';
  const porTelefone = d.length >= MINIMO_DIGITOS;

  return leads.filter(
    (l) =>
      normalizar(l.empresa).includes(t) ||
      normalizar(l.cidade).includes(t) ||
      normalizar(l.nicho).includes(t) ||
      (porTelefone && digits(l.telefone).includes(d)),
  );
}
