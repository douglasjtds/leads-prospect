import { describe, expect, it } from 'vitest';
import { fazerLead } from './__fixtures__/lead';
import { buscar, normalizar } from './search';

const leads = [
  fazerLead({ empresa: 'Clínica Sorriso', cidade: 'São Paulo', nicho: 'Dentista', telefone: '+55 18 99771-7770' }),
  fazerLead({ empresa: 'Pet Amigo', cidade: 'Marília', nicho: 'Pet shop', telefone: '+55 14 99123-4567' }),
  fazerLead({ empresa: 'Estética Bela', cidade: 'Assis', nicho: 'Clínica de estética', telefone: '+55 18 3322-1100' }),
];
const empresas = (r: typeof leads) => r.map((l) => l.empresa);

describe('buscar', () => {
  it('ignora acento e maiúsculas', () => {
    expect(empresas(buscar(leads, 'CLINICA'))).toEqual(['Clínica Sorriso', 'Estética Bela']);
    expect(empresas(buscar(leads, 'estetica'))).toEqual(['Estética Bela']);
    expect(normalizar(' São ')).toBe('sao');
  });

  it('procura em empresa, cidade e nicho', () => {
    expect(empresas(buscar(leads, 'sorriso'))).toEqual(['Clínica Sorriso']);
    expect(empresas(buscar(leads, 'marilia'))).toEqual(['Pet Amigo']);
    expect(empresas(buscar(leads, 'pet shop'))).toEqual(['Pet Amigo']);
  });

  it('procura pelos dígitos do telefone a partir de 3', () => {
    expect(empresas(buscar(leads, '7770'))).toEqual(['Clínica Sorriso']);
    expect(empresas(buscar(leads, '(14) 99123'))).toEqual(['Pet Amigo']);
    expect(empresas(buscar(leads, '+55 18'))).toEqual(['Clínica Sorriso', 'Estética Bela']);
    expect(empresas(buscar(leads, '1100'))).toEqual(['Estética Bela']);
  });

  it('com menos de 3 dígitos não procura no telefone', () => {
    expect(buscar(leads, '77')).toEqual([]);
  });

  it('termo misto não vira busca por telefone', () => {
    expect(buscar(leads, 'a7770')).toEqual([]);
  });

  it('termo vazio devolve a lista inteira', () => {
    expect(buscar(leads, '   ')).toHaveLength(3);
  });
});
