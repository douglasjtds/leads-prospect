import type { Lead } from '../types';

let seq = 0;

/** Lead de teste: Dentista em Presidente Prudente, celular válido, A contatar. */
export function fazerLead(overrides: Partial<Lead> = {}): Lead {
  seq += 1;
  return {
    linha: seq + 1,
    placeId: `place-${seq}`,
    prioridade: 'Alta',
    nicho: 'Dentista',
    empresa: `Clínica ${seq}`,
    cidade: 'Presidente Prudente',
    uf: 'SP',
    telefone: '+55 18 99771-7770',
    situacao: 'Sem site',
    linkAtual: '',
    urlAtual: '',
    nota: 4.8,
    avaliacoes: 32,
    googleMaps: '',
    status: 'A contatar',
    dataContato: null,
    proxAcao: null,
    toques: 0,
    historico: '',
    observacoes: '',
    variante: null,
    mensagemTexto: '',
    ...overrides,
  };
}
