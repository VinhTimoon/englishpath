"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AdminApiError,
  getAdminOverview,
} from "@/features/admin/api/get-admin-overview";
import type { AdminOverview } from "@/features/admin/model/admin-overview";
import { CmsWorkspace } from "./cms-workspace";
import { getAiOperations } from "@/features/admin/api/get-ai-operations";
import type { AiOperations } from "@/features/admin/model/ai-operations";
import styles from "./admin-shell.module.css";

type AdminState =
  | { kind: "loading" }
  | { kind: "success"; data: AdminOverview }
  | { kind: "unauthorized" }
  | { kind: "forbidden" }
  | { kind: "error" };

export function AdminShell() {
  const [state, setState] = useState<AdminState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    getAdminOverview({ signal: controller.signal })
      .then((data) => setState({ kind: "success", data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof AdminApiError && error.status === 401) {
          setState({ kind: "unauthorized" });
          return;
        }
        if (error instanceof AdminApiError && error.status === 403) {
          setState({ kind: "forbidden" });
          return;
        }
        setState({ kind: "error" });
      });
    return () => controller.abort();
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link className={styles.brand} href="/">
            English<span>Path</span>
          </Link>
          <Link className={styles.backLink} href="/dashboard">
            Về dashboard
          </Link>
        </header>

        <section className={styles.content} aria-labelledby="admin-title">
          <p className={styles.eyebrow}>Khu vực được bảo vệ</p>
          <h1 id="admin-title">Vận hành an toàn, rõ ràng</h1>
          <p className={styles.intro}>
            Đây là lớp vận hành nền tảng. Nội dung và xuất bản chỉ xuất hiện sau
            khi quy trình CMS được phê duyệt riêng.
          </p>

          {state.kind === "loading" && (
            <div className={styles.panel} role="status" aria-live="polite">
              <span className={styles.skeleton} aria-hidden="true" />
              Đang kiểm tra quyền truy cập…
            </div>
          )}

          {state.kind === "unauthorized" && (
            <div className={styles.panel} role="alert">
              <h2>Vui lòng đăng nhập</h2>
              <p>Phiên đăng nhập chưa có hoặc đã hết hạn.</p>
              <Link className={styles.primary} href="/auth">
                Đăng nhập
              </Link>
            </div>
          )}

          {state.kind === "forbidden" && (
            <div className={styles.panel} role="alert">
              <h2>Bạn chưa có quyền vận hành</h2>
              <p>
                Quyền này được quyết định ở backend theo vai trò ứng dụng, không
                theo thông tin do trình duyệt tự khai báo.
              </p>
              <Link className={styles.secondary} href="/dashboard">
                Quay lại việc học
              </Link>
            </div>
          )}

          {state.kind === "error" && (
            <div className={styles.panel} role="alert">
              <h2>Chưa tải được khu vực vận hành</h2>
              <p>Hệ thống chưa xác nhận được trạng thái. Hãy thử lại sau.</p>
              <button
                className={styles.secondary}
                type="button"
                onClick={() => window.location.reload()}
              >
                Thử lại
              </button>
            </div>
          )}

          {state.kind === "success" && <SuccessOverview data={state.data} />}
        </section>
      </div>
    </main>
  );
}

function SuccessOverview({ data }: { data: AdminOverview }) {
  return (
    <div className={styles.successStack}>
      <div className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
            <p className={styles.label}>Vai trò backend</p>
            <h2>{roleLabel(data.role)}</h2>
          </div>
          <span className={styles.badge}>Đã xác thực</span>
        </div>
        <p className={styles.muted}>
          Bạn đang thấy đúng phạm vi được cấp. Không có thao tác CMS hay xuất
          bản trong màn hình này.
        </p>
      </div>

      {data.role !== "CONTENT_EDITOR" && data.operationalSummary && (
        <div className={styles.metrics} aria-label="Tóm tắt vận hành">
          <article className={styles.metric}>
            <span>Người dùng hoạt động</span>
            <strong>{data.operationalSummary.activeUsers}</strong>
          </article>
          <article className={styles.metric}>
            <span>Phân quyền đang hoạt động</span>
            <strong>{data.operationalSummary.activeRoleAssignments}</strong>
          </article>
        </div>
      )}

      {data.role === "CONTENT_EDITOR" && (
        <div className={styles.panel} role="status">
          <h2>Editor shell ready</h2>
          <p className={styles.muted}>
            Operational counts are reserved for the admin role. CMS actions use
            the dedicated governed workspace below.
          </p>
        </div>
      )}
      <CmsWorkspace role={data.role} />
      <AiOperationsPanel />
      <p>
        <Link className={styles.secondary} href="/admin/library">
          Open library inventory
        </Link>
      </p>
    </div>
  );
}

function AiOperationsPanel() {
  type OperationsState =
    | { kind: "loading" }
    | { kind: "success"; data: AiOperations }
    | { kind: "unauthorized" }
    | { kind: "forbidden" }
    | { kind: "error" };
  const [state, setState] = useState<OperationsState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getAiOperations({ signal: controller.signal })
      .then((data) => setState({ kind: "success", data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof AdminApiError && error.status === 401) {
          setState({ kind: "unauthorized" });
          return;
        }
        if (error instanceof AdminApiError && error.status === 403) {
          setState({ kind: "forbidden" });
          return;
        }
        setState({ kind: "error" });
      });
    return () => controller.abort();
  }, [attempt]);

  if (state.kind === "loading") {
    return (
      <div className={styles.panel} role="status" aria-live="polite">
        <span className={styles.skeleton} aria-hidden="true" />
        Loading AI operations…
      </div>
    );
  }
  if (state.kind === "unauthorized") {
    return (
      <div className={styles.panel} role="alert">
        <h2>Sign in required</h2>
        <p>The operations projection requires an active admin session.</p>
      </div>
    );
  }
  if (state.kind === "forbidden") {
    return (
      <div className={styles.panel} role="alert">
        <h2>Operations access is restricted</h2>
        <p>Your backend role cannot read this projection.</p>
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className={styles.panel} role="alert">
        <h2>AI operations unavailable</h2>
        <p>Retry later; no sensitive usage details are shown.</p>
        <button
          className={styles.secondary}
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Retry
        </button>
      </div>
    );
  }
  const data = state.data!;
  return (
    <section className={styles.panel} aria-labelledby="ai-operations-title">
      <p className={styles.label}>Server-owned projection · last 24 hours</p>
      <h2 id="ai-operations-title">AI gateway operations</h2>
      {data.totals.requests === 0 ? (
        <p role="status">No persisted AI usage in this window.</p>
      ) : (
        <div className={styles.metrics} aria-label="AI usage totals">
          <article className={styles.metric}>
            <span>Requests</span>
            <strong>{data.totals.requests}</strong>
          </article>
          <article className={styles.metric}>
            <span>Allowed</span>
            <strong>{data.totals.allowed}</strong>
          </article>
          <article className={styles.metric}>
            <span>Denied / quota</span>
            <strong>{data.totals.quotaDenials}</strong>
          </article>
          <article className={styles.metric}>
            <span>Unavailable</span>
            <strong>{data.totals.unavailable}</strong>
          </article>
        </div>
      )}
      <div className={styles.muted}>
        <p>
          Estimated cost:{" "}
          {data.totals.estimatedCostMicros === 0
            ? "0 (local/no-op)"
            : "non-zero aggregate"}
          .
        </p>
        <p>
          Replay and abuse signals: unavailable. These are operational signals,
          not proof of wrongdoing.
        </p>
      </div>
      <div
        className={styles.metrics}
        aria-label="AI feature and skill summaries"
      >
        <article className={styles.metric}>
          <span>Features</span>
          <span>
            {data.featureSummary
              .map((group) => `${group.key}: ${group.count}`)
              .join(", ") || "None"}
          </span>
        </article>
        <article className={styles.metric}>
          <span>Skills</span>
          <span>
            {data.skillSummary
              .map((group) => `${group.key}: ${group.count}`)
              .join(", ") || "None"}
          </span>
        </article>
      </div>
    </section>
  );
}

function roleLabel(role: AdminOverview["role"]) {
  return {
    CONTENT_EDITOR: "Content Editor",
    ADMIN: "Admin",
    SUPER_ADMIN: "Super Admin",
  }[role];
}
