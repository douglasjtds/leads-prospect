import {
  PRIORIDADES,
  SITUACOES,
  STATUS,
  VARIANTES,
  type DataISO,
  type Lead,
  type Patch,
  type Prioridade,
  type Situacao,
  type Status,
  type Variante,
} from '@/lib/domain/types';

// Contrato com a planilha: nomes de coluna e conversões de tipo. Puro, sem rede.
// Fonte: instructions/PRODUCT-SPEC.md §4 e instructions/ARCHITECTURE.md §4.

/** Nome do cabeçalho de cada campo do Lead. Os nomes são o contrato; a ordem pode mudar. */
export const COLUNAS = {
  prioridade: 'Prioridade',
  nicho: 'Nicho',
  empresa: 'Empresa',
  cidade: 'Cidade',
  uf: 'UF',
  telefone: 'Telefone',
  situacao: 'Situação',
  linkAtual: 'Link atual',
  nota: 'Nota',
  avaliacoes: 'Avaliações',
  googleMaps: 'Google Maps',
  placeId: 'Place ID',
  urlAtual: 'URL atual',
  status: 'Status',
  dataContato: 'Data contato',
  proxAcao: 'Próx. ação',
  toques: 'Toques',
  historico: 'Histórico',
  observacoes: 'Observações',
  variante: 'Variante',
  mensagemTexto: 'Mensagem (texto)',
} as const satisfies Record<Exclude<keyof Lead, 'linha'>, string>;

export type Campo = keyof typeof COLUNAS;
export type NomeColuna = (typeof COLUNAS)[Campo];

export const COLUNAS_OBRIGATORIAS: readonly NomeColuna[] = Object.values(COLUNAS);

/** Colunas que o app cria na migração, nesta ordem (ARCHITECTURE §4.6). */
export const COLUNAS_DO_APP: readonly NomeColuna[] = [
  COLUNAS.placeId,
  COLUNAS.urlAtual,
  COLUNAS.historico,
  COLUNAS.proxAcao,
  COLUNAS.toques,
  COLUNAS.variante,
];

/** Valor de célula como chega com UNFORMATTED_VALUE. */
export type Celula = string | number | boolean | null | undefined;

export class ColunaFaltando extends Error {
  constructor(public readonly colunas: readonly string[]) {
    super(
      colunas.length === 1
        ? `Coluna "${colunas[0]}" não encontrada. Rode npm run migrate.`
        : `Colunas não encontradas: ${colunas.map((c) => `"${c}"`).join(', ')}. Rode npm run migrate.`,
    );
    this.name = 'ColunaFaltando';
  }
}

export class DadoInvalido extends Error {
  constructor(linha: number, coluna: string, valor: Celula) {
    super(`Linha ${linha}: valor "${String(valor)}" inválido na coluna "${coluna}".`);
    this.name = 'DadoInvalido';
  }
}

// ---------- Cabeçalho ----------

export type MapaCabecalho = ReadonlyMap<string, number>;

/** Monta { nome: índice } a partir da linha 1. Em nome repetido, vale a primeira ocorrência. */
export function mapaCabecalho(linha1: readonly Celula[]): MapaCabecalho {
  const mapa = new Map<string, number>();
  linha1.forEach((celula, i) => {
    const nome = typeof celula === 'string' ? celula.trim() : '';
    if (nome && !mapa.has(nome)) mapa.set(nome, i);
  });
  return mapa;
}

export function colunasFaltando(mapa: MapaCabecalho, exigidas: readonly string[] = COLUNAS_OBRIGATORIAS): string[] {
  return exigidas.filter((nome) => !mapa.has(nome));
}

export function exigirColunas(mapa: MapaCabecalho, exigidas: readonly string[] = COLUNAS_OBRIGATORIAS): void {
  const faltando = colunasFaltando(mapa, exigidas);
  if (faltando.length > 0) throw new ColunaFaltando(faltando);
}

/** Índice de uma coluna obrigatória (lança ColunaFaltando se não existir). */
export function indiceColuna(mapa: MapaCabecalho, nome: string): number {
  const i = mapa.get(nome);
  if (i === undefined) throw new ColunaFaltando([nome]);
  return i;
}

/** 0 → A, 25 → Z, 26 → AA. */
export function letraColuna(indice: number): string {
  let n = indice + 1;
  let letras = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
}

/** Aspas na aba para a notação A1 ('Minha aba'!A1). */
export function rangeA1(aba: string, intervalo: string): string {
  return `'${aba.replace(/'/g, "''")}'!${intervalo}`;
}

// ---------- Datas (serial do Sheets, base 1899-12-30) ----------

const DIA_MS = 86_400_000;
const EPOCA_SHEETS = Date.UTC(1899, 11, 30);

/** Serial do Sheets → yyyy-MM-dd. A fração (hora) é descartada. */
export function serialParaData(serial: number): DataISO {
  return new Date(EPOCA_SHEETS + Math.floor(serial) * DIA_MS).toISOString().slice(0, 10);
}

/** yyyy-MM-dd → serial inteiro do Sheets. */
export function dataParaSerial(data: DataISO): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!m) throw new Error(`Data inválida: "${data}"`);
  return Math.round((Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - EPOCA_SHEETS) / DIA_MS);
}

/** Célula de data → yyyy-MM-dd. Aceita serial ou texto dd/MM/yyyy digitado à mão. */
export function celulaParaData(celula: Celula): DataISO | null {
  if (typeof celula === 'number' && Number.isFinite(celula)) return serialParaData(celula);
  if (typeof celula === 'string') {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(celula.trim());
    if (m) return `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
  }
  return null;
}

/** yyyy-MM-dd → dd/MM. */
export function diaMes(data: DataISO): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}`;
}

// ---------- Histórico ("dd/MM evento" separados por " · ") ----------

export const SEPARADOR_HISTORICO = ' · ';

export function concatHistorico(atual: string, evento: string, hoje: DataISO): string {
  const novo = `${diaMes(hoje)} ${evento}`;
  const base = atual.trim();
  return base ? `${base}${SEPARADOR_HISTORICO}${novo}` : novo;
}

export interface EventoHistorico {
  /** dd/MM, ou vazio se o texto foi escrito à mão sem data. */
  data: string;
  texto: string;
}

/** Eventos na ordem em que aparecem na célula (do mais antigo para o mais recente). */
export function parseHistorico(texto: string): EventoHistorico[] {
  return texto
    .split(SEPARADOR_HISTORICO)
    .map((parte) => parte.trim())
    .filter(Boolean)
    .map((parte) => {
      const m = /^(\d{2}\/\d{2}) (.+)$/.exec(parte);
      return m ? { data: m[1]!, texto: m[2]! } : { data: '', texto: parte };
    });
}

// ---------- Links ----------

/** Extrai o place_id de uma URL do Google Maps (place_id:XXX ou place_id=XXX, codificado ou não). */
export function extrairPlaceId(url: string): string | null {
  let texto = url;
  try {
    texto = decodeURIComponent(url);
  } catch {
    // URL com % solto: usa como veio.
  }
  return /place_id[:=]([\w-]+)/.exec(texto)?.[1] ?? null;
}

// ---------- Linha → Lead ----------

function texto(celula: Celula): string {
  if (celula === null || celula === undefined) return '';
  return String(celula).trim();
}

function numero(celula: Celula): number | null {
  if (typeof celula === 'number') return Number.isFinite(celula) ? celula : null;
  const t = texto(celula).replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function enumOuNulo<T extends string>(valores: readonly T[], celula: Celula, linha: number, coluna: string): T | null {
  const t = texto(celula);
  if (!t) return null;
  if ((valores as readonly string[]).includes(t)) return t as T;
  throw new DadoInvalido(linha, coluna, celula);
}

/**
 * Converte uma linha da planilha em Lead. `numeroLinha` é o número da linha na planilha
 * (1 = cabeçalho), guardado só para exibição.
 */
export function linhaParaLead(linha: readonly Celula[], mapa: MapaCabecalho, numeroLinha: number): Lead {
  const cel = (campo: Campo): Celula => linha[indiceColuna(mapa, COLUNAS[campo])];

  const toquesCel = cel('toques');
  const toques = numero(toquesCel);
  if (texto(toquesCel) && (toques === null || !Number.isInteger(toques) || toques < 0)) {
    throw new DadoInvalido(numeroLinha, COLUNAS.toques, toquesCel);
  }

  return {
    linha: numeroLinha,
    placeId: texto(cel('placeId')),
    prioridade: enumOuNulo<Prioridade>(PRIORIDADES, cel('prioridade'), numeroLinha, COLUNAS.prioridade),
    nicho: texto(cel('nicho')),
    empresa: texto(cel('empresa')),
    cidade: texto(cel('cidade')),
    uf: texto(cel('uf')),
    telefone: texto(cel('telefone')),
    situacao: enumOuNulo<Situacao>(SITUACOES, cel('situacao'), numeroLinha, COLUNAS.situacao),
    linkAtual: texto(cel('linkAtual')),
    urlAtual: texto(cel('urlAtual')),
    nota: numero(cel('nota')),
    avaliacoes: numero(cel('avaliacoes')),
    googleMaps: texto(cel('googleMaps')),
    status: enumOuNulo<Status>(STATUS, cel('status'), numeroLinha, COLUNAS.status) ?? 'A contatar',
    dataContato: celulaParaData(cel('dataContato')),
    proxAcao: celulaParaData(cel('proxAcao')),
    toques: toques ?? 0,
    historico: texto(cel('historico')),
    observacoes: texto(cel('observacoes')),
    variante: enumOuNulo<Variante>(VARIANTES, cel('variante'), numeroLinha, COLUNAS.variante),
    mensagemTexto: texto(cel('mensagemTexto')),
  };
}

/** Linha com Empresa preenchida (as demais são ignoradas, ARCHITECTURE §4.2). */
export function linhaTemEmpresa(linha: readonly Celula[], mapa: MapaCabecalho): boolean {
  return texto(linha[indiceColuna(mapa, COLUNAS.empresa)]) !== '';
}

// ---------- Patch → células ----------

export interface CelulaEscrita {
  coluna: NomeColuna;
  /** "" limpa a célula. Datas vão como serial (a formatação da coluna cuida da exibição). */
  valor: string | number;
}

/**
 * Células a gravar para um patch. O Histórico é concatenado com o valor relido da planilha
 * no momento da escrita (`historicoAtual`), nunca com o que o cliente tinha.
 */
export function patchParaCelulas(patch: Patch, historicoAtual: string, hoje: DataISO): CelulaEscrita[] {
  const celulas: CelulaEscrita[] = [];
  if (patch.status !== undefined) celulas.push({ coluna: COLUNAS.status, valor: patch.status });
  if (patch.toques !== undefined) celulas.push({ coluna: COLUNAS.toques, valor: patch.toques });
  if (patch.proxAcao !== undefined) {
    celulas.push({ coluna: COLUNAS.proxAcao, valor: patch.proxAcao === null ? '' : dataParaSerial(patch.proxAcao) });
  }
  if (patch.dataContato !== undefined) {
    celulas.push({ coluna: COLUNAS.dataContato, valor: dataParaSerial(patch.dataContato) });
  }
  if (patch.variante !== undefined) celulas.push({ coluna: COLUNAS.variante, valor: patch.variante });
  if (patch.observacoes !== undefined) celulas.push({ coluna: COLUNAS.observacoes, valor: patch.observacoes });
  if (patch.eventoHistorico !== undefined) {
    celulas.push({ coluna: COLUNAS.historico, valor: concatHistorico(historicoAtual, patch.eventoHistorico, hoje) });
  }
  return celulas;
}
