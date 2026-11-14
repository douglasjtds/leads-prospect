import { describe, expect, it } from 'vitest';
import { vizinho } from './nav';

describe('vizinho', () => {
  const ids = ['a', 'b', 'c'];

  it('anda para frente e para trás', () => {
    expect(vizinho(ids, 'a', 1)).toBe('b');
    expect(vizinho(ids, 'c', -1)).toBe('b');
  });

  it('para nas pontas', () => {
    expect(vizinho(ids, 'c', 1)).toBe('c');
    expect(vizinho(ids, 'a', -1)).toBe('a');
  });

  it('sem seleção (ou fora da lista), J vai ao primeiro e K ao último', () => {
    expect(vizinho(ids, null, 1)).toBe('a');
    expect(vizinho(ids, 'x', -1)).toBe('c');
  });

  it('lista vazia devolve null', () => {
    expect(vizinho([], 'a', 1)).toBeNull();
  });
});
