import { hoje } from '@/lib/domain/dates';
import { separarSemPlaceId } from '@/lib/domain/sem-place-id';
import { getEnv } from '@/lib/env';
import { respostaDeErro } from '@/lib/http';
import { listLeads } from '@/lib/sheets/leads-repo';

export async function GET(): Promise<Response> {
  try {
    // Linhas sem Place ID não podem ser gravadas: ficam fora e voltam só como aviso.
    const { leads, semPlaceId } = separarSemPlaceId(await listLeads());
    return Response.json({ leads, semPlaceId, hoje: hoje(getEnv().APP_TIMEZONE) });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
