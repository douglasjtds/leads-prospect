import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Celula } from './schema';
import { COLUNAS_OBRIGATORIAS, dataParaSerial, letraColuna } from './schema';

// Planilha falsa em memória: entende os ranges que o repo usa ('Leads'!1:1, 'Leads'!M1:M,
// 'Leads'!7:7, 'Leads'!C5, 'Leads'!A1:ZZ) e aplica values:batchUpdate na grade.
const planilha = vi.hoisted(() => ({ grade: [] as Celula[][], escritas: [] as string[], anexadas: [] as Celula[][] }));

function indiceDaLetra(letras: string): number {
  return [...letras].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0) - 1;
}

function lerRange(range: string): Celula[][] {
  const a1 = range.split('!')[1] ?? '';
  const linhaInteira = /^(\d+):(\d+)$/.exec(a1);
  if (linhaInteira) return [planilha.grade[Number(linhaInteira[1]) - 1] ?? []];
  const coluna = /^([A-Z]+)1:\1$/.exec(a1);
  if (coluna) {
    const i = indiceDaLetra(coluna[1]!);
    return planilha.grade.map((linha) => [linha[i]]);
  }
  if (a1 === 'A1:ZZ') return planilha.grade;
  throw new Error(`range não suportado no teste: ${range}`);
}

vi.mock('./client', () => ({
  abaConfigurada: () => 'Leads',
  sheetsGet: vi.fn(async (caminho: string) => {
    const url = new URL(`https://x${caminho}`);
    if (url.pathname.startsWith('/values:batchGet')) {
      return { valueRanges: url.searchParams.getAll('ranges').map((r) => ({ range: r, values: lerRange(r) })) };
    }
    if (url.pathname.startsWith('/values/')) {
      return { values: lerRange(decodeURIComponent(url.pathname.slice('/values/'.length))) };
    }
    throw new Error(`GET não suportado no teste: ${caminho}`);
  }),
  sheetsPost: vi.fn(async (caminho: string, corpo: { data: Array<{ range: string; values: Celula[][] }>; values: Celula[][] }) => {
    if (/^\/values\/[^?]+:append\?valueInputOption=RAW&insertDataOption=INSERT_ROWS$/.test(caminho)) {
      planilha.grade.push(...corpo.values);
      planilha.anexadas.push(...corpo.values);
      return {};
    }
    if (caminho !== '/values:batchUpdate') throw new Error(`POST não suportado no teste: ${caminho}`);
    for (const { range, values } of corpo.data) {
      const m = /!([A-Z]+)(\d+)$/.exec(range)!;
      const linha = (planilha.grade[Number(m[2]) - 1] ??= []);
      linha[indiceDaLetra(m[1]!)] = values[0]![0];
      planilha.escritas.push(`${m[1]}${m[2]}=${String(values[0]![0])}`);
    }
    return {};
  }),
}));

const { listLeads, getLead, updateLead, importLeads, LeadNaoEncontrado, ConflitoPlanilha } = await import('./leads-repo');

// Cabeçalho com colunas legadas e fora da ordem da spec, como a planilha real.
const CABECALHO = ['Prioridade', 'Enviar 1ª msg', ...COLUNAS_OBRIGATORIAS.filter((c) => c !== 'Prioridade')];
const col = (nome: string) => letraColuna(CABECALHO.indexOf(nome));

function linha(valores: Record<string, Celula>): Celula[] {
  return CABECALHO.map((c) => valores[c]);
}

beforeEach(() => {
  planilha.escritas = [];
  planilha.anexadas = [];
  planilha.grade = [
    CABECALHO,
    linha({ Empresa: 'Clínica A', 'Place ID': 'ID-A', Status: 'A contatar' }),
    linha({ Empresa: '', 'Place ID': '' }), // linha vazia no meio
    linha({ Empresa: 'Pet B', 'Place ID': 'ID-B', Status: 'Contatado', Toques: 1, Histórico: '10/11 1ª msg (curta)' }),
  ];
});

describe('listLeads', () => {
  it('ignora linhas sem Empresa e guarda o número da linha', async () => {
    const leads = await listLeads();
    expect(leads.map((l) => [l.empresa, l.linha])).toEqual([
      ['Clínica A', 2],
      ['Pet B', 4],
    ]);
  });
});

describe('getLead', () => {
  it('devolve o lead atual pelo Place ID', async () => {
    const lead = await getLead('ID-B');
    expect(lead).toMatchObject({ empresa: 'Pet B', status: 'Contatado', toques: 1, linha: 4 });
  });

  it('lança LeadNaoEncontrado para Place ID inexistente', async () => {
    await expect(getLead('ID-Z')).rejects.toBeInstanceOf(LeadNaoEncontrado);
  });

  it('lança ConflitoPlanilha quando o Place ID está repetido', async () => {
    planilha.grade[2] = linha({ Empresa: 'Cópia', 'Place ID': 'ID-A' });
    await expect(getLead('ID-A')).rejects.toBeInstanceOf(ConflitoPlanilha);
  });
});

describe('updateLead', () => {
  it('acha a linha pelo Place ID e grava só os campos do patch, nas colunas certas', async () => {
    const lead = await updateLead(
      'ID-A',
      { status: 'Contatado', toques: 1, dataContato: '2026-11-13', proxAcao: '2026-11-16', variante: 'curta', eventoHistorico: '1ª msg (curta)' },
      '2026-11-13',
    );
    expect(planilha.escritas.sort()).toEqual(
      [
        `${col('Status')}2=Contatado`,
        `${col('Toques')}2=1`,
        `${col('Data contato')}2=${dataParaSerial('2026-11-13')}`,
        `${col('Próx. ação')}2=${dataParaSerial('2026-11-16')}`,
        `${col('Variante')}2=curta`,
        `${col('Histórico')}2=13/11 1ª msg (curta)`,
      ].sort(),
    );
    expect(lead).toMatchObject({ placeId: 'ID-A', status: 'Contatado', toques: 1, proxAcao: '2026-11-16', linha: 2 });
  });

  it('continua certo depois que a planilha foi reordenada', async () => {
    const [cab, a, vazia, b] = planilha.grade;
    planilha.grade = [cab!, b!, vazia!, a!];
    await updateLead('ID-B', { toques: 2 }, '2026-11-13');
    expect(planilha.escritas).toEqual([`${col('Toques')}2=2`]);
  });

  it('concatena com o Histórico relido da planilha, não com o do cliente', async () => {
    planilha.grade[3]![CABECALHO.indexOf('Histórico')] = '10/11 1ª msg (curta) · 12/11 editado à mão';
    const lead = await updateLead('ID-B', { eventoHistorico: 'follow-up dia 3' }, '2026-11-13');
    expect(lead.historico).toBe('10/11 1ª msg (curta) · 12/11 editado à mão · 13/11 follow-up dia 3');
  });

  it('proxAcao null limpa a célula', async () => {
    planilha.grade[3]![CABECALHO.indexOf('Próx. ação')] = 46340;
    const lead = await updateLead('ID-B', { proxAcao: null }, '2026-11-13');
    expect(planilha.escritas).toEqual([`${col('Próx. ação')}4=`]);
    expect(lead.proxAcao).toBeNull();
  });

  it('lança LeadNaoEncontrado para Place ID inexistente, sem escrever', async () => {
    await expect(updateLead('ID-Z', { toques: 1 }, '2026-11-13')).rejects.toBeInstanceOf(LeadNaoEncontrado);
    expect(planilha.escritas).toEqual([]);
  });

  it('recusa escrever quando o Place ID está repetido', async () => {
    planilha.grade[2] = linha({ Empresa: 'Cópia', 'Place ID': 'ID-A' });
    await expect(updateLead('ID-A', { toques: 1 }, '2026-11-13')).rejects.toBeInstanceOf(ConflitoPlanilha);
    expect(planilha.escritas).toEqual([]);
  });
});

describe('importLeads', () => {
  const nova = (over: Record<string, Celula> = {}) => ({
    Prioridade: 'Média',
    Nicho: 'Pet shop',
    Empresa: 'Pet Novo',
    Cidade: 'Assis',
    UF: 'SP',
    Telefone: '+55 18 99000-1111',
    'Situação': 'Instagram no lugar do site',
    'Link atual': 'https://instagram.com/petnovo',
    'URL atual': 'https://instagram.com/petnovo',
    Nota: 4.5,
    'Avaliações': 20,
    'Google Maps': 'https://www.google.com/maps/place/?q=place_id:ID-N',
    'Place ID': 'ID-N',
    'Enviar 1ª msg': 'coluna legada, não deve ser gravada',
    ...over,
  });

  it('anexa só os novos, na ordem do cabeçalho, com Status A contatar e Toques 0', async () => {
    const r = await importLeads([nova(), nova({ Empresa: 'Repetido', 'Place ID': 'ID-A' })], { dryRun: false });
    expect(r.inseridos.map((l) => l.empresa)).toEqual(['Pet Novo']);
    expect(r.duplicados).toEqual([{ empresa: 'Repetido', motivo: 'Place ID já existe na linha 2 (Clínica A)' }]);
    expect(planilha.anexadas).toHaveLength(1);
    const anexada = planilha.anexadas[0]!;
    expect(anexada).toHaveLength(CABECALHO.length);
    expect(anexada[CABECALHO.indexOf('Empresa')]).toBe('Pet Novo');
    expect(anexada[CABECALHO.indexOf('Telefone')]).toBe('+55 18 99000-1111');
    expect(anexada[CABECALHO.indexOf('Status')]).toBe('A contatar');
    expect(anexada[CABECALHO.indexOf('Toques')]).toBe(0);
    expect(anexada[CABECALHO.indexOf('Enviar 1ª msg')]).toBe('');
    expect(anexada[CABECALHO.indexOf('Histórico')]).toBe('');

    const lead = await getLead('ID-N');
    expect(lead).toMatchObject({ empresa: 'Pet Novo', status: 'A contatar', toques: 0, nota: 4.5, situacao: 'Instagram no lugar do site' });
  });

  it('respeita o cabeçalho reordenado', async () => {
    const invertido = [...CABECALHO].reverse();
    planilha.grade = [invertido];
    await importLeads([nova()], { dryRun: false });
    expect(planilha.anexadas[0]![invertido.indexOf('Place ID')]).toBe('ID-N');
    expect(planilha.anexadas[0]![invertido.indexOf('Empresa')]).toBe('Pet Novo');
  });

  it('em dry-run calcula o resultado sem gravar', async () => {
    const r = await importLeads([nova(), nova({ Empresa: 'Sem situação', 'Place ID': 'ID-X', Telefone: '', 'Situação': '' })], { dryRun: true });
    expect(r.inseridos).toHaveLength(1);
    expect(r.ignorados).toEqual([{ empresa: 'Sem situação', motivo: 'Situação vazia.' }]);
    expect(planilha.anexadas).toEqual([]);
  });
});
