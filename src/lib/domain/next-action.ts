import { addDias } from './dates';
import { concatHistorico } from './historico';
import { mensagem, primeiraMensagem, varianteEfetiva } from './messages';
import { celular } from './phone';
import type { Acao, DataISO, Lead, Patch, ResultadoRevisao, Status } from './types';

// Máquina de próxima ação da PRODUCT-SPEC §5.2 e §5.3.

export type TipoProximaAcao =
  | 'primeira'
  | 'revisar'
  | 'fu3'
  | 'fu7'
  | 'encerrada'
  | 'furar'
  | 'cobrarRA'
  | 'aguardando'
  | 'site'
  | 'emConversa'
  | 'proposta'
  | 'nenhuma';

export interface ProximaAcao {
  tipo: TipoProximaAcao;
  titulo: string;
  sub: string;
  texto?: string;
}

/** Ação que não se aplica ao estado atual do lead. Vira 409 na API. */
export class AcaoInvalida extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AcaoInvalida';
  }
}

/** Marcadores gravados no Histórico que a máquina consulta. */
export const EVENTO = {
  furouFila: 'furou fila',
  cobrouResposta: 'cobrou resposta',
  enviouSite: 'enviou site',
} as const;

export const MOTIVOS_PULAR = ['número errado', 'rede ou franquia', 'já tem site', 'outro'] as const;

function historicoTem(lead: Lead, evento: string): boolean {
  return lead.historico.includes(evento);
}

/** O lead tem por onde receber a 1ª mensagem: celular (WhatsApp) ou link atual (DM). */
export function temContato(lead: Lead): boolean {
  return celular(lead.telefone) || lead.urlAtual.trim() !== '' || lead.linkAtual.trim() !== '';
}

export function proximaAcao(lead: Lead): ProximaAcao {
  switch (lead.status) {
    case 'A contatar':
      if (!temContato(lead)) {
        return { tipo: 'nenhuma', titulo: 'Sem contato', sub: 'Sem celular nem link atual. Corrija na planilha ou pule.' };
      }
      return {
        tipo: 'primeira',
        titulo: '1ª mensagem',
        sub: celular(lead.telefone)
          ? 'Copie, cole no WhatsApp e envie.'
          : 'Sem celular: copie e mande por DM no link atual.',
        texto: primeiraMensagem(lead, 'curta'),
      };

    case 'Contatado':
      if (lead.toques === 0) {
        return {
          tipo: 'revisar',
          titulo: 'Revisar',
          sub: 'A 1ª mensagem saiu antes do app. Abra o chat e diga o que aconteceu.',
        };
      }
      if (lead.toques === 1) {
        return { tipo: 'fu3', titulo: 'Follow-up dia 3', sub: 'Ainda sem resposta à 1ª mensagem.', texto: mensagem('fu3') };
      }
      if (lead.toques === 2) {
        return { tipo: 'fu7', titulo: 'Follow-up final', sub: 'Último toque da sequência.', texto: mensagem('fu7') };
      }
      return { tipo: 'encerrada', titulo: 'Sequência encerrada', sub: 'Três mensagens sem resposta. Nada a fazer.' };

    case 'Resposta automática':
      if (!historicoTem(lead, EVENTO.furouFila)) {
        return {
          tipo: 'furar',
          titulo: 'Furar a resposta automática',
          sub: 'Peça para falar com o responsável.',
          texto: mensagem('furar'),
        };
      }
      if (!historicoTem(lead, EVENTO.cobrouResposta)) {
        return { tipo: 'cobrarRA', titulo: 'Cobrar retorno', sub: 'Já furou a fila e ainda não teve resposta.', texto: mensagem('cobrarRA') };
      }
      return { tipo: 'aguardando', titulo: 'Aguardando', sub: 'Já cobrou o retorno. Agora é esperar.' };

    case 'Respondeu':
    case 'Reunião marcada':
      if (!historicoTem(lead, EVENTO.enviouSite)) {
        return { tipo: 'site', titulo: 'Mandar o site', sub: 'Responda com o site e a ideia da página.', texto: mensagem('site') };
      }
      return { tipo: 'emConversa', titulo: 'Em conversa', sub: 'Site enviado. Use as respostas rápidas.' };

    case 'Proposta enviada':
      return { tipo: 'proposta', titulo: 'Cobrar a proposta', sub: 'Pergunte se deu para ver a proposta.', texto: mensagem('proposta') };

    case 'Fechado':
      return { tipo: 'nenhuma', titulo: 'Nenhuma', sub: 'Negócio fechado.' };

    case 'Sem interesse':
      return { tipo: 'nenhuma', titulo: 'Nenhuma', sub: 'Lead encerrado.' };
  }
}

// ---------- Transições ----------

function enviei(lead: Lead, acao: Extract<Acao, { tipo: 'enviei' }>, hoje: DataISO): Patch {
  const prox = proximaAcao(lead);
  switch (prox.tipo) {
    case 'primeira': {
      const variante = varianteEfetiva(lead, acao.variante ?? 'curta');
      return {
        status: 'Contatado',
        toques: 1,
        ...(lead.dataContato ? {} : { dataContato: hoje }),
        proxAcao: addDias(hoje, 3),
        variante,
        eventoHistorico: `1ª msg (${variante})`,
      };
    }
    case 'fu3':
      return { toques: 2, proxAcao: addDias(hoje, 4), eventoHistorico: 'follow-up dia 3' };
    case 'fu7':
      return { toques: 3, proxAcao: null, eventoHistorico: 'follow-up final' };
    case 'furar':
      return { toques: lead.toques + 1, proxAcao: addDias(hoje, 2), eventoHistorico: EVENTO.furouFila };
    case 'cobrarRA':
      return { toques: lead.toques + 1, proxAcao: null, eventoHistorico: EVENTO.cobrouResposta };
    case 'site':
      return { proxAcao: addDias(hoje, 2), eventoHistorico: EVENTO.enviouSite };
    case 'proposta':
      return { proxAcao: addDias(hoje, 3), eventoHistorico: 'cobrou proposta' };
    case 'revisar':
    case 'encerrada':
    case 'aguardando':
    case 'emConversa':
    case 'nenhuma':
      throw new AcaoInvalida(
        `Não há mensagem para registrar: o lead está em "${lead.status}" (${prox.titulo.toLowerCase()}).`,
      );
  }
}

const STATUS_QUE_LIMPAM_PROX: readonly Status[] = [
  'Respondeu',
  'Reunião marcada',
  'Resposta automática',
  'Fechado',
  'Sem interesse',
];

function mudarStatus(lead: Lead, status: Status, hoje: DataISO): Patch {
  if (status === lead.status) throw new AcaoInvalida(`O lead já está em "${status}".`);
  const patch: Patch = { status, eventoHistorico: `status → ${status}` };
  if (STATUS_QUE_LIMPAM_PROX.includes(status)) patch.proxAcao = null;
  if (status === 'Proposta enviada') patch.proxAcao = addDias(hoje, 3);
  if (status === 'Contatado' && lead.toques === 0) {
    patch.toques = 1;
    if (!lead.dataContato) patch.dataContato = hoje;
    patch.proxAcao = addDias(hoje, 3);
  }
  return patch;
}

function revisar(lead: Lead, resultado: ResultadoRevisao, hoje: DataISO): Patch {
  if (lead.status !== 'Contatado' || lead.toques !== 0) {
    throw new AcaoInvalida('Esse lead não está mais para revisar.');
  }
  switch (resultado) {
    case 'semResposta':
      return { toques: 1, proxAcao: hoje, eventoHistorico: 'revisado: sem resposta' };
    case 'respostaAutomatica':
      return { status: 'Resposta automática', proxAcao: null, eventoHistorico: 'revisado: resposta automática' };
    case 'respondeu':
      return { status: 'Respondeu', proxAcao: null, eventoHistorico: 'revisado: respondeu' };
    case 'semInteresse':
      return { status: 'Sem interesse', proxAcao: null, eventoHistorico: 'revisado: sem interesse' };
  }
}

function pular(lead: Lead, motivo: string): Patch {
  if (lead.status !== 'A contatar') throw new AcaoInvalida('Só dá para pular um lead em "A contatar".');
  const m = motivo.trim();
  if (!m) throw new AcaoInvalida('Informe o motivo para pular.');
  return { status: 'Sem interesse', proxAcao: null, eventoHistorico: `pulado: ${m}` };
}

/**
 * Patch de campos para uma ação, calculado a partir do estado atual do lead.
 * Lança AcaoInvalida quando a ação não se aplica a esse estado.
 */
export function aplicarAcao(lead: Lead, acao: Acao, hoje: DataISO): Patch {
  switch (acao.tipo) {
    case 'enviei':
      return enviei(lead, acao, hoje);
    case 'mudarStatus':
      return mudarStatus(lead, acao.status, hoje);
    case 'revisar':
      return revisar(lead, acao.resultado, hoje);
    case 'pular':
      return pular(lead, acao.motivo);
    case 'salvarObs':
      return { observacoes: acao.texto };
  }
}

/**
 * Aplica um patch ao lead em memória, do mesmo jeito que o servidor grava na planilha
 * (histórico concatenado como "dd/MM evento"). Usado na atualização otimista do cliente.
 */
export function aplicarPatch(lead: Lead, patch: Patch, hoje: DataISO): Lead {
  const { eventoHistorico, ...campos } = patch;
  return {
    ...lead,
    ...campos,
    historico: eventoHistorico === undefined ? lead.historico : concatHistorico(lead.historico, eventoHistorico, hoje),
  };
}
