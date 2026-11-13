import { describe, expect, it } from 'vitest';
import { celular, digits } from './phone';

describe('phone', () => {
  it('digits', () => {
    expect(digits('+55 (18) 99771-7770')).toBe('5518997717770');
  });

  it('celular válido', () => {
    expect(celular('+55 18 99771-7770')).toBe(true);
    expect(celular('5511912345678')).toBe(true);
  });

  it('fixo, sem DDI ou tamanho errado não é celular', () => {
    expect(celular('+55 18 3221-0000')).toBe(false);
    expect(celular('(18) 99771-7770')).toBe(false);
    expect(celular('+1 18 99771-7770')).toBe(false);
    expect(celular('+55 18 89771-7770')).toBe(false);
    expect(celular('')).toBe(false);
  });
});
