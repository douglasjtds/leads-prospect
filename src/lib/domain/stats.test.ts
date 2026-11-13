import { describe, expect, it } from 'vitest';
import { fazerLead } from './__fixtures__/lead';
import { funil, resumo, testeAB } from './stats';
import { STATUS } from './types';

const leads = [
  fazerLead(),
  fazerLead(),
  fazerLead({ status: 'Sem interesse', historico: '13/11 pulado: rede ou franquia' }),
  fazerLead({ status: 'Contatado', toques: 1, variante: 'curta' }),
  fazerLead({ status: 'Contatado', toques: 0 }),
  fazerLead({ status: 'Resposta automática', variante: 'curta' }),
  fazerLead({ status: 'Respondeu', variante: 'curta' }),
  fazerLead({ status: 'Reunião marcada', variante: 'completa' }),
  fazerLead({ status: 'Proposta enviada' }),
  fazerLead({ status: 'Fechado', variante: 'completa' }),
  fazerLead({ status: 'Sem interesse', variante: 'completa', historico: '13/11 revisado: sem interesse' }),
];

describe('funil', () => {
  it('conta todos os status, zero incluso', () => {
    expect(funil(leads)).toEqual({
      'A contatar': 2,
      Contatado: 2,
      'Resposta automática': 1,
      Respondeu: 1,
      'Reunião marcada': 1,
      'Proposta enviada': 1,
      Fechado: 1,
      'Sem interesse': 2,
    });
    expect(Object.keys(funil([]))).toEqual([...STATUS]);
  });
});

describe('resumo', () => {
  it('contatados sem pulados, conversas reais e %, automáticas', () => {
    expect(resumo(leads)).toEqual({
      contatados: 8,
      conversasReais: 4,
      percentualConversas: 50,
      respostasAutomaticas: 1,
    });
  });

  it('sem contatados o percentual é 0', () => {
    expect(resumo([fazerLead()]).percentualConversas).toBe(0);
  });
});

describe('testeAB', () => {
  it('por variante: enviadas, qualquer resposta e resposta humana', () => {
    expect(testeAB(leads)).toEqual([
      { variante: 'curta', enviadas: 3, comQualquerResposta: 2, comRespostaHumana: 1 },
      { variante: 'completa', enviadas: 3, comQualquerResposta: 2, comRespostaHumana: 2 },
    ]);
  });
});
