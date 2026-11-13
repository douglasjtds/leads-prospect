import { describe, expect, it } from 'vitest';
import { destinoSeguro } from './next-path';

describe('destinoSeguro', () => {
  it.each([
    ['/', '/'],
    ['/styleguide', '/styleguide'],
    ['/?aba=todos', '/?aba=todos'],
    ['/styleguide?x=1#cores', '/styleguide?x=1#cores'],
  ])('mantém o caminho interno %j', (entrada, esperado) => {
    expect(destinoSeguro(entrada)).toBe(esperado);
  });

  it.each([
    null,
    undefined,
    '',
    'styleguide',
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '/\t/evil.com',
    'javascript:alert(1)',
    '/.//evil.com',
    '/..//evil.com',
    '/%2e//evil.com',
    '/x/..//evil.com',
    '/login',
    '/login?next=/',
    '/api',
    '/api/leads',
  ])('troca %j por /', (entrada) => {
    expect(destinoSeguro(entrada)).toBe('/');
  });
});
