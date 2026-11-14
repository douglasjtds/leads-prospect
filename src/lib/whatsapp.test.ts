import { describe, expect, it } from 'vitest';
import { abrirEmEfetivo, ehCelular, urlChat, urlDm, urlMaps } from './whatsapp';

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

describe('ehCelular', () => {
  const IPHONE_BRAVE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
  const ANDROID =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
  const MAC =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
  const WINDOWS =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

  it('iPhone e Android são celular', () => {
    expect(ehCelular(IPHONE_BRAVE, 5)).toBe(true);
    expect(ehCelular(ANDROID, 5)).toBe(true);
  });

  it('iPad em modo desktop (Macintosh com toque) é celular', () => {
    expect(ehCelular(MAC, 5)).toBe(true);
  });

  it('Mac e Windows sem toque não são', () => {
    expect(ehCelular(MAC, 0)).toBe(false);
    expect(ehCelular(WINDOWS, 0)).toBe(false);
  });

  it('notebook Windows com toque continua desktop', () => {
    expect(ehCelular(WINDOWS, 10)).toBe(false);
  });
});

describe('abrirEmEfetivo', () => {
  it('no celular sempre app; no desktop, a preferência', () => {
    expect(abrirEmEfetivo('whatsapp web', true)).toBe('app');
    expect(abrirEmEfetivo('app', true)).toBe('app');
    expect(abrirEmEfetivo('whatsapp web', false)).toBe('whatsapp web');
    expect(abrirEmEfetivo('app', false)).toBe('app');
  });
});
