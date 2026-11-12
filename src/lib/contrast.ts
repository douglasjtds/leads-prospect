// Contraste WCAG 2.1 entre duas cores. Usado pelo /styleguide para conferir a §3 em runtime,
// lendo as cores computadas das variáveis CSS (sem duplicar hex fora do globals.css).

export type Rgb = readonly [number, number, number];

/** Aceita "#rgb", "#rrggbb" e "rgb(r g b)" / "rgb(r, g, b)" (canais 0 a 255). */
export function parseCor(valor: string): Rgb {
  const v = valor.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
  if (hex?.[1]) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as unknown as Rgb;
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(v);
  if (rgb?.[1] && rgb[2] && rgb[3]) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }
  throw new Error(`Cor não reconhecida: "${valor}"`);
}

function canal(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminancia([r, g, b]: Rgb): number {
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Razão de contraste (1 a 21), arredondada para 2 casas. */
export function contraste(a: Rgb, b: Rgb): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return Math.round(((claro + 0.05) / (escuro + 0.05)) * 100) / 100;
}
