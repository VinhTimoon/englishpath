import type { GovernedContentVersion } from '../content-governance/content-governance.models';
import type { ControlledStorageReference } from './library-content.ports';

export type LibraryCatalogueRecord = Readonly<{
  version: GovernedContentVersion;
  title: string;
  summary: string;
  contentType: string;
  durationMinutes?: number;
  level?: string;
  durationSeconds?: number;
  transcript?: readonly LibraryTranscriptSegment[];
  storage?: ControlledStorageReference;
}>;

export type LibraryTranscriptSegment = Readonly<{
  startSeconds: number;
  endSeconds: number;
  text: string;
  order?: number;
}>;

export interface LibraryCataloguePort {
  load(): Promise<readonly LibraryCatalogueRecord[]>;
}
export const LIBRARY_CATALOGUE_PORT = Symbol('LIBRARY_CATALOGUE_PORT');

export class LocalLibraryCatalogueAdapter implements LibraryCataloguePort {
  private readonly records: readonly LibraryCatalogueRecord[] = [];

  load(): Promise<readonly LibraryCatalogueRecord[]> {
    return Promise.resolve(this.records);
  }
}
