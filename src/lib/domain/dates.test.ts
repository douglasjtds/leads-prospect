import { describe, expect, it } from 'vitest';
import { addDias, fmtDiaMes, hoje, rotuloPrazo } from './dates';

const TZ = 'America/Sao_Paulo';

describe('hoje', () => {
  it('usa o fuso de São Paulo, não o UTC', () => {
    // 02:30 UTC de 14/11 ainda é 23:30 de 13/11 em São Paulo.
    expect(hoje(TZ, new Date('2026-11-14T02:30:00Z'))).toBe('2026-11-13');
    expect(hoje(TZ, new Date('2026-11-14T03:00:00Z'))).toBe('2026-11-14');
  });

  it('sem data usa o relógio atual', () => {
    expect(hoje(TZ)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('addDias', () => {
  it('soma, vira mês e ano, e subtrai', () => {
    expect(addDias('2026-11-13', 3)).toBe('2026-11-16');
    expect(addDias('2026-11-29', 4)).toBe('2026-12-03');
    expect(addDias('2026-12-30', 2)).toBe('2027-01-01');
    expect(addDias('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDias('2026-11-01', -1)).toBe('2026-10-31');
  });

  it('data inválida lança erro', () => {
    expect(() => addDias('13/11/2026', 1)).toThrow('Data inválida');
  });
});

describe('fmtDiaMes', () => {
  it('yyyy-MM-dd → dd/MM', () => {
    expect(fmtDiaMes('2026-03-07')).toBe('07/03');
  });
});

describe('rotuloPrazo', () => {
  const dia = '2026-11-13';
  it('sem data não mostra nada', () => expect(rotuloPrazo(null, dia)).toBeNull());
  it('hoje', () => expect(rotuloPrazo(dia, dia)).toBe('vence hoje'));
  it('no passado', () => expect(rotuloPrazo('2026-11-10', dia)).toBe('venceu 10/11'));
  it('no futuro', () => expect(rotuloPrazo('2026-11-16', dia)).toBe('volta 16/11'));
});
