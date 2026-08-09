import type { GovernedContentVersion } from '../content-governance/content-governance.models';

export type LibraryCatalogueRecord = Readonly<{
  version: GovernedContentVersion;
  title: string;
  summary: string;
  contentType: string;
  durationMinutes?: number;
  level?: string;
}>;

export interface LibraryCataloguePort {
  load(): Promise<readonly LibraryCatalogueRecord[]>;
}
export const LIBRARY_CATALOGUE_PORT = Symbol('LIBRARY_CATALOGUE_PORT');

export class LocalLibraryCatalogueAdapter implements LibraryCataloguePort {
  load(): Promise<readonly LibraryCatalogueRecord[]> {
    return Promise.resolve([]);
  }
}
