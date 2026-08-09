export type DrillOption = Readonly<{ id: string; label: string }>;
export type InternalDrill = Readonly<{ drillId: string; versionId: string; questionId: string; prompt: string; options: readonly DrillOption[]; correctOptionId: string }>;
export type PublicDrill = Omit<InternalDrill, 'correctOptionId'>;
export const LIBRARY_DRILL_PORT = Symbol('LIBRARY_DRILL_PORT');
export interface LibraryDrillPort { find(versionId: string): Promise<InternalDrill | null>; }
export class LocalLibraryDrillAdapter implements LibraryDrillPort { async find(_versionId: string) { return null; } }
