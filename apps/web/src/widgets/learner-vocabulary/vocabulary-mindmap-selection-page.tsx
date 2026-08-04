"use client";

import { useRef, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  MindmapNode,
  VocabularyItem,
} from "@/entities/vocabulary/model/vocabulary";
import {
  vocabularyItemsQuery,
  vocabularyMindmapQuery,
} from "@/features/learner-vocabulary/api/vocabulary-mindmap-query";
import {
  dueReviewsQuery,
  reviewMutation,
} from "@/features/learner-vocabulary/api/review-queries";
import styles from "./vocabulary-mindmap-selection-page.module.css";

function updateSelectionUrl(
  pathname: string,
  currentSearch: string,
  changes: { node?: string; page?: number; item?: string },
) {
  const params = new URLSearchParams(currentSearch);
  if (changes.node === undefined) params.delete("node");
  else params.set("node", changes.node);
  if (changes.page === undefined) params.delete("page");
  else params.set("page", String(changes.page));
  if (changes.item === undefined) params.delete("item");
  else params.set("item", changes.item);
  return `${pathname}?${params.toString()}`;
}

function NodeBranch({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: MindmapNode[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className={styles.tree}>
      {nodes.map((node) => (
        <li key={node.id}>
          <button
            className={styles.node}
            type="button"
            aria-pressed={selectedId === node.id}
            onClick={() => onSelect(node.id)}
          >
            <span className={styles.kind}>{node.kind}</span>
            <span className={styles.label}>{node.label}</span>
            <span className={styles.count}>{node.vocabularyCount} từ</span>
          </button>
          {node.children.length ? (
            <NodeBranch
              nodes={node.children}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ItemDetail({
  item,
  onBack,
}: {
  item: VocabularyItem;
  onBack: () => void;
}) {
  return (
    <article className={styles.detail} aria-live="polite">
      <button className={styles.back} type="button" onClick={onBack}>
        ← Quay lại danh sách
      </button>
      <p className={styles.kind}>Từ vựng</p>
      <h2>{item.word}</h2>
      {item.pronunciation ? <p>{item.pronunciation}</p> : null}
      <p className={styles.meaning}>{item.meaning}</p>
      {item.example ? <p className={styles.example}>“{item.example}”</p> : null}
    </article>
  );
}

function ItemList({
  nodeId,
  page,
  itemId,
  onPage,
  onItem,
  onBack,
}: {
  nodeId: string;
  page: number;
  itemId?: string;
  onPage: (page: number) => void;
  onItem: (item: VocabularyItem) => void;
  onBack: () => void;
}) {
  const query = useQuery(vocabularyItemsQuery(nodeId, page));
  if (query.isPending) {
    return <div className={styles.state} role="status">Đang tải danh sách từ…</div>;
  }
  if (query.isError) {
    return (
      <div className={styles.state} role="alert">
        <h2>Chưa thể tải danh sách</h2>
        <button type="button" onClick={() => void query.refetch()}>
          Thử tải lại
        </button>
      </div>
    );
  }
  const selected = query.data.data.find((item) => item.id === itemId);
  if (selected) return <ItemDetail item={selected} onBack={onBack} />;
  if (!query.data.data.length) {
    return (
      <div className={styles.state} role="status">
        <h2>Chưa có từ trong chủ đề này</h2>
        <p>Hãy chọn một nhánh khác trên bản đồ để tiếp tục.</p>
        <button type="button" onClick={onBack}>Quay lại bản đồ</button>
      </div>
    );
  }
  const { number, totalPages } = query.data.page;
  return (
    <section aria-labelledby="items-heading">
      <div className={styles.listHeading}>
        <div>
          <p className={styles.kind}>Danh sách từ</p>
          <h2 id="items-heading">Học theo nhịp của bạn</h2>
        </div>
        <button className={styles.back} type="button" onClick={onBack}>
          Đổi chủ đề
        </button>
      </div>
      <div className={styles.items}>
        {query.data.data.map((item) => (
          <article className={styles.item} key={item.id}>
            <div>
              <h3>{item.word}</h3>
              <p>{item.meaning}</p>
            </div>
            <button type="button" onClick={() => onItem(item)}>
              Xem chi tiết
            </button>
          </article>
        ))}
      </div>
      <nav className={styles.pagination} aria-label="Phân trang từ vựng">
        <button type="button" disabled={number <= 1} onClick={() => onPage(number - 1)}>
          ← Trang trước
        </button>
        <span>Trang {number} / {Math.max(totalPages, 1)}</span>
        <button type="button" disabled={number >= totalPages} onClick={() => onPage(number + 1)}>
          Trang tiếp →
        </button>
      </nav>
    </section>
  );
}

function ReviewPanel() {
  const [started, setStarted] = useState(false);
  const query = useQuery(dueReviewsQuery(started));
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(() => new Set());
  const submissionCounter = useRef(0);
  const [outcome, setOutcome] = useState<string>();
  const mutation = useMutation(reviewMutation());

  if (!started) {
    return (
      <section className={styles.review} aria-labelledby="review-heading">
        <p className={styles.kind}>Ôn tập đến hạn</p>
        <h2 id="review-heading">Giữ nhịp ghi nhớ</h2>
        <p className={styles.meaning}>Ôn những thẻ đang đến hạn để tiến bộ bền vững.</p>
        <button className={styles.primary} type="button" onClick={() => setStarted(true)}>
          Bắt đầu ôn tập
        </button>
      </section>
    );
  }
  if (query.isPending) return <div className={styles.state} role="status">Đang tải thẻ cần ôn…</div>;
  if (query.isError) {
    return <div className={styles.state} role="alert">Chưa thể tải ôn tập. Hãy đăng nhập rồi thử lại.</div>;
  }
  const queue = (query.data?.data ?? []).filter(
    (item) => !submittedIds.has(item.vocabularyId),
  );
  const current = queue[0];
  if (!current) {
    return <div className={styles.state} role="status"><h2>Không còn thẻ đến hạn</h2><p>Bạn đã hoàn thành lượt ôn tập hôm nay.</p></div>;
  }
  const submit = (quality: number) => {
    setOutcome(undefined);
    submissionCounter.current += 1;
    mutation.mutate(
      {
        vocabularyId: current.vocabularyId,
        quality,
        clientSubmissionId: `web-${current.vocabularyId}-${submissionCounter.current}`,
      },
      {
        onSuccess: (result) => {
          setSubmittedIds((ids) => new Set(ids).add(current.vocabularyId));
          setOutcome(`Đã lưu. Mức độ ghi nhớ hiện tại: ${result.data.mastery}%.`);
        },
      },
    );
  };
  return (
    <section className={styles.review} aria-labelledby="review-heading">
      <p className={styles.kind}>Ôn tập đến hạn</p>
      <h2 id="review-heading">{current.word}</h2>
      <p className={styles.meaning}>{current.meaning}</p>
      {current.example ? <p className={styles.example}>“{current.example}”</p> : null}
      <p>Thẻ còn lại: {queue.length}</p>
      <div className={styles.qualities} aria-label="Đánh giá mức độ nhớ">
        {[0, 1, 2, 3].map((quality) => (
          <button key={quality} type="button" disabled={mutation.isPending} onClick={() => submit(quality)}>
            {quality === 0 ? "Quên" : quality === 1 ? "Khó" : quality === 2 ? "Nhớ" : "Dễ"}
          </button>
        ))}
      </div>
      {mutation.isError ? <p role="alert">Chưa lưu được. Hãy thử lại.</p> : null}
      {outcome ? <p role="status">{outcome}</p> : null}
    </section>
  );
}

function SelectionContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nodeId = searchParams.get("node") ?? "";
  const itemId = searchParams.get("item") ?? undefined;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const mapQuery = useQuery(vocabularyMindmapQuery(!nodeId));

  const selectNode = (id: string) => {
    router.replace(updateSelectionUrl(pathname, searchParams.toString(), { node: id, page: 1 }), { scroll: false });
  };
  const selectItem = (item: VocabularyItem) => {
    router.replace(updateSelectionUrl(pathname, searchParams.toString(), { node: nodeId, page, item: item.id }), { scroll: false });
  };
  const backToMap = () => router.replace(updateSelectionUrl(pathname, searchParams.toString(), {}), { scroll: false });
  const backToItems = () => router.replace(updateSelectionUrl(pathname, searchParams.toString(), { node: nodeId, page }), { scroll: false });
  const retryMap = () => void mapQuery.refetch();

  if (!nodeId) {
    if (mapQuery.isPending) return <div className={styles.state} role="status">Đang tải bản đồ từ vựng…</div>;
    if (mapQuery.isError) return <div className={styles.state} role="alert"><h2>Chưa thể mở bản đồ</h2><button type="button" onClick={retryMap}>Thử tải lại</button></div>;
    const roots = mapQuery.data.data.roots;
    if (!roots.length) return <div className={styles.state} role="status"><h2>Chưa có bản đồ để học</h2><p>Nội dung học tập đang được chuẩn bị.</p></div>;
    return <div className={styles.treeWrap} aria-label="Chọn chủ đề từ vựng"><NodeBranch nodes={roots} onSelect={selectNode} /></div>;
  }

  return (
    <>
      <ItemList nodeId={nodeId} page={page} itemId={itemId} onPage={(next) => router.replace(updateSelectionUrl(pathname, searchParams.toString(), { node: nodeId, page: next }))} onItem={selectItem} onBack={itemId ? backToItems : backToMap} />
      <ReviewPanel />
    </>
  );
}

export function VocabularyMindmapSelectionPage() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <main className={styles.page}>
        <header className={styles.header}>
          <p className={styles.kicker}>Học từ vựng</p>
          <h1>Chọn chủ đề để bắt đầu</h1>
          <p className={styles.intro}>Chọn một nhánh, học từng từ, rồi quay lại ôn đúng lúc.</p>
        </header>
        <SelectionContent />
      </main>
    </QueryClientProvider>
  );
}
