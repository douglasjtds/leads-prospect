import { describe, expect, it } from 'vitest';
import { fazerLead } from './__fixtures__/lead';
import { MODELOS_PADRAO, mensagem, modeloDe, primeiraMensagem, respostasRapidas, valoresDoLead } from './messages';
import {
  juntar,
  marcadoresDesconhecidos,
  renderizar,
  segmentar,
  temProblema,
  validarModelo,
  variaveisDe,
  type ValoresVariaveis,
} from './templates';

const VALORES: ValoresVariaveis = {
  empresa: 'Clínica Bella',
  nicho: 'dentistas',
  cidade: 'Araçatuba',
  elogio: '.',
  observacao: '',
  avaliacoes: ' mostrando essas 37 avaliações com nota 5,0',
};

describe('segmentar e juntar', () => {
  it('separa texto e variáveis conhecidas', () => {
    expect(segmentar('pra {empresa} em {cidade}!')).toEqual([
      { tipo: 'texto', valor: 'pra ' },
      { tipo: 'var', nome: 'empresa' },
      { tipo: 'texto', valor: ' em ' },
      { tipo: 'var', nome: 'cidade' },
      { tipo: 'texto', valor: '!' },
    ]);
  });

  it('marcador desconhecido ou com espaço fica como texto', () => {
    expect(segmentar('oi {foo} e { empresa }')).toEqual([{ tipo: 'texto', valor: 'oi {foo} e { empresa }' }]);
  });

  it('juntar é o inverso de segmentar', () => {
    for (const modelo of Object.values(MODELOS_PADRAO)) expect(juntar(segmentar(modelo))).toBe(modelo);
  });

  it('variaveisDe e marcadoresDesconhecidos', () => {
    expect(variaveisDe('{empresa} {nicho} {empresa}')).toEqual(['empresa', 'nicho', 'empresa']);
    expect(marcadoresDesconhecidos('{empresa} {nome} {nome} {x}')).toEqual(['nome', 'x']);
  });
});

describe('renderizar', () => {
  it('troca as variáveis e tira o espaço que sobra no fim da linha', () => {
    expect(renderizar('encontrei vocês{elogio} {observacao}\nPra {empresa}', VALORES)).toBe(
      'encontrei vocês.\nPra Clínica Bella',
    );
  });

  it('{avaliacoes} vira o trecho com os números, ou some quando vazio', () => {
    expect(renderizar('uma pra {empresa}{avaliacoes}:', VALORES)).toBe(
      'uma pra Clínica Bella mostrando essas 37 avaliações com nota 5,0:',
    );
    expect(renderizar('uma pra {empresa}{avaliacoes}:', { ...VALORES, avaliacoes: '' })).toBe('uma pra Clínica Bella:');
  });
});

describe('modelos salvos', () => {
  it('modelo salvo tem prioridade; vazio cai no padrão', () => {
    expect(modeloDe('fu3', { fu3: 'Oi {empresa}!' })).toBe('Oi {empresa}!');
    expect(modeloDe('fu3', { fu3: '   ' })).toBe(MODELOS_PADRAO.fu3);
  });

  it('variáveis valem em qualquer mensagem, com os dados do lead', () => {
    const lead = fazerLead({ empresa: 'Clínica Bella' });
    expect(mensagem('fu3', lead, { fu3: 'Oi, pessoal da {empresa}!' })).toBe('Oi, pessoal da Clínica Bella!');
    expect(respostasRapidas(lead, { rrPreco: 'Pra {empresa}: R$ 500.' })[0]?.texto).toBe('Pra Clínica Bella: R$ 500.');
  });

  it('1ª mensagem usa o modelo salvo da situação do lead', () => {
    const lead = fazerLead({ empresa: 'Studio X', situacao: 'Site amador (construtor grátis)' });
    const modelos = { primeiraSiteAmador: 'Ideias pra {empresa}', primeiraPadrao: 'outro' };
    expect(primeiraMensagem(lead, 'curta', modelos)).toBe('Ideias pra Studio X');
  });
});

describe('validarModelo', () => {
  const original = MODELOS_PADRAO.primeiraPadrao;

  it('sem mudança nas variáveis: sem problema', () => {
    const editado = original.replace('Posso te mostrar', 'Posso te enviar');
    expect(temProblema(validarModelo(original, editado, VALORES))).toBe(false);
  });

  it('variável apagada aparece em faltando', () => {
    const editado = original.replace('{empresa}', 'vocês');
    expect(validarModelo(original, editado).faltando).toEqual(['empresa']);
  });

  it('variável desconhecida digitada', () => {
    expect(validarModelo(original, `${original} {nome}`).desconhecidas).toEqual(['nome']);
  });

  it('valor do lead escrito à mão no lugar da variável', () => {
    const editado = original.replace('{empresa}', 'Clínica Bella');
    const p = validarModelo(original, editado, VALORES);
    expect(p.faltando).toEqual(['empresa']);
    expect(p.escritasAMao).toEqual([{ nome: 'empresa', valor: 'Clínica Bella' }]);
  });

  it('não acusa valor que já estava no texto original (ex.: "vocês" sem nome)', () => {
    const valores = valoresDoLead(fazerLead({ empresa: '' }));
    expect(validarModelo(original, original, valores).escritasAMao).toEqual([]);
  });
});
