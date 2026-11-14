import { z } from 'zod';
import { erroResponse, respostaDeErro } from '@/lib/http';
import { importLeads } from '@/lib/sheets/leads-repo';

// Importação de novos leads com dedupe (PRODUCT-SPEC §8, ARCHITECTURE §4.4 e §5).
// Cada linha é um objeto com os nomes de cabeçalho da planilha como chaves.

const MAX_LINHAS = 1000;

const bodySchema = z.object(
  {
    linhas: z
      .array(z.record(z.string(), z.unknown()), { error: 'Envie { linhas: [...] }.' })
      .min(1, 'Envie ao menos uma linha.')
      .max(MAX_LINHAS, `No máximo ${MAX_LINHAS} linhas por importação.`),
  },
  { error: 'Envie { linhas: [...] }.' },
);

export async function POST(request: Request): Promise<Response> {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return erroResponse(body.error.issues[0]?.message ?? 'Corpo inválido.', 400);

  try {
    const r = await importLeads(body.data.linhas, { dryRun: false });
    return Response.json({ inseridos: r.inseridos.length, duplicados: r.duplicados.length, ignorados: r.ignorados });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
