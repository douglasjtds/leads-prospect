import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/sheets/leads-repo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/sheets/leads-repo')>()),
  salvarModelo: vi.fn(async () => undefined),
  restaurarModelo: vi.fn(async () => undefined),
}));

const { PUT, DELETE } = await import('./route');
const { salvarModelo, restaurarModelo } = await import('@/lib/sheets/leads-repo');

function put(chave: string, body: unknown): Promise<Response> {
  const request = new Request(`http://localhost/api/mensagens/${chave}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return PUT(request, { params: Promise.resolve({ chave }) });
}

beforeEach(() => {
  vi.mocked(salvarModelo).mockClear();
  vi.mocked(restaurarModelo).mockClear();
});

describe('PUT /api/mensagens/:chave', () => {
  it('grava o modelo', async () => {
    const r = await put('fu3', { texto: 'Oi, {empresa}!' });
    expect(r.status).toBe(204);
    expect(salvarModelo).toHaveBeenCalledWith('fu3', 'Oi, {empresa}!');
  });

  it('chave que não existe: 404', async () => {
    expect((await put('xyz', { texto: 'oi' })).status).toBe(404);
  });

  it('texto vazio: 400', async () => {
    expect((await put('fu3', { texto: '   ' })).status).toBe(400);
    expect(salvarModelo).not.toHaveBeenCalled();
  });

  it('variável desconhecida: 400 com a lista das válidas', async () => {
    const r = await put('fu3', { texto: 'Oi {nome}' });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { erro: string }).erro).toContain('{nome}');
    expect(salvarModelo).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/mensagens/:chave', () => {
  it('restaura o padrão', async () => {
    const r = await DELETE(new Request('http://localhost/api/mensagens/site'), { params: Promise.resolve({ chave: 'site' }) });
    expect(r.status).toBe(204);
    expect(restaurarModelo).toHaveBeenCalledWith('site');
  });
});
