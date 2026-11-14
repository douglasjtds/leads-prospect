// Importa um .xlsx de leads novos com dedupe (PRODUCT-SPEC §8).
// Uso: npm run import -- arquivo.xlsx [--dry-run]
import { importLeads } from '@/lib/sheets/leads-repo';
import { lerXlsx } from './lib/ler-xlsx';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const arquivos = args.filter((a) => !a.startsWith('--'));
  if (arquivos.length !== 1) {
    console.error('Uso: npm run import -- arquivo.xlsx [--dry-run]');
    process.exit(1);
  }
  const arquivo = arquivos[0]!;

  const linhas = await lerXlsx(arquivo);
  console.log(`${linhas.length} linhas com Empresa em ${arquivo}${dryRun ? ' (dry-run: nada será gravado)' : ''}\n`);

  const r = await importLeads(linhas, { dryRun });
  for (const lead of r.inseridos) console.log(`+ ${lead.empresa} (${lead.cidade}/${lead.uf})`);
  for (const { empresa, motivo } of r.duplicados) console.log(`= ${empresa}: ${motivo}`);
  for (const { empresa, motivo } of r.ignorados) console.log(`! ${empresa}: ${motivo}`);

  const verbo = dryRun ? 'entrariam' : r.inseridos.length === 1 ? 'inserido' : 'inseridos';
  console.log(`\n${r.inseridos.length} ${verbo}, ${r.duplicados.length} duplicados, ${r.ignorados.length} ignorados.`);
  if (dryRun) console.log('Dry-run: nada foi gravado. Rode sem --dry-run para importar.');
}

main().catch((erro: unknown) => {
  console.error(`✗ ${erro instanceof Error ? erro.message : String(erro)}`);
  process.exit(1);
});
