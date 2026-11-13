import { hoje } from '@/lib/domain/dates';
import { getEnv } from '@/lib/env';
import { respostaDeErro } from '@/lib/http';
import { listLeads } from '@/lib/sheets/leads-repo';

export async function GET(): Promise<Response> {
  try {
    const leads = await listLeads();
    return Response.json({ leads, hoje: hoje(getEnv().APP_TIMEZONE) });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
