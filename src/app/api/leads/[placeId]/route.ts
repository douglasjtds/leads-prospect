import { patchBodySchema } from '@/lib/api/acao-schema';
import { hoje } from '@/lib/domain/dates';
import { aplicarAcao } from '@/lib/domain/next-action';
import { getEnv } from '@/lib/env';
import { erroResponse, respostaDeErro } from '@/lib/http';
import { getLead, updateLead } from '@/lib/sheets/leads-repo';

// O servidor calcula o patch a partir da ação e do estado lido da planilha (ARCHITECTURE §5).
export async function PATCH(request: Request, ctx: RouteContext<'/api/leads/[placeId]'>): Promise<Response> {
  const { placeId } = await ctx.params;
  const body = patchBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    const detalhe = body.error.issues[0]?.message;
    return erroResponse(`Ação inválida${detalhe ? `: ${detalhe}` : ''}.`, 400);
  }

  try {
    const dia = hoje(getEnv().APP_TIMEZONE);
    const atual = await getLead(placeId);
    const patch = aplicarAcao(atual, body.data.acao, dia);
    const lead = await updateLead(placeId, patch, dia);
    return Response.json({ lead });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
