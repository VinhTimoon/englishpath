import type { SpeakingContentType } from "@/entities/toeic-speaking/model/contracts";

const DATABASE = "englishpath-speaking-drafts";
const STORE = "recordings";
const VERSION = 1;

export type SpeakingRecordingDraft = {
  blob: Blob;
  contentType: SpeakingContentType;
  durationSeconds: number;
  sizeBytes: number;
  submissionReference: string;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("INDEXED_DB_UNAVAILABLE"));
      return;
    }
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("INDEXED_DB_ERROR"));
  });
}

export async function saveSpeakingRecordingDraft(
  key: string,
  draft: SpeakingRecordingDraft,
) {
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(draft, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  } catch {
    // The in-memory preview remains available when IndexedDB is unavailable.
  }
}

export async function readSpeakingRecordingDraft(
  key: string,
): Promise<SpeakingRecordingDraft | null> {
  try {
    const database = await openDatabase();
    const draft = await new Promise<SpeakingRecordingDraft | undefined>(
      (resolve, reject) => {
        const request = database.transaction(STORE).objectStore(STORE).get(key);
        request.onsuccess = () =>
          resolve(request.result as SpeakingRecordingDraft | undefined);
        request.onerror = () => reject(request.error);
      },
    );
    database.close();
    return draft ?? null;
  } catch {
    return null;
  }
}

export async function removeSpeakingRecordingDraft(key: string) {
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  } catch {
    // The draft may already be unavailable or cleared by the browser.
  }
}
