import { describe, expect, it } from 'vitest';
import { fazerLead } from './__fixtures__/lead';
import { avisoSemPlaceId, separarSemPlaceId } from './sem-place-id';

describe('separarSemPlaceId', () => {
  it('tira do app as linhas sem Place ID e guarda os números delas', () => {
    const a = fazerLead({ placeId: 'A', linha: 2 });
    const b = fazerLead({ placeId: '', linha: 3 });
    const c = fazerLead({ placeId: '  ', linha: 4 });
    const d = fazerLead({ placeId: 'D', linha: 5 });
    const { leads, semPlaceId } = separarSemPlaceId([a, b, c, d]);
    expect(leads.map((l) => l.placeId)).toEqual(['A', 'D']);
    expect(semPlaceId).toEqual([3, 4]);
  });

  it('sem linhas problemáticas, devolve tudo e lista vazia', () => {
    const leads = [fazerLead(), fazerLead()];
    expect(separarSemPlaceId(leads)).toEqual({ leads, semPlaceId: [] });
  });
});

describe('avisoSemPlaceId', () => {
  it('nada a avisar', () => {
    expect(avisoSemPlaceId([])).toBeNull();
  });

  it('uma linha', () => {
    expect(avisoSemPlaceId([246])).toBe('A linha 246 está sem Place ID e não aparece no app. Rode npm run migrate para incluir.');
  });

  it('várias linhas, citando até 5', () => {
    expect(avisoSemPlaceId([246, 247])).toBe(
      '2 linhas estão sem Place ID (246, 247) e não aparecem no app. Rode npm run migrate para incluir.',
    );
    expect(avisoSemPlaceId([1, 2, 3, 4, 5, 6, 7])).toBe(
      '7 linhas estão sem Place ID (1, 2, 3, 4, 5 e mais 2) e não aparecem no app. Rode npm run migrate para incluir.',
    );
  });

  it('sem travessão', () => {
    expect(avisoSemPlaceId([1, 2, 3, 4, 5, 6])).not.toMatch(/[—–]/);
  });
});
