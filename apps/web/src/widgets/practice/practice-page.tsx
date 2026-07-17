"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { requestLearnerApi } from "@/shared/api/learner-api-client";
import styles from "./practice.module.css";

type Question = { id: string; prompt: string; options: { id: string; label: string }[] };
type Session = { id: string; status: string; score: number; total: number; xpAwarded: number; streakDays: number; errors: { questionId: string; prompt: string; explanation: string }[] };
type Feedback = { isCorrect: boolean; explanation: string };
type Envelope<T> = { data: T };

function dailyClientId() {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const key = `englishpath.practice.${day}`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = `practice-${crypto.randomUUID()}`;
  localStorage.setItem(key, created);
  return created;
}

export function PracticePage() {
  const [clientId] = useState(() =>
    typeof window === "undefined" ? "" : dailyClientId(),
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!clientId) return;
    requestLearnerApi<Envelope<{ session: Session; questions: Question[] }>>("/quiz/session", { method: "POST", body: { clientSessionId: clientId } })
      .then(({ data }) => { setSession(data.session); setQuestions(data.questions); })
      .catch(() => setError("Chưa thể bắt đầu phiên học."));
  }, [clientId]);

  async function answer(optionId: string) {
    if (!session) return;
    setBusy(true);
    try {
      const { data } = await requestLearnerApi<Envelope<{ session: Session; feedback: Feedback }>>(`/quiz/session/${session.id}/answer`, { method: "POST", body: { questionId: questions[index].id, selectedOption: optionId } });
      setSession(data.session); setFeedback(data.feedback);
    } catch { setError("Chưa thể lưu câu trả lời."); }
    finally { setBusy(false); }
  }

  async function next() {
    setFeedback(null);
    if (index < questions.length - 1) { setIndex((value) => value + 1); return; }
    if (!session) return;
    setBusy(true);
    try {
      const { data } = await requestLearnerApi<Envelope<Session>>(`/quiz/session/${session.id}/submit`, { method: "POST" });
      setSession(data);
    } catch { setError("Chưa thể tổng kết phiên học."); }
    finally { setBusy(false); }
  }

  const finished = session?.status === "SUBMITTED";
  const question = questions[index];
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}><Link className={styles.brand} href="/dashboard">EnglishPath</Link><Link className={styles.secondary} href="/dashboard">Dashboard</Link></header>
    <section className={styles.card}>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!question && !error && <p role="status">Đang chuẩn bị 5 câu luyện tập...</p>}
      {question && !finished && <>
        <p className={styles.eyebrow}>Câu {index + 1} / {questions.length}</p><h1>{question.prompt}</h1>
        <div className={styles.progress}><span style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>
        <div className={styles.options}>{question.options.map((option) => <button className={styles.option} disabled={busy || !!feedback} key={option.id} onClick={() => answer(option.id)}>{option.label}</button>)}</div>
        {feedback && <div className={`${styles.feedback} ${feedback.isCorrect ? "" : styles.wrong}`}><strong>{feedback.isCorrect ? "Chính xác" : "Chưa đúng"}</strong><p>{feedback.explanation}</p><button className={styles.button} onClick={next}>{index === questions.length - 1 ? "Xem tổng kết" : "Câu tiếp theo"}</button></div>}
      </>}
      {finished && session && <>
        <p className={styles.eyebrow}>Phiên học hoàn thành</p><h1>Bạn đã học thật hôm nay.</h1>
        <div className={styles.result}><div className={styles.stat}><strong>{session.score}/{session.total}</strong><span>Chính xác</span></div><div className={styles.stat}><strong>+{session.xpAwarded}</strong><span>XP</span></div><div className={styles.stat}><strong>{session.streakDays}</strong><span>Ngày streak</span></div></div>
        {session.errors.length > 0 && <><h2>Cần xem lại</h2><ul className={styles.errors}>{session.errors.map((entry) => <li className={styles.feedback} key={entry.questionId}><strong>{entry.prompt}</strong><p>{entry.explanation}</p></li>)}</ul></>}
        <div className={styles.actions}><Link className={styles.button} href="/dashboard">Về dashboard</Link><Link className={styles.secondary} href="/roadmap">Xem lộ trình</Link></div>
      </>}
    </section>
  </div></main>;
}
