import { IDENTITY_ERROR_CODES, IdentityError } from './identity.error';
import {
  ROLE_CODES,
  assertOwnership,
  createApplicationIdentity,
  normalizeProfileInput,
  normalizeProfilePatch,
} from './identity.models';

describe('identity models', () => {
  it('creates immutable application identity without token-derived authority', () => {
    const identity = createApplicationIdentity({
      id: 'user-0001',
      provider: 'SUPABASE',
      externalSubject: 'subject-0001',
      status: 'ACTIVE',
      roles: ['FREE_USER'],
      tokenRole: 'SUPER_ADMIN',
    } as never);

    expect(identity).toEqual({
      id: 'user-0001',
      provider: 'SUPABASE',
      externalSubject: 'subject-0001',
      status: 'ACTIVE',
      roles: ['FREE_USER'],
    });
    expect(Object.isFrozen(identity)).toBe(true);
    expect(Object.isFrozen(identity.roles)).toBe(true);
    expect(ROLE_CODES).not.toContain('GUEST');
  });

  it('normalizes the minimal profile and requires secure avatar URLs', () => {
    expect(normalizeProfileInput({})).toEqual({
      displayName: null,
      avatarUrl: null,
      locale: 'vi-VN',
      timezone: 'Asia/Ho_Chi_Minh',
    });
    expect(
      normalizeProfileInput({
        displayName: 'Learner',
        avatarUrl: 'https://cdn.example/avatar.png',
        locale: 'en-US',
        timezone: 'Asia/Bangkok',
      }),
    ).toEqual({
      displayName: 'Learner',
      avatarUrl: 'https://cdn.example/avatar.png',
      locale: 'en-US',
      timezone: 'Asia/Bangkok',
    });
    expect(() =>
      normalizeProfileInput({ avatarUrl: 'http://private.test' }),
    ).toThrow(IdentityError);
    expect(normalizeProfilePatch({ displayName: 'Updated' })).toEqual({
      displayName: 'Updated',
    });
  });

  it('fails closed when ownership does not match', () => {
    expect(assertOwnership('user-0001', 'user-0001')).toBe('user-0001');
    try {
      assertOwnership('user-0001', 'user-0002');
      fail('Expected cross-user ownership to fail.');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(IdentityError);
      expect(error).toMatchObject({
        code: IDENTITY_ERROR_CODES.FORBIDDEN_OWNERSHIP,
      });
    }
  });

  it.each([
    () =>
      createApplicationIdentity({
        id: 'x',
        provider: 'SUPABASE',
        externalSubject: 'subject-0001',
        status: 'ACTIVE',
      }),
    () =>
      createApplicationIdentity({
        id: 'user-0001',
        provider: 'UNKNOWN',
        externalSubject: 'subject-0001',
        status: 'ACTIVE',
      }),
    () => normalizeProfileInput({ timezone: 'private path' }),
  ])('returns sanitized typed validation errors', (action) => {
    expect(action).toThrow(IdentityError);
    try {
      action();
    } catch (error: unknown) {
      expect(String(error)).not.toContain('private');
      expect(String(error)).not.toContain('subject-0001');
    }
  });
});
