// Testa a conexão com a planilha e lista as colunas. Somente leitura.
// Saída no formato do passo 8 de instructions/CONECTAR-PLANILHA.md.
import { autenticar, contaDeServico } from '@/lib/sheets/client';
import { diagnostico } from '@/lib/sheets/leads-repo';

async function main(): Promise<void> {
  await autenticar();
  console.log(`✓ Autenticado como ${contaDeServico()}`);

  const d = await diagnostico();
  console.log(`✓ Planilha "${d.titulo}", aba "${d.aba}"`);
  console.log(`✓ ${d.linhasComEmpresa} linhas com Empresa`);
  console.log(`✓ Colunas encontradas: ${d.colunas.join(', ')} (${d.colunas.length})`);

  if (d.faltando.length > 0) {
    console.log(`! Faltando: ${d.faltando.join(', ')}  → rode npm run migrate`);
    return;
  }
  console.log('✓ Todas as colunas do app presentes');

  if (d.semPlaceId.length > 0) {
    console.log(`! ${d.semPlaceId.length} linhas sem Place ID: ${d.semPlaceId.join(', ')}  → rode npm run migrate`);
  } else {
    console.log(`✓ Place ID em todas as ${d.linhasComEmpresa} linhas`);
  }
  for (const { placeId, linhas } of d.duplicados) {
    console.log(`! Place ID repetido ${placeId} nas linhas ${linhas.join(', ')}`);
  }
}

main().catch((erro: unknown) => {
  console.error(`✗ ${erro instanceof Error ? erro.message : String(erro)}`);
  process.exit(1);
});
