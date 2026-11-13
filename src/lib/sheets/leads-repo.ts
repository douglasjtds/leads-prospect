import type { DataISO, Lead, Patch } from '@/lib/domain/types';
import { STATUS } from '@/lib/domain/types';
import { abaConfigurada, sheetsGet, sheetsPost } from './client';
import {
  COLUNAS,
  COLUNAS_DO_APP,
  colunasFaltando,
  exigirColunas,
  extrairPlaceId,
  indiceColuna,
  letraColuna,
  linhaParaLead,
  linhaTemEmpresa,
  mapaCabecalho,
  patchParaCelulas,
  rangeA1,
  type Celula,
  type MapaCabecalho,
} from './schema';

// ÚNICO ponto de leitura e escrita na planilha (CLAUDE.md). ARCHITECTURE §4.

// ---------- Tipos mínimos das respostas da Sheets API v4 ----------

interface ValueRange {
  range?: string;
  values?: Celula[][];
}
interface BatchGetResposta {
  valueRanges?: ValueRange[];
}
interface PropriedadesAba {
  sheetId: number;
  title: string;
  gridProperties: { rowCount: number; columnCount: number };
}
interface Metadados {
  properties: { title: string };
  sheets: Array<{ properties: PropriedadesAba }>;
}
interface CelulaGrade {
  hyperlink?: string;
  formattedValue?: string;
  dataValidation?: { condition?: { type?: string; values?: Array<{ userEnteredValue?: string }> } };
  userEnteredFormat?: { numberFormat?: { type?: string; pattern?: string } };
}
interface GradeResposta {
  sheets?: Array<{ data?: Array<{ startRow?: number; rowData?: Array<{ values?: CelulaGrade[] }> }> }>;
}

// ---------- Erros ----------

export class LeadNaoEncontrado extends Error {
  constructor(public readonly placeId: string) {
    super(`Lead com Place ID "${placeId}" não encontrado na planilha.`);
    this.name = 'LeadNaoEncontrado';
  }
}

/** A planilha está num estado em que a escrita não é segura (Place ID repetido, linha movida). */
export class ConflitoPlanilha extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflitoPlanilha';
  }
}

// ---------- Auxiliares ----------

const LEITURA = 'valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER';

function enc(range: string): string {
  return encodeURIComponent(range);
}

/** Lê a aba inteira (uma chamada). */
async function lerAba(): Promise<{ mapa: MapaCabecalho; cabecalho: Celula[]; linhas: Celula[][] }> {
  const aba = abaConfigurada();
  const resposta = await sheetsGet<ValueRange>(`/values/${enc(rangeA1(aba, 'A1:ZZ'))}?${LEITURA}`);
  const [cabecalho = [], ...linhas] = resposta.values ?? [];
  return { mapa: mapaCabecalho(cabecalho), cabecalho, linhas };
}

async function batchGet(ranges: readonly string[]): Promise<ValueRange[]> {
  const params = ranges.map((r) => `ranges=${enc(r)}`).join('&');
  const resposta = await sheetsGet<BatchGetResposta>(`/values:batchGet?${params}&${LEITURA}`);
  return resposta.valueRanges ?? [];
}

async function metadadosAba(): Promise<{ titulo: string; aba: PropriedadesAba }> {
  const nome = abaConfigurada();
  const meta = await sheetsGet<Metadados>('?fields=properties.title,sheets.properties(sheetId,title,gridProperties)');
  const aba = meta.sheets.find((s) => s.properties.title === nome)?.properties;
  if (!aba) throw new ConflitoPlanilha(`Aba "${nome}" não encontrada. Renomeie a aba ou ajuste SHEET_TAB.`);
  return { titulo: meta.properties.title, aba };
}

/** Coluna inteira a partir da linha 1 (ex.: 'Leads'!M1:M). */
function rangeColuna(indice: number): string {
  const l = letraColuna(indice);
  return rangeA1(abaConfigurada(), `${l}1:${l}`);
}

function valorColuna(range: ValueRange | undefined): Celula[] {
  return (range?.values ?? []).map((linha) => linha[0]);
}

// ---------- Leitura ----------

export async function listLeads(): Promise<Lead[]> {
  const { mapa, linhas } = await lerAba();
  exigirColunas(mapa);
  const leads: Lead[] = [];
  linhas.forEach((linha, i) => {
    if (linhaTemEmpresa(linha, mapa)) leads.push(linhaParaLead(linha, mapa, i + 2));
  });
  return leads;
}

// ---------- Escrita ----------

let mapaEmCache: MapaCabecalho | undefined;

/**
 * Acha a linha do lead pelo Place ID e lê o Histórico atual. Numa chamada só, lê também o
 * cabeçalho, para conferir que as colunas usadas ainda estão onde o cache diz. Se o Douglas
 * reordenou as colunas, refaz a leitura com o mapa novo.
 */
async function localizar(placeId: string): Promise<{ mapa: MapaCabecalho; numeroLinha: number; historico: string }> {
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    if (!mapaEmCache) {
      const [cab] = await batchGet([rangeA1(abaConfigurada(), '1:1')]);
      mapaEmCache = mapaCabecalho(cab?.values?.[0] ?? []);
    }
    const iPlace = indiceColuna(mapaEmCache, COLUNAS.placeId);
    const iHist = indiceColuna(mapaEmCache, COLUNAS.historico);
    const [cab, colPlace, colHist] = await batchGet([
      rangeA1(abaConfigurada(), '1:1'),
      rangeColuna(iPlace),
      rangeColuna(iHist),
    ]);
    const mapa = mapaCabecalho(cab?.values?.[0] ?? []);
    if (mapa.get(COLUNAS.placeId) !== iPlace || mapa.get(COLUNAS.historico) !== iHist) {
      mapaEmCache = mapa;
      continue;
    }
    mapaEmCache = mapa;
    exigirColunas(mapa);

    const places = valorColuna(colPlace);
    const linhas = places.flatMap((v, i) => (i > 0 && String(v ?? '').trim() === placeId ? [i] : []));
    if (linhas.length === 0) throw new LeadNaoEncontrado(placeId);
    if (linhas.length > 1) {
      throw new ConflitoPlanilha(
        `Place ID "${placeId}" aparece em ${linhas.length} linhas (${linhas.map((i) => i + 1).join(', ')}). Corrija na planilha.`,
      );
    }
    const indice = linhas[0]!;
    return { mapa, numeroLinha: indice + 1, historico: String(valorColuna(colHist)[indice] ?? '') };
  }
  throw new ConflitoPlanilha('O cabeçalho da planilha mudou durante a gravação. Tente de novo.');
}

/**
 * Grava um patch no lead e devolve o lead relido (ARCHITECTURE §4.3).
 * `hoje` (yyyy-MM-dd, America/Sao_Paulo) vem de quem chama: é a data do evento no Histórico.
 */
export async function updateLead(placeId: string, patch: Patch, hoje: DataISO): Promise<Lead> {
  const { mapa, numeroLinha, historico } = await localizar(placeId);
  const celulas = patchParaCelulas(patch, historico, hoje);
  const aba = abaConfigurada();

  if (celulas.length > 0) {
    await sheetsPost('/values:batchUpdate', {
      valueInputOption: 'RAW',
      data: celulas.map(({ coluna, valor }) => ({
        range: rangeA1(aba, `${letraColuna(indiceColuna(mapa, coluna))}${numeroLinha}`),
        values: [[valor]],
      })),
    });
  }

  const [cab, linha] = await batchGet([rangeA1(aba, '1:1'), rangeA1(aba, `${numeroLinha}:${numeroLinha}`)]);
  const mapaAtual = mapaCabecalho(cab?.values?.[0] ?? []);
  const lead = linhaParaLead(linha?.values?.[0] ?? [], mapaAtual, numeroLinha);
  if (lead.placeId !== placeId) {
    throw new ConflitoPlanilha('A planilha foi reordenada durante a gravação. Recarregue e confira o lead.');
  }
  return lead;
}

// ---------- Importação (Fase 9) ----------

export type NovaLinha = Record<string, string | number | null>;

export async function appendLeads(linhas: readonly NovaLinha[]): Promise<number> {
  void linhas;
  throw new Error('não implementado (fase 9)');
}

// ---------- Diagnóstico (check:sheet) ----------

export interface Diagnostico {
  titulo: string;
  aba: string;
  linhasComEmpresa: number;
  colunas: string[];
  faltando: string[];
  /** Só preenchido quando a coluna Place ID existe. */
  semPlaceId: number[];
  duplicados: Array<{ placeId: string; linhas: number[] }>;
}

function placeIdsDuplicados(entradas: ReadonlyArray<{ placeId: string; linha: number }>) {
  const porId = new Map<string, number[]>();
  for (const { placeId, linha } of entradas) {
    if (placeId) porId.set(placeId, [...(porId.get(placeId) ?? []), linha]);
  }
  return [...porId].filter(([, linhas]) => linhas.length > 1).map(([placeId, linhas]) => ({ placeId, linhas }));
}

export async function diagnostico(): Promise<Diagnostico> {
  const { titulo } = await metadadosAba();
  const { mapa, cabecalho, linhas } = await lerAba();
  const iEmpresa = indiceColuna(mapa, COLUNAS.empresa);
  const iPlace = mapa.get(COLUNAS.placeId);
  const comEmpresa = linhas
    .map((linha, i) => ({ linha, numero: i + 2 }))
    .filter(({ linha }) => String(linha[iEmpresa] ?? '').trim() !== '');
  const ids = comEmpresa.map(({ linha, numero }) => ({
    placeId: iPlace === undefined ? '' : String(linha[iPlace] ?? '').trim(),
    linha: numero,
  }));

  return {
    titulo,
    aba: abaConfigurada(),
    linhasComEmpresa: comEmpresa.length,
    colunas: cabecalho.map((c) => String(c ?? '').trim()).filter(Boolean),
    faltando: colunasFaltando(mapa),
    semPlaceId: iPlace === undefined ? [] : ids.filter((x) => !x.placeId).map((x) => x.linha),
    duplicados: placeIdsDuplicados(ids),
  };
}

// ---------- Migração (scripts/migrate.ts). Tudo idempotente. ----------

export interface ResultadoMigracao {
  criadas: string[];
  reaproveitadas: string[];
}

/** Cria no fim as colunas do app que faltam, copiando a formatação do cabeçalho (ARCHITECTURE §4.6). */
export async function ensureColumns(): Promise<ResultadoMigracao> {
  const { aba } = await metadadosAba();
  const [cab] = await batchGet([rangeA1(aba.title, '1:1')]);
  const cabecalho = cab?.values?.[0] ?? [];
  const mapa = mapaCabecalho(cabecalho);
  const criar = COLUNAS_DO_APP.filter((nome) => !mapa.has(nome));
  const reaproveitadas = COLUNAS_DO_APP.filter((nome) => mapa.has(nome));
  if (criar.length === 0) return { criadas: [], reaproveitadas };

  const ultima = cabecalho.length - 1;
  const inicio = ultima + 1;
  const fim = inicio + criar.length;
  const requests: unknown[] = [];
  if (fim > aba.gridProperties.columnCount) {
    requests.push({
      appendDimension: { sheetId: aba.sheetId, dimension: 'COLUMNS', length: fim - aba.gridProperties.columnCount },
    });
  }
  if (ultima >= 0) {
    requests.push({
      copyPaste: {
        source: { sheetId: aba.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: ultima, endColumnIndex: ultima + 1 },
        destination: { sheetId: aba.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: inicio, endColumnIndex: fim },
        pasteType: 'PASTE_FORMAT',
      },
    });
  }
  if (requests.length > 0) await sheetsPost(':batchUpdate', { requests });

  await sheetsPost('/values:batchUpdate', {
    valueInputOption: 'RAW',
    data: [{ range: rangeA1(aba.title, `${letraColuna(inicio)}1:${letraColuna(fim - 1)}1`), values: [criar] }],
  });
  mapaEmCache = undefined;
  return { criadas: [...criar], reaproveitadas };
}

export interface ResultadoPreenchimento {
  placeIds: number;
  urls: number;
  semPlaceId: Array<{ linha: number; empresa: string }>;
  duplicados: Array<{ placeId: string; linhas: number[] }>;
}

/** Lê o hyperlink de cada célula de uma coluna (a partir da linha 2). Índice 0 = linha 2. */
async function hyperlinksDaColuna(indice: number, totalLinhas: number): Promise<string[]> {
  const l = letraColuna(indice);
  const range = rangeA1(abaConfigurada(), `${l}2:${l}${totalLinhas + 1}`);
  const grade = await sheetsGet<GradeResposta>(
    `?ranges=${enc(range)}&includeGridData=true&fields=${enc('sheets.data(startRow,rowData.values(hyperlink,formattedValue))')}`,
  );
  const rows = grade.sheets?.[0]?.data?.[0]?.rowData ?? [];
  return Array.from({ length: totalLinhas }, (_, i) => {
    const celula = rows[i]?.values?.[0];
    const texto = celula?.formattedValue?.trim() ?? '';
    return celula?.hyperlink ?? (/^https?:\/\//.test(texto) ? texto : '');
  });
}

/**
 * Preenche Place ID (do link do Google Maps) e URL atual (do link do "Link atual") nas linhas
 * em que estão vazios. Nunca sobrescreve o que já existe.
 */
export async function preencherPlaceIdEUrl(): Promise<ResultadoPreenchimento> {
  const { mapa, linhas } = await lerAba();
  exigirColunas(mapa, [COLUNAS.empresa, COLUNAS.googleMaps, COLUNAS.linkAtual, COLUNAS.placeId, COLUNAS.urlAtual]);
  const iEmpresa = indiceColuna(mapa, COLUNAS.empresa);
  const iPlace = indiceColuna(mapa, COLUNAS.placeId);
  const iUrl = indiceColuna(mapa, COLUNAS.urlAtual);
  const [mapsLinks, atuaisLinks] = await Promise.all([
    hyperlinksDaColuna(indiceColuna(mapa, COLUNAS.googleMaps), linhas.length),
    hyperlinksDaColuna(indiceColuna(mapa, COLUNAS.linkAtual), linhas.length),
  ]);

  const aba = abaConfigurada();
  const escritas: Array<{ range: string; values: [[string]] }> = [];
  const semPlaceId: ResultadoPreenchimento['semPlaceId'] = [];
  const ids: Array<{ placeId: string; linha: number }> = [];
  let placeIds = 0;
  let urls = 0;

  linhas.forEach((linha, i) => {
    const numero = i + 2;
    const empresa = String(linha[iEmpresa] ?? '').trim();
    if (!empresa) return;

    let placeId = String(linha[iPlace] ?? '').trim();
    if (!placeId) {
      const extraido = extrairPlaceId(mapsLinks[i] ?? '');
      if (extraido) {
        placeId = extraido;
        placeIds++;
        escritas.push({ range: rangeA1(aba, `${letraColuna(iPlace)}${numero}`), values: [[extraido]] });
      } else {
        semPlaceId.push({ linha: numero, empresa });
      }
    }
    ids.push({ placeId, linha: numero });

    const url = atuaisLinks[i] ?? '';
    if (!String(linha[iUrl] ?? '').trim() && url) {
      urls++;
      escritas.push({ range: rangeA1(aba, `${letraColuna(iUrl)}${numero}`), values: [[url]] });
    }
  });

  if (escritas.length > 0) await sheetsPost('/values:batchUpdate', { valueInputOption: 'RAW', data: escritas });
  return { placeIds, urls, semPlaceId, duplicados: placeIdsDuplicados(ids) };
}

const FORMATO_DATA = 'dd/MM/yyyy';

/** Validação da coluna Status (8 status) e formato dd/MM/yyyy nas colunas de data. Devolve o que mudou. */
export async function aplicarValidacaoEFormatos(): Promise<string[]> {
  const { aba } = await metadadosAba();
  const [cab] = await batchGet([rangeA1(aba.title, '1:1')]);
  const mapa = mapaCabecalho(cab?.values?.[0] ?? []);
  const iStatus = indiceColuna(mapa, COLUNAS.status);
  const datas = [COLUNAS.dataContato, COLUNAS.proxAcao].map((nome) => ({ nome, indice: indiceColuna(mapa, nome) }));

  // Amostra da linha 2 de cada coluna para saber se já está aplicado.
  const colunas = [iStatus, ...datas.map((d) => d.indice)];
  const params = colunas.map((i) => `ranges=${enc(rangeA1(aba.title, `${letraColuna(i)}2`))}`).join('&');
  const grade = await sheetsGet<GradeResposta>(
    `?${params}&includeGridData=true&fields=${enc('sheets.data.rowData.values(dataValidation,userEnteredFormat.numberFormat)')}`,
  );
  const amostras = (grade.sheets?.[0]?.data ?? []).map((d) => d.rowData?.[0]?.values?.[0]);

  const coluna = (indice: number) => ({
    sheetId: aba.sheetId,
    startRowIndex: 1,
    endRowIndex: aba.gridProperties.rowCount,
    startColumnIndex: indice,
    endColumnIndex: indice + 1,
  });
  const requests: unknown[] = [];
  const mudancas: string[] = [];

  const validacaoAtual = amostras[0]?.dataValidation?.condition;
  const listaAtual = validacaoAtual?.values?.map((v) => v.userEnteredValue ?? '') ?? [];
  const validacaoOk =
    validacaoAtual?.type === 'ONE_OF_LIST' &&
    listaAtual.length === STATUS.length &&
    STATUS.every((s, i) => listaAtual[i] === s);
  if (!validacaoOk) {
    requests.push({
      setDataValidation: {
        range: coluna(iStatus),
        rule: {
          condition: { type: 'ONE_OF_LIST', values: STATUS.map((s) => ({ userEnteredValue: s })) },
          showCustomUi: true,
          strict: true,
        },
      },
    });
    mudancas.push(`validação de "${COLUNAS.status}" com os ${STATUS.length} status`);
  }

  datas.forEach(({ nome, indice }, i) => {
    if (amostras[i + 1]?.userEnteredFormat?.numberFormat?.pattern === FORMATO_DATA) return;
    requests.push({
      repeatCell: {
        range: coluna(indice),
        cell: { userEnteredFormat: { numberFormat: { type: 'DATE', pattern: FORMATO_DATA } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    });
    mudancas.push(`formato ${FORMATO_DATA} em "${nome}"`);
  });

  if (requests.length > 0) await sheetsPost(':batchUpdate', { requests });
  return mudancas;
}
