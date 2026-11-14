import { celular, digits } from '@/lib/domain/phone';
import type { Lead } from '@/lib/domain/types';

// Links externos do detalhe (ARCHITECTURE §8). O chat abre SEM texto na URL:
// a mensagem vai pela área de transferência (wa.me?text= cortava mensagens longas).

export const ABRIR_EM = ['whatsapp web', 'app'] as const;
export type AbrirEm = (typeof ABRIR_EM)[number];

const RE_URL = /^https?:\/\//i;
const RE_CELULAR = /Android|iPhone|iPad|iPod|Mobile/i;

/**
 * Celular ou tablet, pelo user agent. O iPad em modo desktop se diz "Macintosh",
 * mas tem toque (maxTouchPoints > 1), coisa que o Mac não tem.
 */
export function ehCelular(userAgent: string, maxTouchPoints: number): boolean {
  if (RE_CELULAR.test(userAgent)) return true;
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1;
}

/** No celular o WhatsApp Web não abre conversa: sempre o app. No desktop, vale a preferência. */
export function abrirEmEfetivo(preferencia: AbrirEm, celular: boolean): AbrirEm {
  return celular ? 'app' : preferencia;
}

/** URL do chat do número, ou null se o telefone não for celular. */
export function urlChat(telefone: string, onde: AbrirEm): string | null {
  if (!celular(telefone)) return null;
  const numero = digits(telefone);
  return onde === 'app' ? `whatsapp://send?phone=${numero}` : `https://web.whatsapp.com/send?phone=${numero}`;
}

/** Link do Google Maps: o texto da célula se for URL; senão, montado pelo Place ID. */
export function urlMaps(lead: Pick<Lead, 'googleMaps' | 'placeId'>): string {
  const texto = lead.googleMaps.trim();
  if (RE_URL.test(texto)) return texto;
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(lead.placeId)}`;
}

/** URL do "Link atual" (normalmente o Instagram), para a DM. null se não houver URL. */
export function urlDm(lead: Pick<Lead, 'urlAtual' | 'linkAtual'>): string | null {
  for (const candidato of [lead.urlAtual.trim(), lead.linkAtual.trim()]) {
    if (RE_URL.test(candidato)) return candidato;
  }
  return null;
}
