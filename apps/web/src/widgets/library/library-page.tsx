"use client";
import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getCatalogue, type Catalogue } from "@/features/library/library-api";
import {
  learnerApiRequiresAuth,
  learnerApiStatus,
} from "@/shared/api/learner-api-client";

export function LibraryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [data, setData] = useState<Catalogue>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const [retryNonce, setRetryNonce] = useState(0);
  const query = params.toString();
  useEffect(() => {
    const controller = new AbortController();
    getCatalogue(new URLSearchParams(query), controller.signal)
      .then(setData)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, retryNonce]);

  function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    const next = new URLSearchParams();
    new FormData(event.currentTarget).forEach((value, key) => {
      if (typeof value === "string" && value) next.set(key, value);
    });
    next.delete("page");
    router.push(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`);
  }

  function page(pageNumber: number) {
    setLoading(true);
    setError(undefined);
    const next = new URLSearchParams(query);
    next.set("page", String(pageNumber));
    router.push(`${pathname}?${next.toString()}`);
  }

  function retry() {
    setLoading(true);
    setError(undefined);
    setRetryNonce((value) => value + 1);
  }

  const unavailable = Boolean(error && learnerApiStatus(error) === 503);
  const authRequired = Boolean(
    error && (learnerApiStatus(error) === 401 || learnerApiRequiresAuth(error)),
  );

  return (
    <main
      className="mx-auto w-full max-w-6xl px-4 py-10 text-[var(--ink)] sm:px-6"
      aria-labelledby="library-title"
    >
      <header className="mb-8 border-b border-[var(--border)] pb-6">
        <p className="text-sm font-bold uppercase tracking-[.16em] text-[var(--brand)]">
          Thư viện học tập
        </p>
        <h1
          id="library-title"
          className="mt-2 max-w-4xl font-[var(--font-display)] text-4xl font-bold leading-tight"
        >
          Nội dung đã được chọn để học đúng lúc.
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--ink-muted)]">
          Tìm bài học và tài liệu được cấp quyền cho người học đã đăng nhập.
        </p>
      </header>
      <form
        onSubmit={update}
        className="mb-8 grid gap-3 border-b border-[var(--border)] pb-6 sm:grid-cols-[2fr_1fr_1fr_auto]"
        role="search"
      >
        <label className="flex min-h-11 flex-col gap-1 text-sm font-bold">
          Tìm kiếm
          <input
            name="search"
            defaultValue={params.get("search") ?? ""}
            className="min-h-11 border border-[var(--border)] bg-[var(--surface)] px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          />
        </label>
        <label className="flex min-h-11 flex-col gap-1 text-sm font-bold">
          Trình độ
          <select
            name="level"
            defaultValue={params.get("level") ?? ""}
            className="min-h-11 border border-[var(--border)] bg-[var(--surface)] px-3 font-normal"
          >
            <option value="">Tất cả</option>
            {data?.facets.levels.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 flex-col gap-1 text-sm font-bold">
          Chủ đề
          <select
            name="topic"
            defaultValue={params.get("topic") ?? ""}
            className="min-h-11 border border-[var(--border)] bg-[var(--surface)] px-3 font-normal"
          >
            <option value="">Tất cả</option>
            {data?.facets.topics.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <button
          className="min-h-11 self-end bg-[var(--brand)] px-5 font-bold text-white focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--focus-ring)]"
          type="submit"
        >
          Lọc
        </button>
      </form>
      {loading && (
        <p role="status" className="py-12">
          Đang tải thư viện…
        </p>
      )}
      {!loading && Boolean(error) && (
        <div
          role="alert"
          className="border border-[var(--border)] bg-[var(--surface)] p-6"
        >
          <p>
            {authRequired
              ? "Đăng nhập để mở thư viện học tập."
              : unavailable
                ? "Thư viện hiện chưa khả dụng."
                : "Không thể tải thư viện lúc này."}
          </p>
          {!authRequired && (
            <button
              type="button"
              className="mt-4 min-h-11 border border-[var(--brand)] px-4 font-bold"
              onClick={retry}
            >
              Thử lại
            </button>
          )}
        </div>
      )}
      {!loading && !error && data?.status === "empty" && (
        <p role="status" className="py-12">
          Thư viện chưa có nội dung phù hợp.
        </p>
      )}
      {!loading && !error && data?.status === "filtered-empty" && (
        <div className="py-12">
          <p role="status">Không tìm thấy nội dung theo bộ lọc.</p>
          <a
            className="mt-4 inline-flex min-h-11 items-center font-bold underline focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--focus-ring)]"
            href={pathname}
          >
            Xóa bộ lọc
          </a>
        </div>
      )}
      {!loading && !error && data?.items.length ? (
        <>
          <section
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Danh sách nội dung"
          >
            {data.items.map((item) => (
              <article
                key={item.versionId}
                className="border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <p className="text-sm font-bold text-[var(--brand)]">
                  {item.level} · {item.contentType}
                </p>
                <h2 className="mt-2 text-xl font-bold"><a className="underline" href={"/library/"+item.versionId}>{item.title}</a></h2>
                <p className="mt-2 text-[var(--ink-muted)]">{item.summary}</p>
                <p className="mt-5 text-sm">
                  {item.taxonomy.topic}
                  {item.durationMinutes
                    ? ` · ${item.durationMinutes} phút`
                    : ""}
                </p>
              </article>
            ))}
          </section>
          {data.pagination.pages > 1 && (
            <nav
              className="mt-8 flex flex-wrap items-center gap-3"
              aria-label="Phân trang"
            >
              {Array.from(
                { length: data.pagination.pages },
                (_, i) => i + 1,
              ).map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => page(n)}
                  aria-current={n === data.pagination.page ? "page" : undefined}
                  className="min-h-11 min-w-11 border border-[var(--border)] px-3 font-bold focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--focus-ring)]"
                >
                  {n}
                </button>
              ))}
            </nav>
          )}
        </>
      ) : null}
    </main>
  );
}
