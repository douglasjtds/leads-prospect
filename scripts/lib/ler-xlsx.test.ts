import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { ArquivoInvalido, lerXlsx } from './ler-xlsx';

// Colunas exatas da §5 da skill prospeccao-google-maps (sem Place ID e sem URL atual).
const CABECALHO_SKILL = [
  'Prioridade', 'Nicho', 'Empresa', 'Cidade', 'UF', 'Telefone', 'Enviar 1ª msg', 'Situação', 'Link atual',
  'Nota', 'Avaliações', 'Google Maps', 'Status', 'Data contato', 'Próximo passo', 'Follow-up dia 3',
  'Follow-up dia 7', 'Observações', 'Mensagem (texto)', 'Histórico', 'Próx. ação', 'Toques',
];

async function xlsx(montar: (ws: ExcelJS.Worksheet) => void, aba = 'Leads'): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  montar(wb.addWorksheet(aba));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function linhaSkill(ws: ExcelJS.Worksheet, valores: Record<string, ExcelJS.CellValue>): void {
  ws.addRow(CABECALHO_SKILL.map((c) => valores[c] ?? null));
}

describe('lerXlsx', () => {
  it('lê o formato da skill, extraindo Place ID e URL atual dos hyperlinks', async () => {
    const buf = await xlsx((ws) => {
      ws.addRow(CABECALHO_SKILL);
      linhaSkill(ws, {
        Prioridade: 'Alta',
        Nicho: 'Dentista',
        Empresa: 'Clínica Sorriso',
        Cidade: 'Assis',
        UF: 'SP',
        Telefone: '+55 18 99123-4567',
        'Situação': 'Instagram no lugar do site',
        'Link atual': { text: 'Ver link', hyperlink: 'https://instagram.com/sorriso' },
        Nota: 4.8,
        'Avaliações': 51,
        'Google Maps': { text: 'Ver no Maps', hyperlink: 'https://www.google.com/maps/place/?q=place_id:ChIJabc-123' },
        Status: 'A contatar',
        'Próximo passo': { formula: 'IF(M2="Contatado","x","")', result: '' },
        Toques: 0,
        'Mensagem (texto)': 'Oi, tudo bem?',
      });
      linhaSkill(ws, { Empresa: '' }); // linha vazia
    });

    const linhas = await lerXlsx(buf);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      Empresa: 'Clínica Sorriso',
      Telefone: '+55 18 99123-4567',
      Nota: 4.8,
      'Avaliações': 51,
      'Link atual': 'https://instagram.com/sorriso',
      'URL atual': 'https://instagram.com/sorriso',
      'Google Maps': 'https://www.google.com/maps/place/?q=place_id:ChIJabc-123',
      'Place ID': 'ChIJabc-123',
      'Próximo passo': '',
      'Mensagem (texto)': 'Oi, tudo bem?',
    });
  });

  it('mantém Place ID e URL atual quando o arquivo já tem essas colunas', async () => {
    const buf = await xlsx((ws) => {
      ws.addRow(['Empresa', 'Place ID', 'URL atual', 'Link atual', 'Google Maps']);
      ws.addRow(['Pet X', 'ID-proprio', 'https://x.com', { text: 'Ver link', hyperlink: 'https://y.com' }, 'sem link']);
    });
    const [linha] = await lerXlsx(buf);
    expect(linha).toMatchObject({ 'Place ID': 'ID-proprio', 'URL atual': 'https://x.com', 'Link atual': 'https://y.com', 'Google Maps': '' });
  });

  it('erro claro quando não há aba Leads', async () => {
    const buf = await xlsx((ws) => ws.addRow(['Empresa']), 'Planilha1');
    await expect(lerXlsx(buf)).rejects.toThrow(new ArquivoInvalido('Aba "Leads" não encontrada no arquivo (abas: "Planilha1").'));
  });

  it('erro claro quando não há coluna Empresa', async () => {
    const buf = await xlsx((ws) => ws.addRow(['Nome']));
    await expect(lerXlsx(buf)).rejects.toThrow('Coluna "Empresa" não encontrada na aba "Leads".');
  });
});
