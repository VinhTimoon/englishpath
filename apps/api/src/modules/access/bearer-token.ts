import { AccessError, ACCESS_ERROR_CODES } from './access-error';

export type AuthorizationHeaderValue =
  string | readonly string[] | null | undefined;

export function extractBearerToken(
  authorizationHeader: AuthorizationHeaderValue,
) {
  if (authorizationHeader == null) {
    throw new AccessError(ACCESS_ERROR_CODES.MISSING_BEARER_CREDENTIAL);
  }

  if (typeof authorizationHeader !== 'string') {
    if (authorizationHeader.length !== 1) {
      throw new AccessError(ACCESS_ERROR_CODES.MALFORMED_BEARER_CREDENTIAL);
    }

    const [singleHeader] = authorizationHeader;

    return extractBearerToken(singleHeader);
  }

  const normalizedHeader = authorizationHeader.trim();
  if (!normalizedHeader) {
    throw new AccessError(ACCESS_ERROR_CODES.MISSING_BEARER_CREDENTIAL);
  }

  if (normalizedHeader.includes(',')) {
    throw new AccessError(ACCESS_ERROR_CODES.MALFORMED_BEARER_CREDENTIAL);
  }

  const parts = normalizedHeader.split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
    throw new AccessError(ACCESS_ERROR_CODES.MALFORMED_BEARER_CREDENTIAL);
  }

  return parts[1];
}
