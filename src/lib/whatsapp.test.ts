import { describe, expect, it } from 'vitest';
import { urlChat, urlDm, urlMaps } from './whatsapp';

describe('urlChat', () => {
  it('web e app, só dígitos e sem texto na URL', () => {
    expect(urlChat('+55 18 99771-7770', 'whatsapp web')).toBe('https://web.whatsapp.com/send?phone=5518997717770');
    expect(urlChat('+55 18 99771-7770', 'app')).toBe('whatsapp://send?phone=5518997717770');
  });

  it('null para telefone fixo', () => {
    expect(urlChat('+55 18 3221-0000', 'whatsapp web')).toBeNull();
  });
});

describe('urlMaps', () => {
  it('usa a URL da célula quando ela é uma URL', () => {
    expect(urlMaps({ googleMaps: 'https://maps.google.com/?cid=1', placeId: 'X' })).toBe('https://maps.google.com/?cid=1');
  });

  it('monta pelo Place ID quando a célula é só texto', () => {
    expect(urlMaps({ googleMaps: 'Abrir no Maps', placeId: 'ChIJ abc' })).toBe(
      'https://www.google.com/maps/place/?q=place_id:ChIJ%20abc',
    );
  });
});

describe('urlDm', () => {
  it('prefere URL atual, depois Link atual se for URL', () => {
    expect(urlDm({ urlAtual: 'https://instagram.com/a', linkAtual: 'https://x.com' })).toBe('https://instagram.com/a');
    expect(urlDm({ urlAtual: '', linkAtual: 'https://instagram.com/b' })).toBe('https://instagram.com/b');
  });

  it('null sem URL', () => {
    expect(urlDm({ urlAtual: '', linkAtual: '@perfil' })).toBeNull();
  });
});
