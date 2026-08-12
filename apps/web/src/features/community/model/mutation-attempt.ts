export type MutationAttempt<T> = Readonly<{
  id: string;
  key: string;
  input: T;
}>;

export function createMutationAttempt<T>(input: T): MutationAttempt<T> {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { id, key: `community-${id}`, input };
}
