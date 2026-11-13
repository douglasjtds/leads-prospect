// Cookie lp_session = "exp.assinaturaHMAC" (ARCHITECTURE §6).
// Só Web Crypto, para rodar igual no proxy e nas rotas.

export const SESSION_COOKIE = 'lp_session';

/** 30 dias, em segundos. */
export const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60;

const encoder = new TextEncoder();

function importarChave(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function paraBase64Url(bytes: ArrayBuffer): string {
  const binario = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(texto: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(texto)) return null;
  try {
    const binario = atob(texto.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(new ArrayBuffer(binario.length));
    for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function segundos(data: Date): number {
  return Math.floor(data.getTime() / 1000);
}

/** Devolve o valor do cookie, válido por 30 dias a partir de `agora`. */
export async function criarSessao(secret: string, agora: Date = new Date()): Promise<string> {
  const exp = String(segundos(agora) + SESSION_MAX_AGE_S);
  const assinatura = await crypto.subtle.sign('HMAC', await importarChave(secret), encoder.encode(exp));
  return `${exp}.${paraBase64Url(assinatura)}`;
}

/** Confere assinatura e validade. Valor malformado devolve false, nunca lança. */
export async function verificarSessao(
  valor: string,
  secret: string,
  agora: Date = new Date(),
): Promise<boolean> {
  const ponto = valor.indexOf('.');
  if (ponto <= 0) return false;
  const exp = valor.slice(0, ponto);
  if (!/^\d{1,15}$/.test(exp)) return false;
  const assinatura = deBase64Url(valor.slice(ponto + 1));
  if (!assinatura) return false;

  // subtle.verify compara em tempo constante.
  const assinaturaOk = await crypto.subtle.verify(
    'HMAC',
    await importarChave(secret),
    assinatura,
    encoder.encode(exp),
  );
  return assinaturaOk && Number(exp) > segundos(agora);
}
