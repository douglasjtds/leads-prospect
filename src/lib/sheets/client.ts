import { JWT } from 'google-auth-library';
import { getEnv } from '@/lib/env';

// Acesso autenticado à Sheets API v4 (conta de serviço, só no servidor).
// Só o leads-repo usa este módulo (CLAUDE.md).

const ESCOPO = 'https://www.googleapis.com/auth/spreadsheets';
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/** Falha ao falar com o Google, já com a mensagem da tabela "Problemas comuns". Vira 502 na API. */
export class ErroPlanilha extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly original: string,
  ) {
    super(message);
    this.name = 'ErroPlanilha';
  }
}

/** Traduz o erro do Google para a causa e a solução de instructions/CONECTAR-PLANILHA.md. */
export function traduzirErro(status: number, mensagem: string, aba: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes('decoder routines') || m.includes('invalid_grant') || m.includes('private key')) {
    return 'GOOGLE_PRIVATE_KEY com quebras de linha erradas. Cole de novo a chave do JSON com os \\n literais.';
  }
  if (m.includes('has not been used in project') || m.includes('is disabled')) {
    return 'Google Sheets API não ativada no projeto certo. Veja o passo 2 de CONECTAR-PLANILHA.md, conferindo o seletor de projeto.';
  }
  if (m.includes('not supported for this document')) {
    return 'A planilha ainda é um arquivo .xlsx. Salve como Planilhas Google (passo 0 de CONECTAR-PLANILHA.md).';
  }
  if (m.includes('unable to parse range')) {
    return `Aba "${aba}" não encontrada. Renomeie a aba ou ajuste SHEET_TAB.`;
  }
  if (status === 403) {
    return 'Sem permissão: a planilha não está compartilhada com a conta de serviço como Editor (passo 5 de CONECTAR-PLANILHA.md).';
  }
  if (status === 404) {
    return 'Planilha não encontrada: SHEET_ID errado (passo 6 de CONECTAR-PLANILHA.md).';
  }
  return `Erro do Google Sheets (${status}): ${mensagem}`;
}

let jwt: JWT | undefined;

function cliente(): JWT {
  const env = getEnv();
  jwt ??= new JWT({ email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: env.GOOGLE_PRIVATE_KEY, scopes: [ESCOPO] });
  return jwt;
}

async function token(): Promise<string> {
  try {
    const { token: t } = await cliente().getAccessToken();
    if (!t) throw new Error('token vazio');
    return t;
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro);
    throw new ErroPlanilha(traduzirErro(401, msg, getEnv().SHEET_TAB), 401, msg);
  }
}

/** E-mail da conta de serviço em uso (para o check-sheet). */
export function contaDeServico(): string {
  return getEnv().GOOGLE_SERVICE_ACCOUNT_EMAIL;
}

/** Garante que a credencial gera token. Lança ErroPlanilha se não gerar. */
export async function autenticar(): Promise<void> {
  await token();
}

interface ErroGoogle {
  error?: { code?: number; message?: string; status?: string };
}

/**
 * Chamada autenticada relativa à planilha configurada. `caminho` começa com "/", "?" ou ":"
 * (ex.: "/values/Leads!A1:ZZ", "?fields=...", ":batchUpdate").
 */
async function chamar<T>(metodo: 'GET' | 'POST' | 'PUT', caminho: string, corpo?: unknown): Promise<T> {
  const env = getEnv();
  const resposta = await fetch(`${BASE}/${env.SHEET_ID}${caminho}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${await token()}`,
      ...(corpo === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    cache: 'no-store',
  });
  const json = (await resposta.json().catch(() => ({}))) as unknown;
  if (!resposta.ok) {
    const original = (json as ErroGoogle).error?.message ?? resposta.statusText;
    throw new ErroPlanilha(traduzirErro(resposta.status, original, env.SHEET_TAB), resposta.status, original);
  }
  return json as T;
}

export function sheetsGet<T>(caminho: string): Promise<T> {
  return chamar<T>('GET', caminho);
}

export function sheetsPost<T>(caminho: string, corpo: unknown): Promise<T> {
  return chamar<T>('POST', caminho, corpo);
}

export function sheetsPut<T>(caminho: string, corpo: unknown): Promise<T> {
  return chamar<T>('PUT', caminho, corpo);
}

/** Nome da aba configurada (SHEET_TAB). */
export function abaConfigurada(): string {
  return getEnv().SHEET_TAB;
}
