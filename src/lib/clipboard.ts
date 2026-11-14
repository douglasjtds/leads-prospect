// Copiar para a área de transferência (ARCHITECTURE §8). Só no navegador.

function copiarComTextarea(texto: string): boolean {
  const campo = document.createElement('textarea');
  campo.value = texto;
  campo.setAttribute('readonly', '');
  campo.style.position = 'fixed';
  campo.style.opacity = '0';
  document.body.appendChild(campo);
  const foco = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  campo.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  campo.remove();
  foco?.focus({ preventScroll: true });
  return ok;
}

/** Copia o texto. Devolve false se nenhum dos dois caminhos funcionou. */
export async function copiar(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Cai para o fallback.
  }
  return copiarComTextarea(texto);
}
