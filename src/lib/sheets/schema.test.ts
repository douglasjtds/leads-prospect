import { describe, expect, it } from 'vitest';
import {
  COLUNAS,
  COLUNAS_OBRIGATORIAS,
  ColunaFaltando,
  DadoInvalido,
  celulaParaData,
  colunasFaltando,
  concatHistorico,
  dataParaSerial,
  exigirColunas,
  extrairPlaceId,
  letraColuna,
  linhaParaLead,
  mapaCabecalho,
  parseHistorico,
  patchParaCelulas,
  rangeA1,
  serialParaData,
  type Celula,
} from './schema';

describe('datas seriais', () => {
  it('converte a base e datas conhecidas', () => {
    expect(serialParaData(0)).toBe('1899-12-30');
    expect(serialParaData(1)).toBe('1899-12-31');
    expect(serialParaData(46337)).toBe('2026-11-11');
  });

  it('descarta a fração de hora (Data contato veio com hora da planilha)', () => {
    expect(serialParaData(46337.44680686343)).toBe('2026-11-11');
    expect(serialParaData(46337.999)).toBe('2026-11-11');
  });

  it('ida e volta', () => {
    for (const d of ['2026-01-01', '2026-02-28', '2028-02-29', '2026-12-31']) {
      expect(serialParaData(dataParaSerial(d))).toBe(d);
    }
    expect(dataParaSerial('2026-11-11')).toBe(46337);
  });

  it('rejeita data fora do formato', () => {
    expect(() => dataParaSerial('11/11/2026')).toThrow(/inválida/);
  });

  it('lê célula como serial ou como texto dd/MM/yyyy digitado à mão', () => {
    expect(celulaParaData(46337)).toBe('2026-11-11');
    expect(celulaParaData('5/3/2026')).toBe('2026-03-05');
    expect(celulaParaData('')).toBeNull();
    expect(celulaParaData(undefined)).toBeNull();
    expect(celulaParaData('amanhã')).toBeNull();
  });
});

describe('histórico', () => {
  it('começa sem separador quando vazio', () => {
    expect(concatHistorico('', '1ª msg (curta)', '2026-11-13')).toBe('13/11 1ª msg (curta)');
    expect(concatHistorico('   ', 'x', '2026-01-05')).toBe('05/01 x');
  });

  it('concatena com " · "', () => {
    expect(concatHistorico('10/11 1ª msg (curta)', 'follow-up dia 3', '2026-11-13')).toBe(
      '10/11 1ª msg (curta) · 13/11 follow-up dia 3',
    );
  });

  it('faz o parse de eventos com e sem data', () => {
    expect(parseHistorico('10/11 1ª msg (curta) · 13/11 furou fila · anotado à mão')).toEqual([
      { data: '10/11', texto: '1ª msg (curta)' },
      { data: '13/11', texto: 'furou fila' },
      { data: '', texto: 'anotado à mão' },
    ]);
    expect(parseHistorico('')).toEqual([]);
  });
});

describe('colunas', () => {
  it('letraColuna', () => {
    expect([0, 1, 25, 26, 27, 51, 52, 701].map(letraColuna)).toEqual(['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA', 'ZZ']);
  });

  it('rangeA1 protege o nome da aba', () => {
    expect(rangeA1('Leads', 'A1:ZZ')).toBe("'Leads'!A1:ZZ");
    expect(rangeA1("Leads d'água", 'A1')).toBe("'Leads d''água'!A1");
  });

  it('mapeia por nome, ignorando vazios e espaços', () => {
    const mapa = mapaCabecalho(['Empresa', '', ' Status ', 'Empresa']);
    expect(mapa.get('Empresa')).toBe(0);
    expect(mapa.get('Status')).toBe(2);
    expect(mapa.size).toBe(2);
  });

  it('aponta as colunas faltando com a mensagem da arquitetura', () => {
    const mapa = mapaCabecalho(COLUNAS_OBRIGATORIAS.filter((c) => c !== 'Place ID'));
    expect(colunasFaltando(mapa)).toEqual(['Place ID']);
    expect(() => exigirColunas(mapa)).toThrow('Coluna "Place ID" não encontrada. Rode npm run migrate.');
    expect(() => exigirColunas(mapaCabecalho([]))).toThrow(ColunaFaltando);
  });
});

describe('extrairPlaceId', () => {
  it('lê place_id com ":" e "=", codificado ou não', () => {
    expect(extrairPlaceId('https://www.google.com/maps/search/?api=1&query=X&query_place_id=ChIJ_ab-12')).toBe('ChIJ_ab-12');
    expect(extrairPlaceId('https://www.google.com/maps/place/?q=place_id:ChIJxyz')).toBe('ChIJxyz');
    expect(extrairPlaceId('https://www.google.com/maps/place/?q=place_id%3AChIJenc')).toBe('ChIJenc');
    expect(extrairPlaceId('https://instagram.com/x')).toBeNull();
    expect(extrairPlaceId('')).toBeNull();
  });
});

describe('linhaParaLead', () => {
  // Cabeçalho em ordem diferente da spec, com colunas legadas no meio.
  const cabecalho = [
    'Status', 'Enviar 1ª msg', ...COLUNAS_OBRIGATORIAS.filter((c) => c !== 'Status'), 'Follow-up dia 3',
  ];
  const mapa = mapaCabecalho(cabecalho);
  const linha = (valores: Partial<Record<string, Celula>>): Celula[] => cabecalho.map((c) => valores[c]);

  it('converte pelo nome do cabeçalho, não pela posição', () => {
    const lead = linhaParaLead(
      linha({
        Status: 'Contatado',
        'Enviar 1ª msg': 'ignorado',
        Prioridade: 'Alta',
        Nicho: 'Pet shop',
        Empresa: '  Amigo Fiel ',
        Telefone: '+55 18 99771-7770',
        Situação: 'Sem site',
        Nota: 4.8,
        Avaliações: 38,
        'Place ID': 'ChIJ1',
        'Data contato': 46337.4468,
        'Próx. ação': 46340,
        Toques: 1,
        Histórico: '11/11 1ª msg (curta)',
        Variante: 'curta',
      }),
      mapa,
      7,
    );
    expect(lead).toMatchObject({
      linha: 7,
      status: 'Contatado',
      prioridade: 'Alta',
      empresa: 'Amigo Fiel',
      placeId: 'ChIJ1',
      nota: 4.8,
      avaliacoes: 38,
      dataContato: '2026-11-11',
      proxAcao: '2026-11-14',
      toques: 1,
      variante: 'curta',
      observacoes: '',
    });
  });

  it('usa padrões nas colunas vazias (como estão hoje Toques, Histórico e Próx. ação)', () => {
    const lead = linhaParaLead(linha({ Empresa: 'X' }), mapa, 2);
    expect(lead).toMatchObject({
      status: 'A contatar',
      toques: 0,
      historico: '',
      proxAcao: null,
      dataContato: null,
      variante: null,
      situacao: null,
      prioridade: null,
      nota: null,
    });
  });

  it('aceita Toques e Nota digitados como texto', () => {
    const lead = linhaParaLead(linha({ Empresa: 'X', Toques: '2', Nota: '4,9' }), mapa, 2);
    expect(lead.toques).toBe(2);
    expect(lead.nota).toBe(4.9);
  });

  it('rejeita valores fora das listas com o número da linha', () => {
    expect(() => linhaParaLead(linha({ Empresa: 'X', Status: 'Ganhou' }), mapa, 9)).toThrow(DadoInvalido);
    expect(() => linhaParaLead(linha({ Empresa: 'X', Status: 'Ganhou' }), mapa, 9)).toThrow(/Linha 9/);
    expect(() => linhaParaLead(linha({ Empresa: 'X', Toques: 'dois' }), mapa, 3)).toThrow(/Toques/);
    expect(() => linhaParaLead(linha({ Empresa: 'X', Variante: 'longa' }), mapa, 3)).toThrow(/Variante/);
  });
});

describe('patchParaCelulas', () => {
  it('converte datas em serial, null em limpar e concatena o histórico relido', () => {
    const celulas = patchParaCelulas(
      {
        status: 'Contatado',
        toques: 1,
        dataContato: '2026-11-13',
        proxAcao: '2026-11-16',
        variante: 'curta',
        eventoHistorico: '1ª msg (curta)',
      },
      'histórico da planilha',
      '2026-11-13',
    );
    expect(celulas).toEqual([
      { coluna: COLUNAS.status, valor: 'Contatado' },
      { coluna: COLUNAS.toques, valor: 1 },
      { coluna: COLUNAS.proxAcao, valor: dataParaSerial('2026-11-16') },
      { coluna: COLUNAS.dataContato, valor: dataParaSerial('2026-11-13') },
      { coluna: COLUNAS.variante, valor: 'curta' },
      { coluna: COLUNAS.historico, valor: 'histórico da planilha · 13/11 1ª msg (curta)' },
    ]);
  });

  it('proxAcao null limpa a célula; patch vazio não escreve nada', () => {
    expect(patchParaCelulas({ proxAcao: null }, '', '2026-11-13')).toEqual([{ coluna: COLUNAS.proxAcao, valor: '' }]);
    expect(patchParaCelulas({}, 'x', '2026-11-13')).toEqual([]);
  });
});
