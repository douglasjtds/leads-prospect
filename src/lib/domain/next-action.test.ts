import { describe, expect, it } from 'vitest';
import { fazerLead } from './__fixtures__/lead';
import { mensagem, primeiraMensagem } from './messages';
import { AcaoInvalida, aplicarAcao, aplicarPatch, proximaAcao, temContato } from './next-action';
import { STATUS, type Status } from './types';

const HOJE = '2026-11-13';

describe('§5.2 máquina de próxima ação', () => {
  it('A contatar com celular: 1ª mensagem curta; Enviei → Contatado, Toques 1, Data contato, +3, Variante, histórico', () => {
    const lead = fazerLead();
    const prox = proximaAcao(lead);
    expect(prox.tipo).toBe('primeira');
    expect(prox.texto).toBe(primeiraMensagem(lead, 'curta'));
    expect(prox.sub).toContain('WhatsApp');
    expect(aplicarAcao(lead, { tipo: 'enviei', variante: 'curta' }, HOJE)).toEqual({
      status: 'Contatado',
      toques: 1,
      dataContato: HOJE,
      proxAcao: '2026-11-16',
      variante: 'curta',
      eventoHistorico: '1ª msg (curta)',
    });
  });

  it('A contatar só com link atual: 1ª mensagem por DM', () => {
    const lead = fazerLead({ telefone: '+55 18 3221-0000', urlAtual: 'https://instagram.com/x' });
    expect(proximaAcao(lead).tipo).toBe('primeira');
    expect(proximaAcao(lead).sub).toContain('DM');
  });

  it('A contatar: Enviei sem variante usa curta e não sobrescreve Data contato existente', () => {
    const patch = aplicarAcao(fazerLead({ dataContato: '2026-10-01' }), { tipo: 'enviei' }, HOJE);
    expect(patch.variante).toBe('curta');
    expect(patch).not.toHaveProperty('dataContato');
  });

  it('A contatar: Enviei completa grava completa; completa sem texto grava curta', () => {
    const comTexto = fazerLead({ mensagemTexto: 'Texto pronto' });
    expect(aplicarAcao(comTexto, { tipo: 'enviei', variante: 'completa' }, HOJE)).toMatchObject({
      variante: 'completa',
      eventoHistorico: '1ª msg (completa)',
    });
    expect(aplicarAcao(fazerLead(), { tipo: 'enviei', variante: 'completa' }, HOJE)).toMatchObject({
      variante: 'curta',
      eventoHistorico: '1ª msg (curta)',
    });
  });

  it('A contatar sem celular nem link: nenhuma ação e Enviei inválido', () => {
    const lead = fazerLead({ telefone: '+55 18 3221-0000' });
    expect(temContato(lead)).toBe(false);
    expect(proximaAcao(lead)).toMatchObject({ tipo: 'nenhuma', titulo: 'Sem contato' });
    expect(() => aplicarAcao(lead, { tipo: 'enviei' }, HOJE)).toThrow(AcaoInvalida);
  });

  it('Contatado, Toques 0: Revisar, sem mensagem, Enviei inválido', () => {
    const lead = fazerLead({ status: 'Contatado', toques: 0 });
    expect(proximaAcao(lead)).toMatchObject({ tipo: 'revisar', titulo: 'Revisar' });
    expect(proximaAcao(lead).texto).toBeUndefined();
    expect(() => aplicarAcao(lead, { tipo: 'enviei' }, HOJE)).toThrow(AcaoInvalida);
  });

  it('Contatado, Toques 1: Follow-up dia 3; Enviei → Toques 2, +4, histórico', () => {
    const lead = fazerLead({ status: 'Contatado', toques: 1 });
    expect(proximaAcao(lead)).toMatchObject({ tipo: 'fu3', titulo: 'Follow-up dia 3', texto: mensagem('fu3') });
    expect(aplicarAcao(lead, { tipo: 'enviei' }, HOJE)).toEqual({
      toques: 2,
      proxAcao: '2026-11-17',
      eventoHistorico: 'follow-up dia 3',
    });
  });

  it('Contatado, Toques 2: Follow-up final; Enviei → Toques 3, Próx. ação vazia, histórico', () => {
    const lead = fazerLead({ status: 'Contatado', toques: 2 });
    expect(proximaAcao(lead)).toMatchObject({ tipo: 'fu7', titulo: 'Follow-up final', texto: mensagem('fu7') });
    expect(aplicarAcao(lead, { tipo: 'enviei' }, HOJE)).toEqual({
      toques: 3,
      proxAcao: null,
      eventoHistorico: 'follow-up final',
    });
  });

  it('Contatado, Toques ≥ 3: Sequência encerrada, Enviei inválido', () => {
    for (const toques of [3, 5]) {
      const lead = fazerLead({ status: 'Contatado', toques });
      expect(proximaAcao(lead)).toMatchObject({ tipo: 'encerrada', titulo: 'Sequência encerrada' });
      expect(() => aplicarAcao(lead, { tipo: 'enviei' }, HOJE)).toThrow(AcaoInvalida);
    }
  });

  it('Resposta automática sem "furou fila": Furar; Enviei → Toques +1, +2, histórico', () => {
    const lead = fazerLead({ status: 'Resposta automática', toques: 1, historico: '01/11 1ª msg (curta)' });
    expect(proximaAcao(lead)).toMatchObject({ tipo: 'furar', texto: mensagem('furar') });
    expect(aplicarAcao(lead, { tipo: 'enviei' }, HOJE)).toEqual({
      toques: 2,
      proxAcao: '2026-11-15',
      eventoHistorico: 'furou fila',
    });
  });

  it('Resposta automática com "furou fila" e sem "cobrou resposta": Cobrar retorno; Enviei → Toques +1, vazia', () => {
    const lead = fazerLead({ status: 'Resposta automática', toques: 2, historico: '01/11 1ª msg (curta) · 05/11 furou fila' });
    expect(proximaAcao(lead)).toMatchObject({ tipo: 'cobrarRA', titulo: 'Cobrar retorno', texto: mensagem('cobrarRA') });
    expect(aplicarAcao(lead, { tipo: 'enviei' }, HOJE)).toEqual({
      toques: 3,
      proxAcao: null,
      eventoHistorico: 'cobrou resposta',
    });
  });

  it('Resposta automática já cobrada: Aguardando, Enviei inválido', () => {
    const lead = fazerLead({ status: 'Resposta automática', historico: '05/11 furou fila · 07/11 cobrou resposta' });
    expect(proximaAcao(lead)).toMatchObject({ tipo: 'aguardando', titulo: 'Aguardando' });
    expect(() => aplicarAcao(lead, { tipo: 'enviei' }, HOJE)).toThrow(AcaoInvalida);
  });

  it.each<Status>(['Respondeu', 'Reunião marcada'])('%s sem "enviou site": Mandar o site; Enviei → +2, histórico', (status) => {
    const lead = fazerLead({ status, toques: 1 });
    expect(proximaAcao(lead)).toMatchObject({ tipo: 'site', titulo: 'Mandar o site', texto: mensagem('site') });
    expect(aplicarAcao(lead, { tipo: 'enviei' }, HOJE)).toEqual({ proxAcao: '2026-11-15', eventoHistorico: 'enviou site' });
  });

  it.each<Status>(['Respondeu', 'Reunião marcada'])('%s com site enviado: Em conversa, Enviei inválido', (status) => {
    const lead = fazerLead({ status, historico: '10/11 enviou site' });
    expect(proximaAcao(lead)).toMatchObject({ tipo: 'emConversa', titulo: 'Em conversa' });
    expect(proximaAcao(lead).texto).toBeUndefined();
    expect(() => aplicarAcao(lead, { tipo: 'enviei' }, HOJE)).toThrow(AcaoInvalida);
  });

  it('Proposta enviada: Cobrar a proposta; Enviei → +3, histórico', () => {
    const lead = fazerLead({ status: 'Proposta enviada' });
    expect(proximaAcao(lead)).toMatchObject({ tipo: 'proposta', titulo: 'Cobrar a proposta', texto: mensagem('proposta') });
    expect(aplicarAcao(lead, { tipo: 'enviei' }, HOJE)).toEqual({ proxAcao: '2026-11-16', eventoHistorico: 'cobrou proposta' });
  });

  it.each<Status>(['Fechado', 'Sem interesse'])('%s: nenhuma ação, Enviei inválido', (status) => {
    const lead = fazerLead({ status });
    expect(proximaAcao(lead).tipo).toBe('nenhuma');
    expect(() => aplicarAcao(lead, { tipo: 'enviei' }, HOJE)).toThrow(AcaoInvalida);
  });

  it('Enviei num lead que já mudou de status lança AcaoInvalida com mensagem', () => {
    const lead = fazerLead({ status: 'Respondeu', historico: '10/11 enviou site' });
    expect(() => aplicarAcao(lead, { tipo: 'enviei' }, HOJE)).toThrow('o lead está em "Respondeu"');
  });
});

describe('§5.3 revisar', () => {
  const lead = fazerLead({ status: 'Contatado', toques: 0, dataContato: '2026-09-20' });

  it('Ainda sem resposta → Toques 1, Próx. ação hoje, histórico', () => {
    expect(aplicarAcao(lead, { tipo: 'revisar', resultado: 'semResposta' }, HOJE)).toEqual({
      toques: 1,
      proxAcao: HOJE,
      eventoHistorico: 'revisado: sem resposta',
    });
  });

  it('Resposta automática → status, Próx. ação vazia, histórico', () => {
    expect(aplicarAcao(lead, { tipo: 'revisar', resultado: 'respostaAutomatica' }, HOJE)).toEqual({
      status: 'Resposta automática',
      proxAcao: null,
      eventoHistorico: 'revisado: resposta automática',
    });
  });

  it('Respondeu → status, Próx. ação vazia, histórico', () => {
    expect(aplicarAcao(lead, { tipo: 'revisar', resultado: 'respondeu' }, HOJE)).toEqual({
      status: 'Respondeu',
      proxAcao: null,
      eventoHistorico: 'revisado: respondeu',
    });
  });

  it('Sem interesse → status, histórico', () => {
    expect(aplicarAcao(lead, { tipo: 'revisar', resultado: 'semInteresse' }, HOJE)).toEqual({
      status: 'Sem interesse',
      proxAcao: null,
      eventoHistorico: 'revisado: sem interesse',
    });
  });

  it('Revisar fora de Contatado com Toques 0 é inválido', () => {
    expect(() => aplicarAcao(fazerLead({ status: 'Contatado', toques: 1 }), { tipo: 'revisar', resultado: 'respondeu' }, HOJE)).toThrow(
      AcaoInvalida,
    );
    expect(() => aplicarAcao(fazerLead(), { tipo: 'revisar', resultado: 'respondeu' }, HOJE)).toThrow(AcaoInvalida);
  });
});

describe('mudança manual de status', () => {
  it.each<Status>(['Respondeu', 'Reunião marcada', 'Resposta automática', 'Fechado', 'Sem interesse'])(
    'para %s: Próx. ação vazia e histórico',
    (status) => {
      const lead = fazerLead({ status: 'Contatado', toques: 1, proxAcao: '2026-11-15' });
      expect(aplicarAcao(lead, { tipo: 'mudarStatus', status }, HOJE)).toEqual({
        status,
        proxAcao: null,
        eventoHistorico: `status → ${status}`,
      });
    },
  );

  it('para Proposta enviada: +3', () => {
    const lead = fazerLead({ status: 'Reunião marcada' });
    expect(aplicarAcao(lead, { tipo: 'mudarStatus', status: 'Proposta enviada' }, HOJE)).toEqual({
      status: 'Proposta enviada',
      proxAcao: '2026-11-16',
      eventoHistorico: 'status → Proposta enviada',
    });
  });

  it('para Contatado com Toques 0: Toques 1, Data contato hoje, +3', () => {
    expect(aplicarAcao(fazerLead(), { tipo: 'mudarStatus', status: 'Contatado' }, HOJE)).toEqual({
      status: 'Contatado',
      toques: 1,
      dataContato: HOJE,
      proxAcao: '2026-11-16',
      eventoHistorico: 'status → Contatado',
    });
  });

  it('para Contatado com Toques 0 e Data contato preenchida: mantém a data', () => {
    const patch = aplicarAcao(fazerLead({ dataContato: '2026-10-01' }), { tipo: 'mudarStatus', status: 'Contatado' }, HOJE);
    expect(patch).not.toHaveProperty('dataContato');
    expect(patch.toques).toBe(1);
  });

  it('para Contatado com Toques > 0 e para A contatar: só histórico', () => {
    const ra = fazerLead({ status: 'Resposta automática', toques: 2 });
    expect(aplicarAcao(ra, { tipo: 'mudarStatus', status: 'Contatado' }, HOJE)).toEqual({
      status: 'Contatado',
      eventoHistorico: 'status → Contatado',
    });
    expect(aplicarAcao(ra, { tipo: 'mudarStatus', status: 'A contatar' }, HOJE)).toEqual({
      status: 'A contatar',
      eventoHistorico: 'status → A contatar',
    });
  });

  it('para o mesmo status é inválido', () => {
    for (const status of STATUS) {
      expect(() => aplicarAcao(fazerLead({ status }), { tipo: 'mudarStatus', status }, HOJE)).toThrow(AcaoInvalida);
    }
  });
});

describe('pular e observações', () => {
  it('Pular em A contatar → Sem interesse, histórico com motivo', () => {
    expect(aplicarAcao(fazerLead(), { tipo: 'pular', motivo: ' rede ou franquia ' }, HOJE)).toEqual({
      status: 'Sem interesse',
      proxAcao: null,
      eventoHistorico: 'pulado: rede ou franquia',
    });
  });

  it('Pular fora de A contatar ou sem motivo é inválido', () => {
    expect(() => aplicarAcao(fazerLead({ status: 'Contatado', toques: 1 }), { tipo: 'pular', motivo: 'outro' }, HOJE)).toThrow(
      AcaoInvalida,
    );
    expect(() => aplicarAcao(fazerLead(), { tipo: 'pular', motivo: '  ' }, HOJE)).toThrow(AcaoInvalida);
  });

  it('Salvar observações em qualquer status', () => {
    for (const status of STATUS) {
      expect(aplicarAcao(fazerLead({ status }), { tipo: 'salvarObs', texto: 'ligar à tarde' }, HOJE)).toEqual({
        observacoes: 'ligar à tarde',
      });
    }
  });

  it('AcaoInvalida tem nome próprio', () => {
    expect(new AcaoInvalida('x').name).toBe('AcaoInvalida');
  });
});

describe('aplicarPatch (atualização otimista)', () => {
  const dia = '2026-11-13';

  it('aplica os campos e concatena o histórico como o servidor', () => {
    const lead = fazerLead({ historico: '10/11 1ª msg (curta)', status: 'Contatado', toques: 1, proxAcao: '2026-11-13' });
    const novo = aplicarPatch(lead, aplicarAcao(lead, { tipo: 'enviei' }, dia), dia);
    expect(novo).toMatchObject({ toques: 2, proxAcao: '2026-11-17', historico: '10/11 1ª msg (curta) · 13/11 follow-up dia 3' });
    expect(novo).not.toHaveProperty('eventoHistorico');
  });

  it('proxAcao null limpa a data; sem evento mantém o histórico', () => {
    const lead = fazerLead({ proxAcao: '2026-11-20', historico: 'x' });
    const novo = aplicarPatch(lead, { proxAcao: null, observacoes: 'oi' }, dia);
    expect(novo).toMatchObject({ proxAcao: null, observacoes: 'oi', historico: 'x' });
  });

  it('não altera o lead original', () => {
    const lead = fazerLead();
    aplicarPatch(lead, { status: 'Fechado', eventoHistorico: 'status → Fechado' }, dia);
    expect(lead.status).toBe('A contatar');
    expect(lead.historico).toBe('');
  });
});
