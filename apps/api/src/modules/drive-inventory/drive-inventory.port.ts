import type {
  DriveInventoryQuery,
  DriveInventoryResult,
} from './drive-inventory.models';

export interface DriveInventoryPort {
  inventory(query?: DriveInventoryQuery): Promise<DriveInventoryResult>;
}
