"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AdminApiError,
  getAdminOverview,
} from "@/features/admin/api/get-admin-overview";
import type { AdminOverview } from "@/features/admin/model/admin-overview";
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
            Operational counts are reserved for the admin role. CMS and
            publication actions are intentionally not available in this slice.
          </p>
        </div>
      )}
    </div>
  );
}

function roleLabel(role: AdminOverview["role"]) {
  return {
    CONTENT_EDITOR: "Content Editor",
    ADMIN: "Admin",
    SUPER_ADMIN: "Super Admin",
  }[role];
}
