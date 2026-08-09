export type DrillOption = Readonly<{ id: string; label: string }>;
export type InternalDrill = Readonly<{
  drillId: string;
  versionId: string;
  questionId: string;
  prompt: string;
  options: readonly DrillOption[];
  correctOptionId: string;
}>;
export type PublicDrill = Omit<InternalDrill, 'correctOptionId'>;
export const LIBRARY_DRILL_PORT = Symbol('LIBRARY_DRILL_PORT');
export interface LibraryDrillPort {
  find(versionId: string): Promise<InternalDrill | null>;
}
const approvedFixture: InternalDrill = {
  drillId: 'library-listening-1',
  versionId: 'player-version',
  questionId: 'library-listening-1-question-1',
  prompt: 'Which workplace action is mentioned in the lesson?',
  options: [
    { id: 'option-a', label: 'Review the meeting notes' },
    { id: 'option-b', label: 'Book a flight' },
    { id: 'option-c', label: 'Change the office address' },
  ],
  correctOptionId: 'option-a',
};

export class LocalLibraryDrillAdapter implements LibraryDrillPort {
  find(versionId: string) {
    return Promise.resolve(
      versionId === approvedFixture.versionId ? approvedFixture : null,
    );
  }
}
