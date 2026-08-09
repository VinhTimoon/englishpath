"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getLibraryLinks,
  type LibraryLinks,
} from "@/features/library/library-api";
import { learnerApiStatus } from "@/shared/api/learner-api-client";

type PanelState = "loading" | "success" | "empty" | "error" | "unavailable";

export function RelatedLearningPanel({ versionId }: { versionId: string }) {
  const [state, setState] = useState<PanelState>("loading");
  const [data, setData] = useState<LibraryLinks | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setState("loading");
      try {
        const result = await getLibraryLinks(versionId, signal);
        if (!signal?.aborted) {
          setData(result);
          setState(result.status);
        }
      } catch (error) {
        if (!signal?.aborted) {
          const status = learnerApiStatus(error);
          setState(status === 404 || status === 503 ? "unavailable" : "error");
        }
      }
    },
    [versionId],
  );

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => void load(controller.signal));
    return () => controller.abort();
  }, [load]);

  return (
    <section
      className="mt-8 border border-[var(--border)] p-4"
      aria-labelledby="related-learning-heading"
    >
      <h2 id="related-learning-heading" className="text-xl font-bold">
        Related learning
      </h2>
      {state === "loading" && (
        <p className="mt-3" role="status" aria-busy="true">
          Loading related activities...
        </p>
      )}
      {state === "error" && (
        <div className="mt-3">
          <p role="alert">Related learning could not be loaded.</p>
          <button
            type="button"
            className="mt-3 min-h-11 border px-4 focus-visible:outline focus-visible:outline-2"
            onClick={() => void load()}
          >
            Retry related learning
          </button>
        </div>
      )}
      {state === "unavailable" && (
        <p className="mt-3" role="status">
          Related learning is unavailable for this lesson.
        </p>
      )}
      {state === "empty" && (
        <p className="mt-3" role="status">
          No related learning activities are available yet.
        </p>
      )}
      {state === "success" && data && (
        <nav
          aria-label="Related learning activities"
          className="mt-3 grid gap-2 sm:grid-cols-3"
        >
          {data.links.map((link) => (
            <a
              key={link.kind}
              href={link.href}
              className="min-h-11 border p-3 underline focus-visible:outline focus-visible:outline-2"
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </section>
  );
}
