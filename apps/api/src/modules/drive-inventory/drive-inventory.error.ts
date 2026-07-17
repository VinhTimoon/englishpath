export const DRIVE_INVENTORY_ERROR_CODES = {
  INVALID_QUERY: 'INVALID_QUERY',
  INVALID_MANIFEST: 'INVALID_MANIFEST',
  DUPLICATE_MANIFEST: 'DUPLICATE_MANIFEST',
} as const;

export type DriveInventoryErrorCode =
  (typeof DRIVE_INVENTORY_ERROR_CODES)[keyof typeof DRIVE_INVENTORY_ERROR_CODES];

const ERROR_MESSAGES: Record<DriveInventoryErrorCode, string> = {
  INVALID_QUERY: 'Drive inventory query is invalid.',
  INVALID_MANIFEST: 'Drive inventory manifest is invalid.',
  DUPLICATE_MANIFEST: 'Drive inventory manifest identity must be unique.',
};

export class DriveInventoryError extends Error {
  readonly code: DriveInventoryErrorCode;

  constructor(code: DriveInventoryErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = 'DriveInventoryError';
    this.code = code;
  }
}

export function isDriveInventoryError(
  error: unknown,
): error is DriveInventoryError {
  return error instanceof DriveInventoryError;
}
