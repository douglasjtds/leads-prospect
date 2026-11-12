import { describe, expect, it } from 'vitest';
import { EnvInvalido, parseEnv } from './env';

const valido = {
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'leads-app@projeto.iam.gserviceaccount.com',
  GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n',
  SHEET_ID: '1AbC',
  APP_PASSWORD: 'senha',
  SESSION_SECRET: 'x'.repeat(32),
};

describe('parseEnv', () => {
  it('converte \\n literais da chave em quebras de linha', () => {
    expect(parseEnv(valido).GOOGLE_PRIVATE_KEY).toBe(
      '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n',
    );
  });

  it('aplica os padrões de SHEET_TAB e APP_TIMEZONE', () => {
    const env = parseEnv(valido);
    expect(env.SHEET_TAB).toBe('Leads');
    expect(env.APP_TIMEZONE).toBe('America/Sao_Paulo');
  });

  it('lista o nome de cada variável faltando', () => {
    try {
      parseEnv({ ...valido, SHEET_ID: undefined, APP_PASSWORD: '' });
      expect.unreachable();
    } catch (erro) {
      expect(erro).toBeInstanceOf(EnvInvalido);
      expect((erro as EnvInvalido).problemas).toEqual([
        'SHEET_ID: faltando',
        'APP_PASSWORD: faltando',
      ]);
    }
  });

  it('rejeita SESSION_SECRET curto', () => {
    expect(() => parseEnv({ ...valido, SESSION_SECRET: 'curto' })).toThrow(/SESSION_SECRET/);
  });
});
