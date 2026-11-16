import { respostaDeErro } from '@/lib/http';
import { listModelos } from '@/lib/sheets/leads-repo';

/** Modelos de mensagem salvos pela tela (aba Mensagens). Chave ausente = texto padrão. */
export async function GET(): Promise<Response> {
  try {
    return Response.json({ modelos: await listModelos() });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
