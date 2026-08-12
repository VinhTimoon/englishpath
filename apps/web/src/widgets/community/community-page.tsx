"use client";

import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import {
  moderationDecisions,
  postDraftSchema,
  reportReasons,
  type ModerationDecision,
  type MutationResult,
  type PostDraft,
  type ReportReason,
} from "@/entities/community/model/community";
import {
  createPostMutation,
  communityPostsQuery,
  decidePostMutation,
  moderationQueueQuery,
  reportPostMutation,
} from "@/features/community/api/community-api";
import {
  createMutationAttempt,
  type MutationAttempt,
} from "@/features/community/model/mutation-attempt";
import {
  learnerApiRequiresAuth,
  learnerApiStatus,
} from "@/shared/api/learner-api-client";
import { readSession } from "@/features/auth/model/auth-session";
import styles from "./community-page.module.css";

const PAGE_SIZE = 10;
type SafeMutationState =
  | (MutationResult & { serverStatus?: "PENDING_REVIEW" })
  | { kind: "conflict" | "unavailable" | "error" };
const reasonLabels: Record<ReportReason, string> = {
  SPAM: "Thư rác",
  HARASSMENT: "Quấy rối",
  HARMFUL_CONTENT: "Nội dung gây hại",
  COPYRIGHT: "Bản quyền",
  OTHER: "Lý do khác",
};
const decisionLabels: Record<ModerationDecision, string> = {
  PUBLISH: "Đăng",
  REJECT: "Từ chối",
  ARCHIVE: "Lưu trữ",
};

function safeMutationError(
  error: unknown,
  unavailable = false,
): SafeMutationState {
  const status = learnerApiStatus(error);
  if (status === 409) return { kind: "conflict" };
  if (unavailable && (status === 404 || status === 422))
    return { kind: "unavailable" };
  return { kind: "error" };
}

function isAllowedReportReason(value: string): value is ReportReason {
  return (reportReasons as readonly string[]).includes(value);
}

function isAllowedModerationDecision(
  value: string,
): value is ModerationDecision {
  return (moderationDecisions as readonly string[]).includes(value);
}

function Status({ state }: { state?: SafeMutationState }) {
  if (!state) return null;
  const copy = {
    created:
      state.kind === "created" && state.serverStatus === "PENDING_REVIEW"
        ? "Bài viết đã được máy chủ tiếp nhận với trạng thái PENDING_REVIEW và đang chờ xét duyệt."
        : "Máy chủ đã ghi nhận yêu cầu.",
    replayed:
      state.kind === "replayed" && state.serverStatus === "PENDING_REVIEW"
        ? "Bài viết PENDING_REVIEW đã được khôi phục từ kết quả trước đó của máy chủ và đang chờ xét duyệt."
        : "Kết quả trước đó từ máy chủ đã được khôi phục.",
    conflict:
      "Yêu cầu xung đột với trạng thái hiện tại. Nội dung của bạn vẫn được giữ.",
    unavailable:
      "Nội dung này hiện không khả dụng. Không có thêm thông tin được tiết lộ.",
    error: "Chưa thể gửi yêu cầu. Bạn có thể thử lại an toàn.",
  }[state.kind];
  return (
    <p className={styles.status} role="status">
      {copy}
    </p>
  );
}

function Pager({
  offset,
  total,
  hasNext,
  onChange,
}: {
  offset: number;
  total: number;
  hasNext: boolean;
  onChange: (offset: number) => void;
}) {
  return (
    <nav className={styles.pager} aria-label="Phân trang">
      <button
        type="button"
        disabled={offset === 0}
        onClick={() => onChange(Math.max(0, offset - PAGE_SIZE))}
      >
        Trang trước
      </button>
      <span>
        Đang xem {total === 0 ? 0 : offset + 1}–
        {Math.min(offset + PAGE_SIZE, total)} / {total}
      </span>
      <button
        type="button"
        disabled={!hasNext}
        onClick={() => onChange(offset + PAGE_SIZE)}
      >
        Trang sau
      </button>
    </nav>
  );
}

function AuthState() {
  return (
    <section className={styles.notice}>
      <h2>Cần đăng nhập</h2>
      <p>Đăng nhập để đọc và chia sẻ cùng cộng đồng.</p>
      <Link className={styles.linkButton} href="/auth">
        Đi đến đăng nhập
      </Link>
    </section>
  );
}

function Composer() {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<PostDraft>({ defaultValues: { title: "", body: "" } });
  const mutation = useMutation(createPostMutation());
  const [active, setActive] = useState<MutationAttempt<PostDraft> | null>(null);
  const [state, setState] = useState<SafeMutationState>();
  const submitAttempt = (attempt: MutationAttempt<PostDraft>) => {
    setActive(attempt);
    setState(undefined);
    mutation.mutate(
      { draft: attempt.input, key: attempt.key },
      {
        onSuccess: (value) => {
          setActive((current) => {
            if (current?.id !== attempt.id) return current;
            setState({
              kind: value.meta.idempotencyStatus,
              serverStatus: value.data.status,
            });
            reset();
            return null;
          });
        },
        onError: (error) =>
          setActive((current) => {
            if (current?.id === attempt.id) setState(safeMutationError(error));
            return current;
          }),
      },
    );
  };
  const onSubmit = (raw: PostDraft) => {
    const parsed = postDraftSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        setError(issue.path[0] as keyof PostDraft, { message: issue.message });
      return;
    }
    submitAttempt(createMutationAttempt(parsed.data));
  };
  return (
    <section className={styles.composer} aria-labelledby="share-heading">
      <div>
        <p className={styles.kicker}>Chia sẻ có kiểm duyệt</p>
        <h2 id="share-heading">Gửi bài viết</h2>
        <p>Bài viết sẽ chờ máy chủ xét duyệt trước khi xuất hiện.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <label htmlFor="community-title">Tiêu đề</label>
        <input
          id="community-title"
          aria-describedby="title-help title-error"
          {...register("title")}
        />
        <small id="title-help">1–120 ký tự</small>
        {errors.title && (
          <p id="title-error" className={styles.fieldError}>
            {errors.title.message}
          </p>
        )}
        <label htmlFor="community-body">Nội dung</label>
        <textarea
          id="community-body"
          maxLength={5000}
          rows={6}
          aria-describedby="body-help body-error"
          {...register("body")}
        />
        <small id="body-help">1–5.000 ký tự</small>
        {errors.body && (
          <p id="body-error" className={styles.fieldError}>
            {errors.body.message}
          </p>
        )}
        <div className={styles.actions}>
          <button type="submit" disabled={mutation.isPending}>
            {" "}
            {mutation.isPending ? "Đang gửi…" : "Gửi xét duyệt"}
          </button>
          {state?.kind === "error" && active && (
            <button
              type="button"
              onClick={() => submitAttempt(active)}
              disabled={mutation.isPending}
            >
              Thử lại
            </button>
          )}
        </div>
        <Status state={state} />
      </form>
    </section>
  );
}

function ReportControl({ postId }: { postId: string }) {
  const mutation = useMutation(reportPostMutation());
  const [active, setActive] = useState<MutationAttempt<{
    reason: ReportReason;
  }> | null>(null);
  const [reason, setReason] = useState<ReportReason>("SPAM");
  const [state, setState] = useState<SafeMutationState>();
  const send = (attempt: MutationAttempt<{ reason: ReportReason }>) => {
    setActive(attempt);
    setState(undefined);
    mutation.mutate(
      { postId, reason: attempt.input.reason, key: attempt.key },
      {
        onSuccess: (value) =>
          setActive((current) => {
            if (current?.id === attempt.id) {
              setState({ kind: value.meta.idempotencyStatus });
              return null;
            }
            return current;
          }),
        onError: (error) =>
          setActive((current) => {
            if (current?.id === attempt.id)
              setState(safeMutationError(error, true));
            return current;
          }),
      },
    );
  };
  return (
    <div className={styles.report}>
      <label htmlFor={`reason-${postId}`}>Lý do báo cáo</label>
      <div className={styles.inline}>
        <select
          id={`reason-${postId}`}
          value={reason}
          onChange={(event) => {
            if (isAllowedReportReason(event.target.value))
              setReason(event.target.value);
          }}
          disabled={mutation.isPending}
        >
          {reportReasons.map((item) => (
            <option key={item} value={item}>
              {reasonLabels[item]}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => send(createMutationAttempt({ reason }))}
        >
          {mutation.isPending ? "Đang gửi…" : "Báo cáo"}
        </button>
      </div>
      {(state?.kind === "error" || state?.kind === "unavailable") && active && (
        <button
          className={styles.retryLink}
          type="button"
          disabled={mutation.isPending}
          onClick={() => send(active)}
        >
          Thử lại yêu cầu
        </button>
      )}
      <Status state={state} />
    </div>
  );
}

function PublishedPosts() {
  const [offset, setOffset] = useState(0);
  const query = useQuery(communityPostsQuery(PAGE_SIZE, offset));
  if (query.isLoading)
    return (
      <section aria-label="Đang tải bài viết">
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </section>
    );
  if (
    query.error &&
    (learnerApiRequiresAuth(query.error) ||
      learnerApiStatus(query.error) === 401)
  )
    return <AuthState />;
  if (query.error)
    return (
      <section className={styles.notice}>
        <h2>Chưa tải được cộng đồng</h2>
        <p>Dữ liệu không hợp lệ hoặc kết nối tạm gián đoạn.</p>
        <button onClick={() => void query.refetch()}>Thử lại</button>
      </section>
    );
  if (!query.data) return null;
  return (
    <section aria-labelledby="posts-heading">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.kicker}>Bài đã xuất bản</p>
          <h2 id="posts-heading">Góc học cùng nhau</h2>
        </div>
        <p>Chỉ hiển thị nội dung máy chủ đã cho phép.</p>
      </div>
      {query.data.data.length === 0 ? (
        <div className={styles.notice}>
          <h3>Chưa có bài viết</h3>
          <p>Hãy gửi chia sẻ đầu tiên để đội ngũ xét duyệt.</p>
        </div>
      ) : (
        <div className={styles.posts}>
          {query.data.data.map((post) => (
            <article key={post.id} className={styles.post}>
              <p className={styles.date}>
                Xuất bản{" "}
                {new Intl.DateTimeFormat("vi-VN", {
                  dateStyle: "medium",
                }).format(new Date(post.publishedAt))}
              </p>
              <h3>{post.title}</h3>
              <p className={styles.body}>{post.body}</p>
              <ReportControl postId={post.id} />
            </article>
          ))}
        </div>
      )}
      <Pager
        offset={offset}
        total={query.data.meta.pagination.total}
        hasNext={query.data.meta.pagination.hasNext}
        onChange={setOffset}
      />
    </section>
  );
}

function DecisionControl({ postId }: { postId: string }) {
  const mutation = useMutation(decidePostMutation());
  const [lastAttempt, setLastAttempt] = useState<MutationAttempt<{
    decision: ModerationDecision;
  }> | null>(null);
  const [decision, setDecision] = useState<ModerationDecision>("PUBLISH");
  const [state, setState] = useState<SafeMutationState>();
  const send = (attempt: MutationAttempt<{ decision: ModerationDecision }>) => {
    setLastAttempt(attempt);
    setState(undefined);
    mutation.mutate(
      { postId, decision: attempt.input.decision, key: attempt.key },
      {
        onSuccess: (value) =>
          setLastAttempt((current) => {
            if (current?.id === attempt.id) {
              setState({ kind: value.meta.idempotencyStatus });
            }
            return current;
          }),
        onError: (error) =>
          setLastAttempt((current) => {
            if (current?.id === attempt.id) setState(safeMutationError(error));
            return current;
          }),
      },
    );
  };
  return (
    <div className={styles.report}>
      <label htmlFor={`decision-${postId}`}>Quyết định</label>
      <div className={styles.inline}>
        <select
          id={`decision-${postId}`}
          value={decision}
          onChange={(event) => {
            if (isAllowedModerationDecision(event.target.value))
              setDecision(event.target.value);
          }}
          disabled={mutation.isPending}
        >
          {moderationDecisions.map((item) => (
            <option key={item} value={item}>
              {decisionLabels[item]}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => send(createMutationAttempt({ decision }))}
        >
          {mutation.isPending ? "Đang xử lý…" : "Áp dụng"}
        </button>
      </div>
      {(state?.kind === "error" || state?.kind === "conflict") &&
        lastAttempt && (
          <button
            className={styles.retryLink}
            type="button"
            disabled={mutation.isPending}
            onClick={() => send(lastAttempt)}
          >
            Thử lại quyết định
          </button>
        )}
      <Status state={state} />
    </div>
  );
}

function ModerationQueue() {
  const [offset, setOffset] = useState(0);
  const query = useQuery(moderationQueueQuery(PAGE_SIZE, offset));
  if (query.isLoading)
    return (
      <section
        className={styles.moderation}
        aria-label="Đang kiểm tra quyền kiểm duyệt"
      >
        <div className={styles.skeleton} />
      </section>
    );
  const status = learnerApiStatus(query.error);
  if (
    query.error &&
    (learnerApiRequiresAuth(query.error) ||
      learnerApiStatus(query.error) === 401)
  )
    return (
      <section className={`${styles.notice} ${styles.moderation}`}>
        <h2>Cần đăng nhập để kiểm duyệt</h2>
        <p>Đăng nhập lại để máy chủ kiểm tra quyền truy cập hàng đợi.</p>
        <Link className={styles.linkButton} href="/auth">
          Đi đến đăng nhập
        </Link>
      </section>
    );
  if (status === 403)
    return (
      <section className={`${styles.notice} ${styles.moderation}`}>
        <h2>Khu vực kiểm duyệt</h2>
        <p>
          Quyền truy cập do máy chủ kiểm soát. Tài khoản này không có quyền xem
          hàng đợi.
        </p>
      </section>
    );
  if (query.error)
    return (
      <section className={`${styles.notice} ${styles.moderation}`}>
        <h2>Chưa tải được hàng đợi</h2>
        <p>Không hiển thị dữ liệu kiểm duyệt khi phản hồi không an toàn.</p>
        <button onClick={() => void query.refetch()}>Thử lại</button>
      </section>
    );
  if (!query.data) return null;
  return (
    <section className={styles.moderation} aria-labelledby="moderation-heading">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.kicker}>Quyền do máy chủ xác nhận</p>
          <h2 id="moderation-heading">Hàng đợi kiểm duyệt</h2>
        </div>
        <p>Quyết định chỉ có hiệu lực sau phản hồi máy chủ.</p>
      </div>
      {query.data.data.length === 0 ? (
        <div className={styles.notice}>
          <h3>Hàng đợi trống</h3>
          <p>Hiện không có nội dung cần xử lý.</p>
        </div>
      ) : (
        <div className={styles.posts}>
          {query.data.data.map((post) => (
            <article className={styles.post} key={post.id}>
              <p className={styles.date}>
                {post.status === "FLAGGED"
                  ? "Đã được báo cáo"
                  : "Đang chờ duyệt"}{" "}
                · {post.reportCount} báo cáo
              </p>
              <h3>{post.title}</h3>
              <p className={styles.body}>{post.body}</p>
              {post.reasons.length > 0 && (
                <p>
                  <strong>Nhóm lý do:</strong>{" "}
                  {post.reasons
                    .map((reason) => reasonLabels[reason])
                    .join(", ")}
                </p>
              )}
              <DecisionControl postId={post.id} />
            </article>
          ))}
        </div>
      )}
      <Pager
        offset={offset}
        total={query.data.meta.pagination.total}
        hasNext={query.data.meta.pagination.hasNext}
        onChange={setOffset}
      />
    </section>
  );
}

function CommunitySurface() {
  const authenticated = useSyncExternalStore(
    () => () => undefined,
    () => Boolean(readSession()),
    () => false,
  );
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <Link href="/" className={styles.brand}>
            English<span>Path</span>
          </Link>
          <div>
            <p className={styles.kicker}>Cộng đồng học tập an toàn</p>
            <h1>Chia sẻ điều bạn vừa học.</h1>
            <p>
              Đọc kinh nghiệm đã xuất bản, gửi ghi chú để xét duyệt và giúp giữ
              không gian hữu ích.
            </p>
          </div>
        </header>
        {authenticated ? <Composer /> : <AuthState />}
        <PublishedPosts />
        <ModerationQueue />
      </div>
    </main>
  );
}

export function CommunityPage() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <CommunitySurface />
    </QueryClientProvider>
  );
}
