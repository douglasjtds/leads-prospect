// Tipos do domínio. Fonte: instructions/PRODUCT-SPEC.md §4 e §5, instructions/ARCHITECTURE.md §5.

export const STATUS = [
  'A contatar',
  'Contatado',
  'Resposta automática',
  'Respondeu',
  'Reunião marcada',
  'Proposta enviada',
  'Fechado',
  'Sem interesse',
] as const;
export type Status = (typeof STATUS)[number];

export const SITUACOES = [
  'Sem site',
  'Instagram no lugar do site',
  'Facebook no lugar do site',
  'WhatsApp no lugar do site',
  'Link na bio / plataforma',
  'Site amador (construtor grátis)',
] as const;
export type Situacao = (typeof SITUACOES)[number];

export const PRIORIDADES = ['Alta', 'Média', 'Baixa'] as const;
export type Prioridade = (typeof PRIORIDADES)[number];

export const VARIANTES = ['curta', 'completa'] as const;
export type Variante = (typeof VARIANTES)[number];

/** Data no formato yyyy-MM-dd, sempre no fuso America/Sao_Paulo. */
export type DataISO = string;

export interface Lead {
  /** Número da linha na planilha no momento da leitura. Só para exibição, nunca para escrita. */
  linha: number;
  /** Chave única do lead. */
  placeId: string;
  prioridade: Prioridade | null;
  nicho: string;
  empresa: string;
  cidade: string;
  uf: string;
  telefone: string;
  situacao: Situacao | null;
  /** Texto visível da coluna "Link atual". */
  linkAtual: string;
  /** URL em texto puro do "Link atual" (coluna "URL atual"). */
  urlAtual: string;
  nota: number | null;
  avaliacoes: number | null;
  googleMaps: string;
  status: Status;
  dataContato: DataISO | null;
  proxAcao: DataISO | null;
  toques: number;
  historico: string;
  observacoes: string;
  variante: Variante | null;
  /** Versão completa pré-gerada da 1ª mensagem (coluna "Mensagem (texto)"). */
  mensagemTexto: string;
}

export const RESULTADOS_REVISAO = [
  'semResposta',
  'respostaAutomatica',
  'respondeu',
  'semInteresse',
] as const;
export type ResultadoRevisao = (typeof RESULTADOS_REVISAO)[number];

export type Acao =
  | { tipo: 'enviei'; variante?: Variante }
  | { tipo: 'mudarStatus'; status: Status }
  | { tipo: 'revisar'; resultado: ResultadoRevisao }
  | { tipo: 'pular'; motivo: string }
  | { tipo: 'salvarObs'; texto: string };

/**
 * Campos que uma ação altera. Calculado no servidor a partir da ação e do estado lido da planilha.
 * `proxAcao: null` significa limpar a célula; ausência significa não mexer.
 */
export interface Patch {
  status?: Status;
  toques?: number;
  proxAcao?: DataISO | null;
  dataContato?: DataISO;
  variante?: Variante;
  observacoes?: string;
  /** Texto do evento (sem data); o servidor concatena "dd/MM texto" ao Histórico atual. */
  eventoHistorico?: string;
}
