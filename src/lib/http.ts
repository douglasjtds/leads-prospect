import { AcaoInvalida } from '@/lib/domain/next-action';
import { EnvInvalido } from '@/lib/env';
import { ErroPlanilha } from '@/lib/sheets/client';
import { ConflitoPlanilha, LeadNaoEncontrado } from '@/lib/sheets/leads-repo';
import { ColunaFaltando, DadoInvalido } from '@/lib/sheets/schema';

/** Resposta JSON padrão para rotas ainda não implementadas. */
export function naoImplementadoResponse(fase: number): Response {
  return Response.json({ erro: `não implementado (fase ${fase})` }, { status: 501 });
}

export function erroResponse(mensagem: string, status: number): Response {
  return Response.json({ erro: mensagem }, { status });
}

/** Traduz um erro do domínio ou da planilha no status HTTP de ARCHITECTURE §5. */
export function respostaDeErro(erro: unknown): Response {
  if (erro instanceof AcaoInvalida || erro instanceof ConflitoPlanilha) return erroResponse(erro.message, 409);
  if (erro instanceof LeadNaoEncontrado) return erroResponse(erro.message, 404);
  if (erro instanceof ErroPlanilha) return erroResponse(erro.message, 502);
  // Problemas de configuração (colunas, dados, variáveis): mensagem clara, mas é erro do servidor.
  if (erro instanceof ColunaFaltando || erro instanceof DadoInvalido || erro instanceof EnvInvalido) {
    console.error(erro);
    return erroResponse(erro.message, 500);
  }
  console.error(erro);
  return erroResponse('Erro inesperado no servidor. Tente de novo.', 500);
}
