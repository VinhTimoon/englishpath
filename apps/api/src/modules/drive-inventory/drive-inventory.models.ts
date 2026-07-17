import {
  DRIVE_INVENTORY_ERROR_CODES,
  DriveInventoryError,
} from './drive-inventory.error';

export const DRIVE_INVENTORY_RESOURCE_KINDS = [
  'document',
  'video',
  'audio',
  'slide',
  'spreadsheet',
  'transcript',
  'image',
  'course_folder',
  'external_link',
  'unknown',
] as const;

export type DriveInventoryResourceKind =
  (typeof DRIVE_INVENTORY_RESOURCE_KINDS)[number];

export type DriveInventoryManifest = Readonly<{
  provider: string;
  sourceFileId: string;
  displayName: string;
  mimeType: string;
  resourceKind: DriveInventoryResourceKind;
  parentSourceIds?: readonly string[];
  pathHints?: readonly string[];
  privateSourceRef: string;
  checksum: string;
  sourceVersion: string;
  modifiedAt: string;
  sizeBytes?: number;
  inventoriedAt: string;
}>;

export type DriveInventoryQuery = Readonly<{
  provider?: string;
  sourceFileIds?: readonly string[];
  resourceKinds?: readonly DriveInventoryResourceKind[];
}>;

export type DriveInventoryResult = Readonly<{
  query: DriveInventoryQuery;
  manifests: readonly DriveInventoryManifest[];
  manifestCount: number;
}>;

export type CreateDriveInventoryResultInput = Readonly<{
  query?: DriveInventoryQuery;
  manifests: readonly DriveInventoryManifest[];
}>;

const GENERAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+~-]{0,255}$/;
const MIME_TYPE_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}$/;
const CHECKSUM_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}:[A-Za-z0-9+/=_-]{1,512}$/;
const ISO_UTC_TIMESTAMP_PATTERN =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{3}))?Z$/;
const MANIFEST_FIELDS = new Set([
  'provider',
  'sourceFileId',
  'displayName',
  'mimeType',
  'resourceKind',
  'parentSourceIds',
  'pathHints',
  'privateSourceRef',
  'checksum',
  'sourceVersion',
  'modifiedAt',
  'sizeBytes',
  'inventoriedAt',
]);
const QUERY_FIELDS = new Set(['provider', 'sourceFileIds', 'resourceKinds']);

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  const objectValue = value as Record<string, unknown>;

  for (const propertyValue of Object.values(objectValue)) {
    deepFreeze(propertyValue);
  }

  return Object.freeze(value);
}

function compareStrings(left: string, right: string) {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function requireObject(
  value: unknown,
  code: keyof typeof DRIVE_INVENTORY_ERROR_CODES,
) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES[code]);
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES[code]);
  }
}

function requireToken(
  value: unknown,
  code: keyof typeof DRIVE_INVENTORY_ERROR_CODES,
) {
  if (typeof value !== 'string') {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES[code]);
  }
  const normalized = value.trim();
  if (!GENERAL_ID_PATTERN.test(normalized)) {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES[code]);
  }
  return normalized;
}

function requireDisplayName(value: unknown) {
  if (typeof value !== 'string') {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST);
  }
  return normalized;
}

function requireMimeType(value: unknown) {
  if (typeof value !== 'string') {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST);
  }
  const normalized = value.trim();
  if (!MIME_TYPE_PATTERN.test(normalized)) {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST);
  }
  return normalized;
}

function requireTimestamp(
  value: unknown,
  code: keyof typeof DRIVE_INVENTORY_ERROR_CODES,
) {
  if (typeof value !== 'string') {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES[code]);
  }
  const normalized = value.trim();
  const match = ISO_UTC_TIMESTAMP_PATTERN.exec(normalized);
  const parsed = Date.parse(normalized);
  const canonical = match ? `${match[1]}.${match[2] ?? '000'}Z` : undefined;
  if (
    !match ||
    !Number.isFinite(parsed) ||
    new Date(parsed).toISOString() !== canonical
  ) {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES[code]);
  }
  return normalized;
}

function requireChecksum(value: unknown) {
  if (typeof value !== 'string') {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST);
  }
  const normalized = value.trim();
  if (!CHECKSUM_PATTERN.test(normalized)) {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST);
  }
  return normalized;
}

function requirePrivateSourceRef(value: unknown) {
  if (typeof value !== 'string') {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST);
  }
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > 2048 ||
    [...normalized].some((character) => {
      const codePoint = character.charCodeAt(0);
      return codePoint < 32 || codePoint === 127;
    })
  ) {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST);
  }
  return normalized;
}

function requireResourceKind(value: unknown) {
  if (!DRIVE_INVENTORY_RESOURCE_KINDS.includes(value as never)) {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST);
  }
  return value as DriveInventoryResourceKind;
}

function normalizeOptionalStringList(
  value: unknown,
  code: keyof typeof DRIVE_INVENTORY_ERROR_CODES,
) {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES[code]);
  }

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== 'string') {
      throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES[code]);
    }
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized.length > 0 ? deepFreeze(normalized) : undefined;
}

function normalizeRequiredTokenList(
  value: unknown,
  code: keyof typeof DRIVE_INVENTORY_ERROR_CODES,
) {
  const normalized = normalizeOptionalStringList(value, code);
  if (!normalized) {
    return undefined;
  }
  normalized.forEach((entry) => {
    if (!GENERAL_ID_PATTERN.test(entry)) {
      throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES[code]);
    }
  });
  return normalized;
}

function normalizeOptionalResourceKinds(value: unknown) {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES.INVALID_QUERY);
  }

  const normalized: DriveInventoryResourceKind[] = [];
  const seen = new Set<DriveInventoryResourceKind>();

  for (const entry of value) {
    if (!DRIVE_INVENTORY_RESOURCE_KINDS.includes(entry as never)) {
      throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES.INVALID_QUERY);
    }
    const resourceKind = entry as DriveInventoryResourceKind;
    if (seen.has(resourceKind)) {
      continue;
    }
    seen.add(resourceKind);
    normalized.push(resourceKind);
  }

  return normalized.length > 0 ? deepFreeze(normalized) : undefined;
}

function normalizeOptionalSize(
  value: unknown,
  resourceKind: DriveInventoryResourceKind,
) {
  if (value === undefined) {
    if (resourceKind === 'course_folder' || resourceKind === 'external_link') {
      return undefined;
    }
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST);
  }
  if (
    !Number.isInteger(value) ||
    !Number.isFinite(value) ||
    (value as number) < 0
  ) {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST);
  }
  return value as number;
}

export function createDriveInventoryManifest(
  input: DriveInventoryManifest & Record<string, unknown>,
): DriveInventoryManifest {
  requireObject(input, 'INVALID_MANIFEST');
  if (Object.keys(input).some((field) => !MANIFEST_FIELDS.has(field))) {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST);
  }

  const resourceKind = requireResourceKind(input.resourceKind);
  const manifest: DriveInventoryManifest = {
    provider: requireToken(input.provider, 'INVALID_MANIFEST'),
    sourceFileId: requireToken(input.sourceFileId, 'INVALID_MANIFEST'),
    displayName: requireDisplayName(input.displayName),
    mimeType: requireMimeType(input.mimeType),
    resourceKind,
    ...(normalizeRequiredTokenList(input.parentSourceIds, 'INVALID_MANIFEST')
      ? {
          parentSourceIds: normalizeRequiredTokenList(
            input.parentSourceIds,
            'INVALID_MANIFEST',
          ),
        }
      : {}),
    ...(normalizeOptionalStringList(input.pathHints, 'INVALID_MANIFEST')
      ? {
          pathHints: normalizeOptionalStringList(
            input.pathHints,
            'INVALID_MANIFEST',
          ),
        }
      : {}),
    privateSourceRef: requirePrivateSourceRef(input.privateSourceRef),
    checksum: requireChecksum(input.checksum),
    sourceVersion: requireToken(input.sourceVersion, 'INVALID_MANIFEST'),
    modifiedAt: requireTimestamp(input.modifiedAt, 'INVALID_MANIFEST'),
    ...(normalizeOptionalSize(input.sizeBytes, resourceKind) !== undefined
      ? { sizeBytes: normalizeOptionalSize(input.sizeBytes, resourceKind) }
      : {}),
    inventoriedAt: requireTimestamp(input.inventoriedAt, 'INVALID_MANIFEST'),
  };

  return deepFreeze(manifest);
}

export function createDriveInventoryQuery(
  input?: DriveInventoryQuery | Record<string, unknown>,
): DriveInventoryQuery {
  if (input === undefined) {
    return deepFreeze({});
  }
  requireObject(input, 'INVALID_QUERY');
  if (Object.keys(input).some((field) => !QUERY_FIELDS.has(field))) {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES.INVALID_QUERY);
  }

  const provider =
    input.provider === undefined
      ? undefined
      : requireToken(input.provider, 'INVALID_QUERY');
  const sourceFileIds = normalizeRequiredTokenList(
    input.sourceFileIds,
    'INVALID_QUERY',
  );
  const resourceKinds = normalizeOptionalResourceKinds(input.resourceKinds);
  if (
    (Array.isArray(input.sourceFileIds) && !sourceFileIds) ||
    (Array.isArray(input.resourceKinds) && !resourceKinds)
  ) {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES.INVALID_QUERY);
  }

  const query: DriveInventoryQuery = {
    ...(provider ? { provider } : {}),
    ...(sourceFileIds ? { sourceFileIds } : {}),
    ...(resourceKinds ? { resourceKinds } : {}),
  };

  return deepFreeze(query);
}

export function createDriveInventoryResult(
  input: CreateDriveInventoryResultInput,
): DriveInventoryResult {
  requireObject(input, 'INVALID_QUERY');
  if (!Array.isArray(input.manifests)) {
    throw new DriveInventoryError(DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST);
  }
  for (let index = 0; index < input.manifests.length; index += 1) {
    if (!(index in input.manifests)) {
      throw new DriveInventoryError(
        DRIVE_INVENTORY_ERROR_CODES.INVALID_MANIFEST,
      );
    }
  }

  const query = createDriveInventoryQuery(input.query);
  const normalizedManifests = input.manifests.map((manifest) =>
    createDriveInventoryManifest(
      manifest as DriveInventoryManifest & Record<string, unknown>,
    ),
  );
  const sortedManifests = [...normalizedManifests].sort((left, right) => {
    const providerComparison = compareStrings(left.provider, right.provider);
    if (providerComparison !== 0) {
      return providerComparison;
    }
    return compareStrings(left.sourceFileId, right.sourceFileId);
  });

  const identitySet = new Set<string>();
  for (const manifest of sortedManifests) {
    const identity = `${manifest.provider}::${manifest.sourceFileId}`;
    if (identitySet.has(identity)) {
      throw new DriveInventoryError(
        DRIVE_INVENTORY_ERROR_CODES.DUPLICATE_MANIFEST,
      );
    }
    identitySet.add(identity);
  }

  return deepFreeze({
    query,
    manifests: deepFreeze(sortedManifests),
    manifestCount: sortedManifests.length,
  });
}
