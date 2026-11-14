import { describe, expect, it } from 'vitest';
import { fazerLead } from './__fixtures__/lead';
import { contarEnviadosHoje, proximoNaFila, secoesHoje } from './today';
import type { Lead } from './types';

const HOJE = '2026-11-13';

/** Conjunto de exemplo: dois leads por seção, mais os que não devem aparecer. */
function exemplo(): Lead[] {
  return [
    // Responderam
    fazerLead({ empresa: 'resp-vazio', status: 'Respondeu', linha: 10 }),
    fazerLead({ empresa: 'reuniao-vencida', status: 'Reunião marcada', proxAcao: '2026-11-10', linha: 5 }),
    fazerLead({ empresa: 'resp-futuro', status: 'Respondeu', proxAcao: '2026-11-14', linha: 6 }),
    // Automáticas
    fazerLead({ empresa: 'ra-furar', status: 'Resposta automática', linha: 20 }),
    fazerLead({ empresa: 'ra-cobrar', status: 'Resposta automática', historico: '10/11 furou fila', proxAcao: HOJE, linha: 21 }),
    fazerLead({ empresa: 'ra-aguardando', status: 'Resposta automática', historico: '10/11 furou fila · 12/11 cobrou resposta', linha: 22 }),
    fazerLead({ empresa: 'ra-futuro', status: 'Resposta automática', historico: '12/11 furou fila', proxAcao: '2026-11-14', linha: 23 }),
    // Follow-ups
    fazerLead({ empresa: 'fu3-hoje', status: 'Contatado', toques: 1, proxAcao: HOJE, linha: 30 }),
    fazerLead({ empresa: 'fu7-antigo', status: 'Contatado', toques: 2, proxAcao: '2026-11-01', linha: 31 }),
    fazerLead({ empresa: 'proposta-vazia', status: 'Proposta enviada', linha: 32 }),
    fazerLead({ empresa: 'fu3-futuro', status: 'Contatado', toques: 1, proxAcao: '2026-11-15', linha: 33 }),
    fazerLead({ empresa: 'fu3-sem-data', status: 'Contatado', toques: 1, linha: 34 }),
    fazerLead({ empresa: 'encerrado', status: 'Contatado', toques: 3, proxAcao: '2026-11-01', linha: 35 }),
    fazerLead({ empresa: 'proposta-futura', status: 'Proposta enviada', proxAcao: '2026-11-20', linha: 36 }),
    // Revisar
    fazerLead({ empresa: 'revisar-b', status: 'Contatado', toques: 0, linha: 41 }),
    fazerLead({ empresa: 'revisar-a', status: 'Contatado', toques: 0, linha: 40 }),
    // Novos (fora de ordem de propósito)
    ...[60, 55, 58, 52, 57, 51].map((linha) => fazerLead({ empresa: `novo-${linha}`, linha })),
    // Encerrados
    fazerLead({ empresa: 'fechado', status: 'Fechado' }),
    fazerLead({ empresa: 'sem-interesse', status: 'Sem interesse' }),
  ];
}

const empresas = (leads: Lead[]) => leads.map((l) => l.empresa);

describe('secoesHoje', () => {
  const secoes = secoesHoje(exemplo(), HOJE, 25, 0);
  const secao = (chave: string) => secoes.find((s) => s.chave === chave)!;

  it('as 5 seções na ordem da §7.4', () => {
    expect(secoes.map((s) => s.chave)).toEqual(['responderam', 'automaticas', 'followups', 'revisar', 'novos']);
    expect(secoes.map((s) => s.titulo)).toEqual([
      'Responderam: sua vez',
      'Respostas automáticas para furar',
      'Follow-ups vencidos',
      'Revisar no WhatsApp',
      'Novos envios',
    ]);
  });

  it('Responderam: Respondeu e Reunião com Próx. ação vazia ou vencida', () => {
    expect(empresas(secao('responderam').leads)).toEqual(['resp-vazio', 'reuniao-vencida']);
  });

  it('Automáticas: só com mensagem pendente e Próx. ação vazia ou vencida', () => {
    expect(empresas(secao('automaticas').leads)).toEqual(['ra-furar', 'ra-cobrar']);
  });

  it('Follow-ups: Contatado Toques 1/2 vencido e Proposta vazia ou vencida', () => {
    expect(empresas(secao('followups').leads)).toEqual(['proposta-vazia', 'fu7-antigo', 'fu3-hoje']);
  });

  it('Revisar: Contatado com Toques 0, na ordem da planilha', () => {
    expect(empresas(secao('revisar').leads)).toEqual(['revisar-a', 'revisar-b']);
  });

  it('Novos: A contatar na ordem da planilha', () => {
    expect(empresas(secao('novos').leads)).toEqual(['novo-51', 'novo-52', 'novo-55', 'novo-57', 'novo-58', 'novo-60']);
    expect(secao('novos').dica).toBe('faltam 25 para a meta');
  });

  it('Novos limitado ao que falta para a meta', () => {
    const novos = secoesHoje(exemplo(), HOJE, 25, 21).find((s) => s.chave === 'novos')!;
    expect(novos.leads).toHaveLength(4);
    expect(novos.dica).toBe('faltam 4 para a meta');
  });

  it('Novos com a meta batida (ou quase) ainda mostra 3', () => {
    for (const enviados of [24, 25, 30]) {
      const novos = secoesHoje(exemplo(), HOJE, 25, enviados).find((s) => s.chave === 'novos')!;
      expect(empresas(novos.leads)).toEqual(['novo-51', 'novo-52', 'novo-55']);
    }
    expect(secoesHoje(exemplo(), HOJE, 25, 30).find((s) => s.chave === 'novos')!.dica).toBe('meta batida');
  });

  it('seções vazias não aparecem', () => {
    const so = secoesHoje([fazerLead({ status: 'Contatado', toques: 0 })], HOJE, 25, 0);
    expect(so.map((s) => s.chave)).toEqual(['revisar']);
    expect(secoesHoje([], HOJE, 25, 0)).toEqual([]);
  });

  it('todas as seções têm dica', () => {
    for (const s of secoes) expect(s.dica).not.toBe('');
  });
});

describe('contarEnviadosHoje', () => {
  it('conta só a 1ª mensagem registrada hoje', () => {
    const leads = [
      fazerLead({ status: 'Contatado', toques: 1, historico: '13/11 1ª msg (curta)' }),
      fazerLead({ status: 'Contatado', toques: 1, historico: '12/11 status → A contatar · 13/11 1ª msg (completa)' }),
      fazerLead({ status: 'Contatado', toques: 2, historico: '10/11 1ª msg (curta) · 13/11 follow-up dia 3' }),
      fazerLead({ status: 'Contatado', toques: 1, historico: '12/11 1ª msg (curta)' }),
      fazerLead(),
    ];
    expect(contarEnviadosHoje(leads, HOJE)).toBe(2);
  });
});

describe('proximoNaFila', () => {
  const ids = (prefixo: string, n: number) => Array.from({ length: n }, (_, i) => fazerLead({ placeId: `${prefixo}${i}` }));
  const secoes = [
    { chave: 'responderam' as const, titulo: '', dica: '', leads: ids('r', 2) },
    { chave: 'followups' as const, titulo: '', dica: '', leads: ids('f', 3) },
    { chave: 'novos' as const, titulo: '', dica: '', leads: ids('n', 1) },
  ];

  it('devolve o item logo abaixo na mesma seção', () => {
    expect(proximoNaFila(secoes, 'f0')).toBe('f1');
    expect(proximoNaFila(secoes, 'r0')).toBe('r1');
  });

  it('no último da seção, vai para o primeiro da seção seguinte', () => {
    expect(proximoNaFila(secoes, 'r1')).toBe('f0');
    expect(proximoNaFila(secoes, 'f2')).toBe('n0');
  });

  it('null no fim do Hoje ou para lead fora do Hoje', () => {
    expect(proximoNaFila(secoes, 'n0')).toBeNull();
    expect(proximoNaFila(secoes, 'outro')).toBeNull();
    expect(proximoNaFila([], 'r0')).toBeNull();
  });
});
