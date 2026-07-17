"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { requestLearnerApi } from "@/shared/api/learner-api-client";
import styles from "./learner-entry.module.css";

type Question = {
  id: string;
  skill: string;
  prompt: string;
  options: { id: string; label: string }[];
};
type Envelope<T> = { data: T };

export function PlacementPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [clientSubmissionId] = useState(
    () => `placement-${crypto.randomUUID()}`,
  );

  useEffect(() => {
    requestLearnerApi<Envelope<Question[]>>("/placement/questions")
      .then(({ data }) => setQuestions(data))
      .catch(() => setError("Chưa thể tải bài đánh giá."));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const answers = questions.map(({ id }) => ({
      questionId: id,
      optionId: String(form.get(id) ?? ""),
    }));
    if (answers.some(({ optionId }) => !optionId)) {
      setError("Hãy trả lời đủ 10 câu trước khi nộp.");
      setBusy(false);
      return;
    }
    try {
      await requestLearnerApi("/placement/submissions", {
        method: "POST",
        body: { clientSubmissionId, answers },
      });
      router.push("/dashboard");
    } catch {
      setError("Chưa thể chấm bài. Câu trả lời của bạn vẫn còn trên màn hình.");
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
          <span className={styles.progress}>Bước 2 / 2</span>
        </header>
        <section className={styles.panel}>
          <aside className={styles.aside}>
            <p>Placement cơ bản</p>
            <h1>10 câu để chọn điểm bắt đầu.</h1>
            <p>
              Kết quả chỉ dùng để điều chỉnh độ khó. Bạn có thể học lại phần nền
              tảng bất cứ lúc nào.
            </p>
          </aside>
          <div className={styles.content}>
            <h2>Bài đánh giá nhanh</h2>
            <p className={styles.intro}>
              Không dùng từ điển. Chọn đáp án gần nhất với hiểu biết hiện tại.
            </p>
            {!questions.length && !error && (
              <p role="status">Đang tải câu hỏi...</p>
            )}
            <form className={styles.form} onSubmit={submit}>
              {questions.map((question, index) => (
                <fieldset className={styles.question} key={question.id}>
                  <small>
                    {question.skill} · {index + 1}/10
                  </small>
                  <legend>{question.prompt}</legend>
                  {question.options.map((option) => (
                    <label className={styles.choice} key={option.id}>
                      <input
                        required
                        type="radio"
                        name={question.id}
                        value={option.id}
                      />
                      {option.label}
                    </label>
                  ))}
                </fieldset>
              ))}
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              {questions.length > 0 && (
                <button className={styles.action} disabled={busy}>
                  {busy ? "Đang chấm..." : "Xem kết quả của tôi"}
                </button>
              )}
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
