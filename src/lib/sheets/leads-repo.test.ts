import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Celula } from './schema';
import { COLUNAS_OBRIGATORIAS, dataParaSerial, letraColuna } from './schema';

// Planilha falsa em memória: entende os ranges que o repo usa ('Leads'!1:1, 'Leads'!M1:M,
// 'Leads'!7:7, 'Leads'!C5, 'Leads'!A1:ZZ) e aplica values:batchUpdate na grade.
const planilha = vi.hoisted(() => ({ grade: [] as Celula[][], escritas: [] as string[] }));

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
  sheetsPost: vi.fn(async (caminho: string, corpo: { data: Array<{ range: string; values: Celula[][] }> }) => {
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

const { listLeads, updateLead, LeadNaoEncontrado, ConflitoPlanilha } = await import('./leads-repo');

// Cabeçalho com colunas legadas e fora da ordem da spec, como a planilha real.
const CABECALHO = ['Prioridade', 'Enviar 1ª msg', ...COLUNAS_OBRIGATORIAS.filter((c) => c !== 'Prioridade')];
const col = (nome: string) => letraColuna(CABECALHO.indexOf(nome));

function linha(valores: Record<string, Celula>): Celula[] {
  return CABECALHO.map((c) => valores[c]);
}

beforeEach(() => {
  planilha.escritas = [];
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
