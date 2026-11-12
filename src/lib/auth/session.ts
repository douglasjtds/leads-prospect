import { naoImplementado } from '@/lib/nao-implementado';

// Cookie lp_session = "exp.assinaturaHMAC", via Web Crypto. Fase 4.

export const SESSION_COOKIE = 'lp_session';

export const criarSessao: (secret: string, agora?: Date) => Promise<string> = naoImplementado;
export const verificarSessao: (valor: string, secret: string, agora?: Date) => Promise<boolean> =
  naoImplementado;
