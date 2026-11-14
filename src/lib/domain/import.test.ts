import { describe, expect, it } from 'vitest';
import { fazerLead } from './__fixtures__/lead';
import { normalizarLinha, planejarImportacao, type LinhaBruta } from './import';

function linha(over: LinhaBruta = {}): LinhaBruta {
  return {
    Prioridade: 'Alta',
    Nicho: 'Dentista',
    Empresa: 'Clínica Nova',
    Cidade: 'Presidente Prudente',
    UF: 'SP',
    Telefone: '+55 18 99111-2222',
    'Situação': 'Sem site',
    Nota: 4.9,
    'Avaliações': 40,
    'Google Maps': 'https://www.google.com/maps/place/?q=place_id:ChIJnovo',
    'Place ID': 'ChIJnovo',
    'Mensagem (texto)': 'Oi',
    ...over,
  };
}

describe('normalizarLinha', () => {
  it('converte uma linha completa', () => {
    const r = normalizarLinha(linha({ Nota: '4,7', 'Avaliações': '12' }));
    expect(r).toEqual({
      ok: true,
      lead: {
        prioridade: 'Alta',
        nicho: 'Dentista',
        empresa: 'Clínica Nova',
        cidade: 'Presidente Prudente',
        uf: 'SP',
        telefone: '+55 18 99111-2222',
        situacao: 'Sem site',
        linkAtual: '',
        urlAtual: '',
        nota: 4.7,
        avaliacoes: 12,
        googleMaps: 'https://www.google.com/maps/place/?q=place_id:ChIJnovo',
        placeId: 'ChIJnovo',
        observacoes: '',
        mensagemTexto: 'Oi',
      },
    });
  });

  it('aceita sem telefone quando há URL atual', () => {
    const r = normalizarLinha(linha({ Telefone: '', 'URL atual': 'https://instagram.com/x' }));
    expect(r.ok).toBe(true);
  });

  it('aceita prioridade vazia e nota vazia', () => {
    const r = normalizarLinha(linha({ Prioridade: '', Nota: '', 'Avaliações': undefined }));
    expect(r.ok && r.lead).toMatchObject({ prioridade: null, nota: null, avaliacoes: null });
  });

  it.each([
    [{ Telefone: '', 'URL atual': '' }, 'Sem Telefone e sem URL atual.'],
    [{ 'Place ID': '' }, 'Place ID vazio.'],
    [{ 'Situação': 'Site próprio' }, 'Situação inválida: "Site próprio".'],
    [{ 'Situação': '' }, 'Situação vazia.'],
    [{ Prioridade: 'Urgente' }, 'Prioridade inválida: "Urgente".'],
    [{ Nota: 'quatro' }, 'Nota não é um número: "quatro".'],
    [{ UF: '  ' }, 'UF vazio.'],
  ] as const)('ignora %o', (over, motivo) => {
    expect(normalizarLinha(linha(over))).toEqual({ ok: false, empresa: 'Clínica Nova', motivo });
  });

  it('usa "(sem nome)" quando falta Empresa', () => {
    expect(normalizarLinha(linha({ Empresa: '' }))).toEqual({ ok: false, empresa: '(sem nome)', motivo: 'Empresa vazio.' });
  });
});

describe('planejarImportacao', () => {
  const existente = fazerLead({ linha: 42, empresa: 'Clínica Velha', placeId: 'ChIJvelho', telefone: '+55 18 99771-7770' });

  it('aceita lead novo', () => {
    const plano = planejarImportacao([linha()], [existente]);
    expect(plano.novos.map((l) => l.empresa)).toEqual(['Clínica Nova']);
    expect(plano.duplicados).toEqual([]);
    expect(plano.ignorados).toEqual([]);
  });

  it('descarta Place ID que já existe na planilha', () => {
    const plano = planejarImportacao([linha({ 'Place ID': 'ChIJvelho' })], [existente]);
    expect(plano.novos).toEqual([]);
    expect(plano.duplicados).toEqual([{ empresa: 'Clínica Nova', motivo: 'Place ID já existe na linha 42 (Clínica Velha)' }]);
  });

  it('descarta telefone com os mesmos dígitos, mesmo formatado diferente', () => {
    const plano = planejarImportacao([linha({ Telefone: '5518997717770' })], [existente]);
    expect(plano.duplicados).toEqual([{ empresa: 'Clínica Nova', motivo: 'telefone já existe na linha 42 (Clínica Velha)' }]);
  });

  it('descarta repetidos dentro do próprio lote (Place ID e telefone)', () => {
    const plano = planejarImportacao(
      [
        linha(),
        linha({ Empresa: 'Mesmo Place' }),
        linha({ Empresa: 'Mesmo fone', 'Place ID': 'ChIJoutro', Telefone: '+55 (18) 99111-2222' }),
      ],
      [],
    );
    expect(plano.novos.map((l) => l.empresa)).toEqual(['Clínica Nova']);
    expect(plano.duplicados).toEqual([
      { empresa: 'Mesmo Place', motivo: 'Place ID já existe no próprio lote (Clínica Nova)' },
      { empresa: 'Mesmo fone', motivo: 'telefone já existe no próprio lote (Clínica Nova)' },
    ]);
  });

  it('telefone vazio nunca conta como repetido', () => {
    const semFone = fazerLead({ placeId: 'ChIJig', telefone: '' });
    const plano = planejarImportacao(
      [
        linha({ 'Place ID': 'A', Telefone: '', 'URL atual': 'https://instagram.com/a' }),
        linha({ 'Place ID': 'B', Telefone: '', 'URL atual': 'https://instagram.com/b' }),
      ],
      [semFone],
    );
    expect(plano.novos).toHaveLength(2);
    expect(plano.duplicados).toEqual([]);
  });

  it('separa ignorados de duplicados', () => {
    const plano = planejarImportacao([linha({ 'Situação': 'Site próprio' }), linha()], []);
    expect(plano.ignorados).toEqual([{ empresa: 'Clínica Nova', motivo: 'Situação inválida: "Site próprio".' }]);
    expect(plano.novos).toHaveLength(1);
  });
});
