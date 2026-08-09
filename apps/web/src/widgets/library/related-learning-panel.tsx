"use client";

import { useCallback, useEffect, useState } from "react";
import { getLibraryLinks, type LibraryLinks } from "@/features/library/library-api";

export function RelatedLearningPanel({ versionId }: { versionId: string }) {
  const [state, setState] = useState<"loading" | "success" | "empty" | "error">("loading");
  const [data, setData] = useState<LibraryLinks | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    setState("loading");
    try {
      const result = await getLibraryLinks(versionId, signal);
      if (!signal?.aborted) { setData(result); setState(result.status); }
    } catch { if (!signal?.aborted) setState("error"); }
  }, [versionId]);
  useEffect(() => { const controller = new AbortController(); queueMicrotask(() => void load(controller.signal)); return () => controller.abort(); }, [load]);

  return (
    <section className="mt-8 border border-[var(--border)] p-4" aria-labelledby="related-learning-heading">
      <h2 id="related-learning-heading" className="text-xl font-bold">Học tiếp</h2>
      {state === "loading" && <p className="mt-3" role="status" aria-busy="true">Đang tải hoạt động liên quan…</p>}
      {state === "error" && <div className="mt-3"><p role="alert">Không thể tải hoạt động liên quan.</p><button type="button" className="mt-3 min-h-11 border px-4 focus-visible:outline focus-visible:outline-2" onClick={() => void load()}>Thử lại</button></div>}
      {state === "empty" && <p className="mt-3" role="status">Chưa có hoạt động liên quan cho nội dung này.</p>}
      {state === "success" && data && <nav aria-label="Hoạt động học tiếp" className="mt-3 grid gap-2 sm:grid-cols-3">{data.links.map((link) => <a key={link.kind} href={link.href} className="min-h-11 border p-3 underline focus-visible:outline focus-visible:outline-2">{link.label}</a>)}</nav>}
    </section>
  );
}
