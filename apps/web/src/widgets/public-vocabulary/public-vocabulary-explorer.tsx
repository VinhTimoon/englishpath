"use client";

import { useState, startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { VocabularyTree } from "@/entities/vocabulary/ui/vocabulary-tree";
import { VocabularyFiltersForm } from "@/features/explore-vocabulary/ui/vocabulary-filters";
import {
  mindmapQuery,
  topicsQuery,
} from "@/features/explore-vocabulary/api/vocabulary-queries";
import {
  filtersToParams,
  parseVocabularyFilters,
  type VocabularyFilters,
} from "@/features/explore-vocabulary/model/filter-state";
import styles from "./public-vocabulary.module.css";

function ExplorerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = parseVocabularyFilters(
    new URLSearchParams(searchParams.toString()),
  );
  const topics = useQuery(topicsQuery(filters));
  const mindmap = useQuery(mindmapQuery(filters));
  const filtered = Boolean(
    filters.level ||
    filters.track ||
    filters.skill ||
    filters.toeicPart ||
    filters.rootId,
  );

  const updateFilters = (next: VocabularyFilters) => {
    const query = filtersToParams(next).toString();
    startTransition(() =>
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      }),
    );
  };

  const retry = () => {
    void topics.refetch();
    void mindmap.refetch();
  };

  return (
    <section className={styles.explorer} aria-labelledby="explorer-title">
      <div className={styles.explorerHeading}>
        <div>
          <p className={styles.kicker}>Khám phá theo mục tiêu</p>
          <h2 id="explorer-title">Bản đồ từ vựng công khai</h2>
        </div>
        <p>
          Thay đổi bộ lọc để thu hẹp chủ đề. Đường dẫn trên trình duyệt sẽ lưu
          lựa chọn để bạn chia sẻ.
        </p>
      </div>
      <VocabularyFiltersForm filters={filters} onChange={updateFilters} />

      {topics.isPending || mindmap.isPending ? (
        <div
          className={styles.skeleton}
          role="status"
          aria-live="polite"
          aria-label="Đang tải bản đồ từ vựng"
        >
          <span />
          <span />
          <span />
        </div>
      ) : topics.isError || mindmap.isError ? (
        <div className={styles.state} role="alert">
          <h3>Chưa thể mở bản đồ</h3>
          <p>
            Đường truyền có thể đang gián đoạn. Không có chi tiết kỹ thuật hoặc
            dữ liệu riêng tư nào được hiển thị.
          </p>
          <button type="button" onClick={retry}>
            Thử tải lại
          </button>
        </div>
      ) : topics.data.data.length === 0 ||
        mindmap.data.data.roots.length === 0 ? (
        <div
          className={styles.state}
          data-state={filtered ? "filtered-empty" : "empty"}
        >
          <h3>
            {filtered
              ? "Chưa có chủ đề khớp bộ lọc"
              : "Danh mục đang được chuẩn bị"}
          </h3>
          <p>
            {filtered
              ? "Hãy xóa bớt một bộ lọc để mở rộng kết quả."
              : "Nội dung công khai sẽ xuất hiện sau khi được duyệt."}
          </p>
          {filtered ? (
            <button type="button" onClick={() => updateFilters({ depth: "3" })}>
              Xem tất cả chủ đề
            </button>
          ) : null}
        </div>
      ) : (
        <div className={styles.results} aria-live="polite">
          <aside aria-label="Tóm tắt chủ đề">
            <p>
              <strong>{topics.data.page.totalItems}</strong> chủ đề phù hợp
            </p>
            <ol>
              {topics.data.data.map((topic) => (
                <li key={topic.id}>
                  <span>{topic.label}</span>
                  <small>{topic.vocabularyCount} từ</small>
                </li>
              ))}
            </ol>
          </aside>
          <VocabularyTree roots={mindmap.data.data.roots} />
        </div>
      )}
    </section>
  );
}

export function PublicVocabularyExplorer() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ExplorerContent />
    </QueryClientProvider>
  );
}
