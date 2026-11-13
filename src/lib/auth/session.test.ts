import { describe, expect, it } from 'vitest';
import { SESSION_MAX_AGE_S, criarSessao, verificarSessao } from './session';

const SECRET = 's'.repeat(32);
const AGORA = new Date('2026-11-13T12:00:00Z');
const depois = (segundos: number) => new Date(AGORA.getTime() + segundos * 1000);

describe('sessão', () => {
  it('tem o formato exp.assinatura, com exp 30 dias à frente', async () => {
    const valor = await criarSessao(SECRET, AGORA);
    const [exp, assinatura, ...resto] = valor.split('.');
    expect(resto).toEqual([]);
    expect(Number(exp)).toBe(AGORA.getTime() / 1000 + SESSION_MAX_AGE_S);
    expect(assinatura).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('aceita uma sessão recém-criada', async () => {
    const valor = await criarSessao(SECRET, AGORA);
    expect(await verificarSessao(valor, SECRET, AGORA)).toBe(true);
  });

  it('continua válida um segundo antes de expirar', async () => {
    const valor = await criarSessao(SECRET, AGORA);
    expect(await verificarSessao(valor, SECRET, depois(SESSION_MAX_AGE_S - 1))).toBe(true);
  });

  it('rejeita sessão expirada', async () => {
    const valor = await criarSessao(SECRET, AGORA);
    expect(await verificarSessao(valor, SECRET, depois(SESSION_MAX_AGE_S))).toBe(false);
    expect(await verificarSessao(valor, SECRET, depois(SESSION_MAX_AGE_S + 60))).toBe(false);
  });

  it('rejeita exp adulterado (validade esticada)', async () => {
    const valor = await criarSessao(SECRET, AGORA);
    const [exp, assinatura] = valor.split('.');
    const esticado = `${Number(exp) + 1}.${assinatura}`;
    expect(await verificarSessao(esticado, SECRET, AGORA)).toBe(false);
  });

  it('rejeita assinatura adulterada', async () => {
    const valor = await criarSessao(SECRET, AGORA);
    const [exp, assinatura = ''] = valor.split('.');
    const trocada = (assinatura.startsWith('A') ? 'B' : 'A') + assinatura.slice(1);
    expect(await verificarSessao(`${exp}.${trocada}`, SECRET, AGORA)).toBe(false);
  });

  it('rejeita sessão assinada com outro segredo', async () => {
    const valor = await criarSessao('o'.repeat(32), AGORA);
    expect(await verificarSessao(valor, SECRET, AGORA)).toBe(false);
  });

  it.each(['', '.', 'abc', '123', '123.', '.abc', 'abc.def', '12a.AAAA', '123.@@@@', '1.2.3'])(
    'rejeita valor malformado %j sem lançar',
    async (valor) => {
      expect(await verificarSessao(valor, SECRET, AGORA)).toBe(false);
    },
  );
});
