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

/** Vizinhos de um lead na ordem visível, guardados no Enviei (o lead costuma sair da fila depois). */
export interface Ancora {
  placeId: string;
  anterior: string | null;
  proximo: string | null;
}

export function vizinhosEm(ids: readonly string[], placeId: string): Ancora {
  const i = ids.indexOf(placeId);
  if (i === -1) return { placeId, anterior: null, proximo: null };
  return { placeId, anterior: ids[i - 1] ?? null, proximo: ids[i + 1] ?? null };
}

/**
 * Anterior/Próximo e J/K. Se o lead atual saiu da lista (ex.: depois do Enviei), usa a âncora
 * guardada para seguir da posição em que ele estava. Sem âncora útil, cai no `vizinho`.
 */
export function navegar(
  ids: readonly string[],
  atual: string | null,
  passo: 1 | -1,
  ancora: Ancora | null,
): string | null {
  if (atual !== null && !ids.includes(atual) && ancora?.placeId === atual) {
    const alvo = passo === 1 ? ancora.proximo : ancora.anterior;
    if (alvo !== null && ids.includes(alvo)) return alvo;
    if (alvo === null) return null;
  }
  return vizinho(ids, atual, passo);
}

/** Posição 1-based do lead na lista visível, para o contador "3/18". null se não está nela. */
export function posicao(ids: readonly string[], atual: string | null): { atual: number; total: number } | null {
  const i = atual === null ? -1 : ids.indexOf(atual);
  return i === -1 ? null : { atual: i + 1, total: ids.length };
}
