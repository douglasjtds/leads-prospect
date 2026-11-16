import { z } from 'zod';
import { ehChaveModelo, marcadoresDesconhecidos, VARIAVEIS } from '@/lib/domain/templates';
import { erroResponse, respostaDeErro } from '@/lib/http';
import { restaurarModelo, salvarModelo } from '@/lib/sheets/leads-repo';

// Salvar para todos / Restaurar padrão (PRODUCT-SPEC §6).

const LIMITE = 2000;

const corpoSchema = z.object({
  texto: z.string().refine((t) => t.trim() !== '', 'texto vazio').refine((t) => t.length <= LIMITE, `mais de ${LIMITE} caracteres`),
});

export async function PUT(request: Request, ctx: RouteContext<'/api/mensagens/[chave]'>): Promise<Response> {
  const { chave } = await ctx.params;
  if (!ehChaveModelo(chave)) return erroResponse(`Mensagem "${chave}" não existe.`, 404);

  const corpo = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) {
    const detalhe = corpo.error.issues[0]?.message;
    return erroResponse(`Texto inválido${detalhe ? `: ${detalhe}` : ''}.`, 400);
  }
  const desconhecidas = marcadoresDesconhecidos(corpo.data.texto);
  if (desconhecidas.length > 0) {
    const lista = desconhecidas.map((d) => `{${d}}`).join(', ');
    const validas = VARIAVEIS.map((v) => `{${v}}`).join(', ');
    return erroResponse(`Variável que não existe: ${lista}. Use ${validas}.`, 400);
  }

  try {
    await salvarModelo(chave, corpo.data.texto);
    return new Response(null, { status: 204 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<'/api/mensagens/[chave]'>): Promise<Response> {
  const { chave } = await ctx.params;
  if (!ehChaveModelo(chave)) return erroResponse(`Mensagem "${chave}" não existe.`, 404);
  try {
    await restaurarModelo(chave);
    return new Response(null, { status: 204 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
