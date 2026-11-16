import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Celula } from './schema';

// Aba Mensagens falsa em memória. `existe: false` simula a aba ainda não criada.
const aba = vi.hoisted(() => ({ existe: true, grade: [] as Celula[][], criacoes: 0 }));

function coluna(letra: string): number {
  return letra.charCodeAt(0) - 65;
}

vi.mock('./client', async (importOriginal) => {
  const real = await importOriginal<typeof import('./client')>();
  return {
    ...real,
    abaConfigurada: () => 'Leads',
    sheetsGet: vi.fn(async (caminho: string) => {
      const range = decodeURIComponent(new URL(`https://x${caminho}`).pathname.slice('/values/'.length));
      if (range !== "'Mensagens'!A1:ZZ") throw new Error(`GET não suportado: ${range}`);
      if (!aba.existe) throw new real.ErroPlanilha('Aba não encontrada', 400, 'Unable to parse range: Mensagens!A1:ZZ');
      return { values: aba.grade };
    }),
    sheetsPost: vi.fn(async (caminho: string, corpo: { requests?: unknown[]; data?: Array<{ range: string; values: Celula[][] }>; values?: Celula[][] }) => {
      if (caminho === ':batchUpdate') {
        aba.existe = true;
        aba.criacoes++;
        return {};
      }
      if (caminho === '/values:batchUpdate') {
        for (const { range, values } of corpo.data ?? []) {
          const m = /'Mensagens'!([A-Z])(\d+)$/.exec(range)!;
          const linha = (aba.grade[Number(m[2]) - 1] ??= []);
          linha[coluna(m[1]!)] = values[0]![0];
        }
        return {};
      }
      if (caminho.includes(':append')) {
        aba.grade.push(...(corpo.values ?? []));
        return {};
      }
      throw new Error(`POST não suportado: ${caminho}`);
    }),
  };
});

const { listModelos, salvarModelo, restaurarModelo, ConflitoPlanilha } = await import('./leads-repo');

beforeEach(() => {
  aba.existe = true;
  aba.criacoes = 0;
  // Colunas fora da ordem e com uma coluna extra: o repo acha pelo nome.
  aba.grade = [
    ['Obs', 'Texto', 'Chave'],
    ['', 'Oi {empresa}!', 'fu3'],
    ['', 'ignorado', 'chaveQueNaoExiste'],
    ['', '', 'fu7'],
  ];
});

describe('listModelos', () => {
  it('lê pelo nome do cabeçalho e ignora chave desconhecida e texto vazio', async () => {
    expect(await listModelos()).toEqual({ fu3: 'Oi {empresa}!' });
  });

  it('sem a aba: nenhum modelo salvo', async () => {
    aba.existe = false;
    expect(await listModelos()).toEqual({});
  });
});

describe('salvarModelo', () => {
  it('atualiza a linha achada pela Chave', async () => {
    await salvarModelo('fu7', 'Novo fu7');
    expect(aba.grade[3]).toEqual(['', 'Novo fu7', 'fu7']);
  });

  it('chave nova: anexa na ordem do cabeçalho', async () => {
    await salvarModelo('site', 'Meu site');
    expect(aba.grade.at(-1)).toEqual(['', 'Meu site', 'site']);
  });

  it('sem a aba: cria a aba e o cabeçalho e grava', async () => {
    aba.existe = false;
    aba.grade = [];
    await salvarModelo('proposta', 'E a proposta?');
    expect(aba.criacoes).toBe(1);
    expect(aba.grade).toEqual([
      ['Chave', 'Texto'],
      ['proposta', 'E a proposta?'],
    ]);
  });

  it('chave repetida na aba é conflito', async () => {
    aba.grade.push(['', 'outro', 'fu3']);
    await expect(salvarModelo('fu3', 'x')).rejects.toBeInstanceOf(ConflitoPlanilha);
  });
});

describe('restaurarModelo', () => {
  it('limpa o Texto da chave', async () => {
    await restaurarModelo('fu3');
    expect(aba.grade[1]).toEqual(['', '', 'fu3']);
    expect(await listModelos()).toEqual({});
  });

  it('sem a aba: não faz nada', async () => {
    aba.existe = false;
    await expect(restaurarModelo('fu3')).resolves.toBeUndefined();
  });
});
