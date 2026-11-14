import ExcelJS from 'exceljs';
import type { LinhaBruta } from '@/lib/domain/import';
import { COLUNAS, extrairPlaceId } from '@/lib/sheets/schema';

// Lê o .xlsx gerado pela skill prospeccao-google-maps (aba "Leads") e devolve as linhas com os
// nomes de cabeçalho como chaves, prontas para lib/domain/import.ts. Arquivo local, não a planilha.

const ABA = 'Leads';

export class ArquivoInvalido extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArquivoInvalido';
  }
}

function ehUrl(texto: string): boolean {
  return /^https?:\/\//i.test(texto);
}

/** Valor de uma célula: número quando é número (ou resultado numérico de fórmula), senão o texto exibido. */
function valorCelula(cell: ExcelJS.Cell): string | number {
  const v = cell.value;
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object' && 'formula' in v) {
    const r = v.result;
    if (typeof r === 'number') return r;
    return typeof r === 'string' ? r.trim() : '';
  }
  return cell.text.trim();
}

/** URL da célula: o hyperlink, ou o próprio texto quando ele já é uma URL. */
function urlCelula(cell: ExcelJS.Cell): string {
  const link = cell.hyperlink?.trim();
  if (link) return link;
  const texto = cell.text.trim();
  return ehUrl(texto) ? texto : '';
}

/**
 * Converte a aba Leads em linhas brutas. "Google Maps" e "Link atual" viram a URL em texto puro
 * (a planilha guarda texto: a API não lê hyperlinks). Sem coluna "Place ID", extrai o place_id do
 * link do Maps; sem "URL atual", usa o link de "Link atual". Linhas sem Empresa são ignoradas.
 */
export async function lerXlsx(origem: string | Buffer): Promise<LinhaBruta[]> {
  const wb = new ExcelJS.Workbook();
  if (typeof origem === 'string') await wb.xlsx.readFile(origem);
  else await wb.xlsx.load(new Uint8Array(origem).buffer); // cópia em ArrayBuffer: o tipo Buffer do exceljs não bate com o do Node

  const ws = wb.getWorksheet(ABA);
  if (!ws) {
    const abas = wb.worksheets.map((w) => `"${w.name}"`).join(', ');
    throw new ArquivoInvalido(`Aba "${ABA}" não encontrada no arquivo (abas: ${abas || 'nenhuma'}).`);
  }

  const cabecalho = new Map<number, string>();
  ws.getRow(1).eachCell((cell, col) => {
    const nome = cell.text.trim();
    if (nome && ![...cabecalho.values()].includes(nome)) cabecalho.set(col, nome);
  });
  const nomes = new Set(cabecalho.values());
  if (!nomes.has(COLUNAS.empresa)) throw new ArquivoInvalido(`Coluna "${COLUNAS.empresa}" não encontrada na aba "${ABA}".`);

  const colunasDeLink = new Set<string>([COLUNAS.googleMaps, COLUNAS.linkAtual]);
  const linhas: LinhaBruta[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const linha: LinhaBruta = {};
    for (const [col, nome] of cabecalho) {
      const cell = row.getCell(col);
      linha[nome] = colunasDeLink.has(nome) ? urlCelula(cell) : valorCelula(cell);
    }
    if (String(linha[COLUNAS.empresa] ?? '').trim() === '') continue;

    const maps = String(linha[COLUNAS.googleMaps] ?? '');
    if (!String(linha[COLUNAS.placeId] ?? '').trim()) linha[COLUNAS.placeId] = extrairPlaceId(maps) ?? '';
    if (!String(linha[COLUNAS.urlAtual] ?? '').trim()) linha[COLUNAS.urlAtual] = String(linha[COLUNAS.linkAtual] ?? '');
    linhas.push(linha);
  }
  return linhas;
}
