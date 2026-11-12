import { describe, expect, it } from 'vitest';
import { contraste, parseCor } from './contrast';

// Valores de referência da DESIGN-GUIDELINES §3 (tabela de contraste).
describe('contraste', () => {
  it.each([
    ['#121412', '#f2f3f0', 16.62],
    ['#4f544e', '#f2f3f0', 6.96],
    ['#fafaf8', '#b83a12', 5.5],
    ['#9c3010', '#f4e1d8', 5.84],
    ['#8a5a00', '#f5ead2', 4.96],
    ['#2f6b3a', '#dfeadf', 5.17],
  ])('%s sobre %s = %s', (texto, fundo, esperado) => {
    expect(contraste(parseCor(texto), parseCor(fundo))).toBeCloseTo(esperado, 1);
  });

  it('é simétrico', () => {
    const a = parseCor('#121412');
    const b = parseCor('#fafaf8');
    expect(contraste(a, b)).toBe(contraste(b, a));
  });
});

describe('parseCor', () => {
  it('lê hex curto, hex longo e rgb()', () => {
    expect(parseCor('#fff')).toEqual([255, 255, 255]);
    expect(parseCor('#B83A12')).toEqual([184, 58, 18]);
    expect(parseCor('rgb(18, 20, 18)')).toEqual([18, 20, 18]);
    expect(parseCor('rgb(18 20 18 / 0.5)')).toEqual([18, 20, 18]);
  });

  it('rejeita formatos desconhecidos', () => {
    expect(() => parseCor('oklch(0.5 0.1 30)')).toThrow(/não reconhecida/);
  });
});
