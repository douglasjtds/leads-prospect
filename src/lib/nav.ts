/**
 * Vizinho de `atual` na lista visível, para os atalhos J/K (PRODUCT-SPEC §7.8).
 * Sem seleção, J vai para o primeiro e K para o último. Nas pontas, fica onde está.
 */
export function vizinho(ids: readonly string[], atual: string | null, passo: 1 | -1): string | null {
  if (ids.length === 0) return null;
  const i = atual === null ? -1 : ids.indexOf(atual);
  if (i === -1) return passo === 1 ? ids[0]! : ids[ids.length - 1]!;
  return ids[Math.min(Math.max(i + passo, 0), ids.length - 1)]!;
}
