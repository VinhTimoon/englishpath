import { resolveApiRuntimeConfig } from './runtime';

describe('resolveApiRuntimeConfig', () => {
  it('uses the local API and frontend defaults', () => {
    expect(resolveApiRuntimeConfig({})).toEqual({
      port: 3000,
      webOrigin: 'http://localhost:5173',
    });
  });

  it('normalizes valid overrides', () => {
    expect(
      resolveApiRuntimeConfig({
        PORT: '4000',
        WEB_ORIGIN: 'https://englishpath.example/',
      }),
    ).toEqual({
      port: 4000,
      webOrigin: 'https://englishpath.example',
    });
  });

  it.each(['0', '65536', '3000.5', 'invalid'])(
    'rejects invalid port %s',
    (PORT) => {
      expect(() => resolveApiRuntimeConfig({ PORT })).toThrow(
        'PORT must be an integer between 1 and 65535.',
      );
    },
  );

  it.each([
    'ftp://localhost:5173',
    'http://localhost:5173/path',
    'http://user:pass@localhost:5173',
  ])('rejects invalid web origin %s', (WEB_ORIGIN) => {
    expect(() => resolveApiRuntimeConfig({ WEB_ORIGIN })).toThrow(
      'WEB_ORIGIN must contain only an http(s) scheme and host.',
    );
  });
});
