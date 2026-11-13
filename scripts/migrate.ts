// Migração idempotente da planilha (ARCHITECTURE §4.6). Pode rodar quantas vezes quiser.
import { aplicarValidacaoEFormatos, ensureColumns, preencherPlaceIdEUrl } from '@/lib/sheets/leads-repo';

async function main(): Promise<void> {
  let mudou = false;

  const colunas = await ensureColumns();
  if (colunas.criadas.length > 0) {
    mudou = true;
    console.log(`✓ Colunas criadas: ${colunas.criadas.join(', ')}`);
  }
  if (colunas.reaproveitadas.length > 0) {
    console.log(`· Colunas já existentes (reaproveitadas): ${colunas.reaproveitadas.join(', ')}`);
  }

  const preenchido = await preencherPlaceIdEUrl();
  if (preenchido.placeIds > 0) {
    mudou = true;
    console.log(`✓ Place ID preenchido em ${preenchido.placeIds} linhas`);
  }
  if (preenchido.urls > 0) {
    mudou = true;
    console.log(`✓ URL atual preenchida em ${preenchido.urls} linhas`);
  }
  for (const { linha, empresa } of preenchido.semPlaceId) {
    console.log(`! Linha ${linha} (${empresa}): o link do Google Maps não tem place_id. Preencha o Place ID à mão.`);
  }
  for (const { placeId, linhas } of preenchido.duplicados) {
    console.log(`! Place ID repetido ${placeId} nas linhas ${linhas.join(', ')}. Apague as duplicatas.`);
  }

  const formatos = await aplicarValidacaoEFormatos();
  for (const m of formatos) {
    mudou = true;
    console.log(`✓ Aplicado: ${m}`);
  }

  console.log(mudou ? '\nMigração concluída. Rode de novo para confirmar: deve dizer "nada mudou".' : '\nNada mudou: a planilha já está migrada.');
}

main().catch((erro: unknown) => {
  console.error(`✗ ${erro instanceof Error ? erro.message : String(erro)}`);
  process.exit(1);
});
