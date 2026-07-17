import { AccessError, ACCESS_ERROR_CODES } from './access-error';
import { extractBearerToken } from './bearer-token';

describe('extractBearerToken', () => {
  it.each([
    'Bearer header.payload.signature',
    'bearer header.payload.signature',
    'BEARER header.payload.signature',
  ])('accepts a case-insensitive bearer scheme for %s', (headerValue) => {
    expect(extractBearerToken(headerValue)).toBe('header.payload.signature');
  });

  it.each([undefined, null, '', '   '])(
    'fails closed when the credential is missing: %s',
    (headerValue) => {
      try {
        extractBearerToken(headerValue);
        fail('Expected missing bearer credential to throw.');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(AccessError);
        expect(error).toMatchObject({
          code: ACCESS_ERROR_CODES.MISSING_BEARER_CREDENTIAL,
          message: 'Bearer credential is required.',
        });
      }
    },
  );

  it.each([
    'Basic header.payload.signature',
    'Bearer',
    'Bearer   ',
    'Bearer first second',
    'Bearer first,second',
    ['Bearer first.signature.value', 'Bearer second.signature.value'],
  ])('rejects malformed or ambiguous credentials for %p', (headerValue) => {
    try {
      extractBearerToken(headerValue);
      fail('Expected bearer parsing to throw.');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(AccessError);
      expect((error as AccessError).code).toBe(
        ACCESS_ERROR_CODES.MALFORMED_BEARER_CREDENTIAL,
      );
    }
  });

  it('does not echo the token in outward errors', () => {
    const rawHeader = 'Bearer secret-token-value';

    try {
      extractBearerToken(`${rawHeader} extra`);
      fail('Expected bearer parsing to throw.');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(AccessError);
      expect((error as AccessError).message).not.toContain(
        'secret-token-value',
      );
      expect(String(error)).not.toContain('secret-token-value');
    }
  });
});
