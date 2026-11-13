import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fazerLead } from '@/lib/domain/__fixtures__/lead';
import type { Lead, Patch } from '@/lib/domain/types';
import { ErroPlanilha } from '@/lib/sheets/client';

// Teste de integração do PATCH: rota + zod + domínio reais, só o leads-repo é falso.

const repo = vi.hoisted(() => ({ lead: undefined as Lead | undefined }));

vi.mock('@/lib/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/env')>()),
  getEnv: () => ({ APP_TIMEZONE: 'America/Sao_Paulo' }),
}));

vi.mock('@/lib/sheets/leads-repo', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/sheets/leads-repo')>();
  return {
    ...real,
    listLeads: vi.fn(async () => (repo.lead ? [repo.lead] : [])),
    getLead: vi.fn(async (placeId: string) => {
      if (!repo.lead || repo.lead.placeId !== placeId) throw new real.LeadNaoEncontrado(placeId);
      return repo.lead;
    }),
    updateLead: vi.fn(async (_placeId: string, patch: Patch): Promise<Lead> => {
      const { eventoHistorico, ...campos } = patch;
      return { ...repo.lead!, ...campos, historico: eventoHistorico ?? repo.lead!.historico };
    }),
  };
});

const { PATCH } = await import('./route');
const { GET } = await import('../route');
const { getLead, updateLead } = await import('@/lib/sheets/leads-repo');

const HOJE = '2026-11-13';

function patch(placeId: string, body: unknown): Promise<Response> {
  const request = new Request(`http://localhost/api/leads/${placeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ placeId }) });
}

/** Patch que a rota mandou gravar. */
function patchGravado(): Patch {
  const chamada = vi.mocked(updateLead).mock.calls[0];
  expect(chamada?.[0]).toBe('p1');
  expect(chamada?.[2]).toBe(HOJE);
  return chamada![1];
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  // 13/11 às 22h em São Paulo já é 14/11 em UTC: "hoje" tem de vir do fuso do app.
  vi.setSystemTime(new Date('2026-11-14T01:00:00Z'));
  vi.mocked(getLead).mockClear();
  vi.mocked(updateLead).mockClear();
  repo.lead = fazerLead({ placeId: 'p1' });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PATCH /api/leads/:placeId', () => {
  it('enviei em A contatar: grava Contatado, toque 1, próx. ação +3 e a variante', async () => {
    repo.lead = fazerLead({ placeId: 'p1', mensagemTexto: 'Olá, versão completa.' });
    const resposta = await patch('p1', { acao: { tipo: 'enviei', variante: 'completa' } });
    expect(resposta.status).toBe(200);
    expect(patchGravado()).toEqual({
      status: 'Contatado',
      toques: 1,
      dataContato: HOJE,
      proxAcao: '2026-11-16',
      variante: 'completa',
      eventoHistorico: '1ª msg (completa)',
    });
    const { lead } = (await resposta.json()) as { lead: Lead };
    expect(lead).toMatchObject({ placeId: 'p1', status: 'Contatado', toques: 1 });
  });

  it('enviei num lead que já mudou de status: 409 sem gravar', async () => {
    repo.lead = fazerLead({ placeId: 'p1', status: 'Sem interesse', toques: 1, dataContato: '2026-11-12' });
    const resposta = await patch('p1', { acao: { tipo: 'enviei' } });
    expect(resposta.status).toBe(409);
    expect(((await resposta.json()) as { erro: string }).erro).toMatch(/Sem interesse/);
    expect(updateLead).not.toHaveBeenCalled();
  });

  it('mudarStatus: grava o status novo e o evento', async () => {
    repo.lead = fazerLead({ placeId: 'p1', status: 'Contatado', toques: 1, proxAcao: '2026-11-15' });
    const resposta = await patch('p1', { acao: { tipo: 'mudarStatus', status: 'Respondeu' } });
    expect(resposta.status).toBe(200);
    expect(patchGravado()).toEqual({ status: 'Respondeu', proxAcao: null, eventoHistorico: 'status → Respondeu' });
  });

  it('mudarStatus para o mesmo status: 409', async () => {
    const resposta = await patch('p1', { acao: { tipo: 'mudarStatus', status: 'A contatar' } });
    expect(resposta.status).toBe(409);
  });

  it('revisar: aplica o resultado da revisão', async () => {
    repo.lead = fazerLead({ placeId: 'p1', status: 'Contatado', toques: 0 });
    const resposta = await patch('p1', { acao: { tipo: 'revisar', resultado: 'semResposta' } });
    expect(resposta.status).toBe(200);
    expect(patchGravado()).toEqual({ toques: 1, proxAcao: HOJE, eventoHistorico: 'revisado: sem resposta' });
  });

  it('salvarObs: grava só as observações, sem espaços nas pontas', async () => {
    const resposta = await patch('p1', { acao: { tipo: 'salvarObs', texto: '  ligar depois das 14h  ' } });
    expect(resposta.status).toBe(200);
    expect(patchGravado()).toEqual({ observacoes: 'ligar depois das 14h' });
  });

  it('pular: exige motivo', async () => {
    const resposta = await patch('p1', { acao: { tipo: 'pular', motivo: '   ' } });
    expect(resposta.status).toBe(400);
    expect(getLead).not.toHaveBeenCalled();
  });

  it.each([
    ['JSON quebrado', '{'],
    ['sem acao', {}],
    ['tipo desconhecido', { acao: { tipo: 'apagar' } }],
    ['status fora da lista', { acao: { tipo: 'mudarStatus', status: 'Perdido' } }],
  ])('corpo inválido (%s): 400', async (_nome, body) => {
    const resposta = await patch('p1', body);
    expect(resposta.status).toBe(400);
    expect(updateLead).not.toHaveBeenCalled();
  });

  it('Place ID inexistente: 404', async () => {
    const resposta = await patch('outro', { acao: { tipo: 'enviei' } });
    expect(resposta.status).toBe(404);
  });

  it('falha do Google: 502 com a mensagem traduzida', async () => {
    vi.mocked(getLead).mockRejectedValueOnce(new ErroPlanilha('Sem permissão: ...', 403, 'forbidden'));
    const resposta = await patch('p1', { acao: { tipo: 'enviei' } });
    expect(resposta.status).toBe(502);
    expect(await resposta.json()).toEqual({ erro: 'Sem permissão: ...' });
  });
});

describe('GET /api/leads', () => {
  it('devolve os leads e o hoje no fuso de São Paulo', async () => {
    const resposta = await GET();
    expect(resposta.status).toBe(200);
    const corpo = (await resposta.json()) as { leads: Lead[]; hoje: string };
    expect(corpo.hoje).toBe(HOJE);
    expect(corpo.leads.map((l) => l.placeId)).toEqual(['p1']);
  });
});
