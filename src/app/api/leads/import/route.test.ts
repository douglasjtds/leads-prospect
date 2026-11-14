import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LinhaBruta } from '@/lib/domain/import';
import { planejarImportacao } from '@/lib/domain/import';
import { fazerLead } from '@/lib/domain/__fixtures__/lead';
import { ErroPlanilha } from '@/lib/sheets/client';

// Rota + zod + dedupe reais; só o acesso à planilha é falso.

const repo = vi.hoisted(() => ({ falha: undefined as Error | undefined }));

vi.mock('@/lib/sheets/leads-repo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/sheets/leads-repo')>()),
  importLeads: vi.fn(async (brutas: readonly LinhaBruta[]) => {
    if (repo.falha) throw repo.falha;
    const plano = planejarImportacao(brutas, [fazerLead({ linha: 7, empresa: 'Já existe', placeId: 'ID-velho', telefone: '' })]);
    return { inseridos: plano.novos, duplicados: plano.duplicados, ignorados: plano.ignorados };
  }),
}));

const { POST } = await import('./route');
const { importLeads } = await import('@/lib/sheets/leads-repo');

function post(body: unknown): Promise<Response> {
  return POST(
    new Request('http://localhost/api/leads/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

const linha = (over: LinhaBruta = {}): LinhaBruta => ({
  Nicho: 'Dentista',
  Empresa: 'Clínica Nova',
  Cidade: 'Assis',
  UF: 'SP',
  Telefone: '+55 18 99000-2222',
  'Situação': 'Sem site',
  'Place ID': 'ID-novo',
  ...over,
});

beforeEach(() => {
  repo.falha = undefined;
  vi.mocked(importLeads).mockClear();
});

describe('POST /api/leads/import', () => {
  it('devolve inseridos, duplicados e ignorados', async () => {
    const res = await post({
      linhas: [
        linha(),
        linha({ Empresa: 'Repetida', 'Place ID': 'ID-velho', Telefone: '', 'URL atual': 'https://instagram.com/x' }),
        linha({ Empresa: 'Sem UF', 'Place ID': 'ID-3', UF: '' }),
      ],
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ inseridos: 1, duplicados: 1, ignorados: [{ empresa: 'Sem UF', motivo: 'UF vazio.' }] });
    expect(vi.mocked(importLeads).mock.calls[0]?.[1]).toEqual({ dryRun: false });
  });

  it.each([
    ['JSON quebrado', '{', 'Envie { linhas: [...] }.'],
    ['sem linhas', {}, 'Envie { linhas: [...] }.'],
    ['lista vazia', { linhas: [] }, 'Envie ao menos uma linha.'],
    ['linha que não é objeto', { linhas: ['x'] }, undefined],
    ['lote grande demais', { linhas: Array.from({ length: 1001 }, () => ({})) }, 'No máximo 1000 linhas por importação.'],
  ])('400 com %s', async (_nome, body, erro) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    if (erro) expect(await res.json()).toEqual({ erro });
    expect(importLeads).not.toHaveBeenCalled();
  });

  it('502 com a mensagem traduzida quando o Google falha', async () => {
    repo.falha = new ErroPlanilha('Sem permissão na planilha.', 403, 'PERMISSION_DENIED');
    const res = await post({ linhas: [linha()] });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ erro: 'Sem permissão na planilha.' });
  });
});
