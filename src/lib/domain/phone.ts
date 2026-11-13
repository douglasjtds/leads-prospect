/** Só os dígitos do telefone. */
export function digits(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

/** 13 dígitos, começa com 55 e o quinto dígito é 9 (PRODUCT-SPEC §4.2). */
export function celular(telefone: string): boolean {
  const d = digits(telefone);
  return d.length === 13 && d.startsWith('55') && d[4] === '9';
}
