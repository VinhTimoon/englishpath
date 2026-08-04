"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createLocalSession } from "@/features/auth/model/auth-session";
import { requestLearnerApi } from "@/shared/api/learner-api-client";
import styles from "./learner-entry.module.css";

type Mode = "login" | "register" | "recovery";

export function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "")
      .trim()
      .toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMessage("Email chưa hợp lệ.");
    if (mode === "recovery") {
      setMessage(
        "Đã ghi nhận yêu cầu. Khi Supabase được kết nối, email khôi phục sẽ được gửi tự động.",
      );
      return;
    }
    const password = String(data.get("password") ?? "");
    if (password.length < 8) return setMessage("Mật khẩu cần ít nhất 8 ký tự.");
    if ((process.env.NEXT_PUBLIC_AUTH_MODE ?? "local") !== "local") {
      return setMessage(
        "Supabase browser SDK đang chờ phê duyệt để kết nối production.",
      );
    }
    setBusy(true);
    createLocalSession(email);
    try {
      await requestLearnerApi("/auth/bootstrap", { method: "POST" });
      router.push("/onboarding");
    } catch {
      setMessage(
        "API local chưa sẵn sàng. Hãy kiểm tra BE port 3005 và PostgreSQL.",
      );
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link className={styles.brand} href="/">
            English<span>Path</span>
          </Link>
          <span className={styles.progress}>Bắt đầu hành trình</span>
        </header>
        <section className={styles.panel}>
          <aside className={styles.aside}>
            <p>Học có định hướng</p>
            <h1>Một lộ trình vừa sức, bắt đầu từ bạn.</h1>
            <p>
              Đăng nhập, cho chúng tôi biết mục tiêu và làm bài đánh giá ngắn.
              Không quảng cáo, không ép mua gói.
            </p>
          </aside>
          <div className={styles.content}>
            <h2>
              {mode === "login"
                ? "Chào bạn trở lại"
                : mode === "register"
                  ? "Tạo tài khoản miễn phí"
                  : "Khôi phục mật khẩu"}
            </h2>
            <p className={styles.intro}>
              Chỉ mất vài phút để có điểm xuất phát phù hợp.
            </p>
            <form className={styles.form} onSubmit={submit}>
              <label className={styles.field}>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
              {mode !== "recovery" && (
                <label className={styles.field}>
                  Mật khẩu
                  <input
                    name="password"
                    type="password"
                    minLength={8}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    required
                  />
                </label>
              )}
              {message && (
                <p
                  className={
                    message.startsWith("Đã") ? styles.success : styles.error
                  }
                  role="status"
                >
                  {message}
                </p>
              )}
              <button className={styles.action} disabled={busy}>
                {busy
                  ? "Đang chuẩn bị..."
                  : mode === "login"
                    ? "Đăng nhập"
                    : mode === "register"
                      ? "Tạo tài khoản"
                      : "Gửi yêu cầu"}
              </button>
            </form>
            <p>
              <button
                className={styles.secondary}
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
              >
                {mode === "login"
                  ? "Chưa có tài khoản? Đăng ký"
                  : "Quay lại đăng nhập"}
              </button>
            </p>
            {mode === "login" && (
              <button
                className={styles.secondary}
                type="button"
                onClick={() => setMode("recovery")}
              >
                Quên mật khẩu?
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
