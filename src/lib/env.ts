import { z } from 'zod';

// Variáveis de ambiente do servidor. Fonte: instructions/ARCHITECTURE.md §7.
// Nada aqui pode ter prefixo NEXT_PUBLIC_: credenciais e senha nunca chegam ao cliente.

const envSchema = z.object({
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email(),
  GOOGLE_PRIVATE_KEY: z
    .string()
    .min(1)
    .transform((chave) => chave.replace(/\\n/g, '\n')),
  SHEET_ID: z.string().min(1),
  SHEET_TAB: z.string().min(1).default('Leads'),
  APP_PASSWORD: z.string().min(1),
  SESSION_SECRET: z.string().min(32, 'precisa ter pelo menos 32 caracteres'),
  APP_TIMEZONE: z.string().min(1).default('America/Sao_Paulo'),
});

export type Env = z.infer<typeof envSchema>;

export class EnvInvalido extends Error {
  constructor(public readonly problemas: string[]) {
    super(`Variáveis de ambiente inválidas:\n${problemas.map((p) => `  - ${p}`).join('\n')}`);
    this.name = 'EnvInvalido';
  }
}

/** Valida um objeto de ambiente. Exportada para testes. */
export function parseEnv(fonte: Record<string, string | undefined>): Env {
  // String vazia conta como ausente, para o .env.example copiado sem preencher dar erro claro.
  const limpo = Object.fromEntries(
    Object.entries(fonte).filter(([, valor]) => valor !== undefined && valor !== ''),
  );
  const resultado = envSchema.safeParse(limpo);
  if (!resultado.success) {
    const problemas = resultado.error.issues.map((issue) => {
      const nome = issue.path.join('.');
      return limpo[nome] === undefined ? `${nome}: faltando` : `${nome}: ${issue.message}`;
    });
    throw new EnvInvalido(problemas);
  }
  return resultado.data;
}

let cache: Env | undefined;

/** Lê e valida as variáveis na primeira chamada (preguiçoso, para o build não exigir .env). */
export function getEnv(): Env {
  cache ??= parseEnv(process.env);
  return cache;
}
