"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { requestLearnerApi } from "@/shared/api/learner-api-client";
import styles from "./learner-entry.module.css";

const goals = [
  ["ENGLISH_FOUNDATION", "Xây lại nền tảng"],
  ["DAILY_COMMUNICATION", "Giao tiếp hằng ngày"],
  ["FOUR_SKILL_ENGLISH", "Tiếng Anh bốn kỹ năng"],
  ["WORKPLACE_ENGLISH", "Tiếng Anh công việc"],
  ["TOEIC_LISTENING_READING", "TOEIC Nghe & Đọc"],
  ["TOEIC_SPEAKING_WRITING", "TOEIC Nói & Viết"],
  ["TOEIC_FOUR_SKILLS", "TOEIC bốn kỹ năng"],
] as const;
const skills = [
  ["VOCABULARY", "Từ vựng"],
  ["GRAMMAR", "Ngữ pháp"],
  ["LISTENING", "Nghe"],
  ["READING", "Đọc"],
  ["SPEAKING", "Nói"],
  ["WRITING", "Viết"],
] as const;

export function OnboardingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("ENGLISH_FOUNDATION");
  const [prioritySkills, setPrioritySkills] = useState<string[]>([]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const body = {
      primaryGoal: String(data.get("primaryGoal")),
      secondaryGoals: data.getAll("secondaryGoals").map(String),
      currentLevel: String(data.get("currentLevel")),
      dailyMinutes: Number(data.get("dailyMinutes")),
      targetDays: Number(data.get("targetDays")),
      prioritySkills: data.getAll("prioritySkills").map(String),
    };
    try {
      await requestLearnerApi("/onboarding", { method: "PATCH", body });
      router.push("/placement-test");
    } catch {
      setError("Chưa thể lưu lựa chọn. Kiểm tra API rồi thử lại.");
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
          <span className={styles.progress}>Bước 1 / 2</span>
        </header>
        <section className={styles.panel}>
          <aside className={styles.aside}>
            <p>Thiết kế lộ trình</p>
            <h1>Bạn muốn tiến bộ điều gì trước?</h1>
            <p>
              Một mục tiêu chính giúp lộ trình tập trung. Bạn vẫn có thể chọn
              thêm tối đa hai hướng phụ.
            </p>
          </aside>
          <div className={styles.content}>
            <h2>Hồ sơ học tập</h2>
            <p className={styles.intro}>
              Không có câu trả lời đúng. Hãy chọn nhịp học bạn có thể duy trì.
            </p>
            <form className={styles.form} onSubmit={submit}>
              <label className={styles.field}>
                Mục tiêu chính
                <select
                  name="primaryGoal"
                  value={primaryGoal}
                  onChange={(event) => setPrimaryGoal(event.target.value)}
                >
                  {goals.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend>Mục tiêu phụ (không bắt buộc)</legend>
                <div className={styles.choiceGrid}>
                  {goals
                    .filter(([value]) => value !== primaryGoal)
                    .map(([value, label]) => (
                    <label className={styles.choice} key={value}>
                      <input
                        type="checkbox"
                        name="secondaryGoals"
                        value={value}
                      />
                      {label}
                    </label>
                    ))}
                </div>
              </fieldset>
              <label className={styles.field}>
                Trình độ tự đánh giá
                <select name="currentLevel" defaultValue="BEGINNER">
                  <option value="BEGINNER">Mới bắt đầu</option>
                  <option value="ELEMENTARY">Cơ bản</option>
                  <option value="INTERMEDIATE">Trung cấp</option>
                  <option value="UPPER_INTERMEDIATE">Khá</option>
                  <option value="ADVANCED">Nâng cao</option>
                </select>
              </label>
              <div className={styles.choiceGrid}>
                <label className={styles.field}>
                  Phút mỗi ngày
                  <select name="dailyMinutes" defaultValue="20">
                    <option value="10">10 phút</option>
                    <option value="20">20 phút</option>
                    <option value="30">30 phút</option>
                    <option value="60">60 phút</option>
                  </select>
                </label>
                <label className={styles.field}>
                  Độ dài lộ trình
                  <select name="targetDays" defaultValue="90">
                    <option value="30">30 ngày</option>
                    <option value="60">60 ngày</option>
                    <option value="90">90 ngày</option>
                    <option value="120">120 ngày</option>
                  </select>
                </label>
              </div>
              <fieldset>
                <legend>Kỹ năng ưu tiên (tối đa 3)</legend>
                <div className={styles.choiceGrid}>
                  {skills.map(([value, label]) => (
                    <label className={styles.choice} key={value}>
                      <input
                        type="checkbox"
                        name="prioritySkills"
                        value={value}
                        checked={prioritySkills.includes(value)}
                        disabled={
                          prioritySkills.length >= 3 &&
                          !prioritySkills.includes(value)
                        }
                        onChange={(event) =>
                          setPrioritySkills((selected) =>
                            event.target.checked
                              ? [...selected, value]
                              : selected.filter((skill) => skill !== value),
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              <button className={styles.action} disabled={busy}>
                {busy ? "Đang lưu..." : "Tiếp tục đánh giá"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
