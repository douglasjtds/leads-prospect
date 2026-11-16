import { describe, expect, it } from 'vitest';
import { navegar, posicao, vizinho, vizinhosEm } from './nav';

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

describe('vizinhosEm', () => {
  it('guarda anterior e próximo', () => {
    expect(vizinhosEm(['a', 'b', 'c'], 'b')).toEqual({ placeId: 'b', anterior: 'a', proximo: 'c' });
    expect(vizinhosEm(['a', 'b'], 'a')).toEqual({ placeId: 'a', anterior: null, proximo: 'b' });
    expect(vizinhosEm(['a'], 'x')).toEqual({ placeId: 'x', anterior: null, proximo: null });
  });
});

describe('navegar', () => {
  it('lead na lista: igual ao vizinho', () => {
    expect(navegar(['a', 'b', 'c'], 'b', 1, null)).toBe('c');
    expect(navegar(['a', 'b', 'c'], 'b', -1, { placeId: 'b', anterior: 'x', proximo: 'y' })).toBe('a');
  });

  it('lead saiu da lista: segue a âncora', () => {
    const ancora = { placeId: 'b', anterior: 'a', proximo: 'c' };
    expect(navegar(['a', 'c'], 'b', 1, ancora)).toBe('c');
    expect(navegar(['a', 'c'], 'b', -1, ancora)).toBe('a');
  });

  it('lead saiu e era a ponta: não anda', () => {
    expect(navegar(['a'], 'b', 1, { placeId: 'b', anterior: 'a', proximo: null })).toBeNull();
  });

  it('vizinho da âncora também saiu: cai no padrão', () => {
    expect(navegar(['a', 'd'], 'b', 1, { placeId: 'b', anterior: 'a', proximo: 'c' })).toBe('a');
  });

  it('âncora de outro lead é ignorada', () => {
    expect(navegar(['a', 'c'], 'b', -1, { placeId: 'z', anterior: 'a', proximo: 'c' })).toBe('c');
  });
});

describe('posicao', () => {
  it('1-based com total', () => {
    expect(posicao(['a', 'b', 'c'], 'c')).toEqual({ atual: 3, total: 3 });
  });
  it('fora da lista ou sem seleção: null', () => {
    expect(posicao(['a'], 'x')).toBeNull();
    expect(posicao(['a'], null)).toBeNull();
  });
});
