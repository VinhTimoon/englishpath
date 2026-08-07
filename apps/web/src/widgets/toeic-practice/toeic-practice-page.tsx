"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  parseAnswer,
  parseCatalogue,
  parseSession,
  parseStart,
  type PracticeCatalogue,
  type PracticeMode,
  type SafeQuestion,
  type Session,
} from "@/entities/toeic-practice/model/contracts";
import {
  clientSessionId,
  readPracticeSetup,
  rememberPracticeSetup,
} from "@/features/toeic-practice/model/client-session";
import { requestLearnerApi } from "@/shared/api/learner-api-client";
import styles from "./toeic-practice-page.module.css";

const partLabels: Record<string, string> = {
  PART_1: "Part 1",
  PART_2: "Part 2",
  PART_3: "Part 3",
  PART_4: "Part 4",
  PART_5: "Part 5",
  PART_6: "Part 6",
  PART_7: "Part 7",
};

function label(value: string) {
  return partLabels[value] ?? value.replaceAll("_", " ");
}

function difficultyLabel(value: string) {
  return value.replaceAll("_", " ").toLocaleLowerCase("vi");
}

function modePath(mode: PracticeMode) {
  return mode === "listening" ? "listening" : "reading";
}

export function ToeicPracticePage() {
  const [catalogue, setCatalogue] = useState<PracticeCatalogue | null>(null);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState(false);
  const [mode, setMode] = useState<PracticeMode>("listening");
  const [part, setPart] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState<SafeQuestion[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [finalError, setFinalError] = useState(false);

  const options = catalogue?.[mode];
  const readingTopics =
    mode === "reading" && catalogue ? catalogue.reading.topics : [];
  const current =
    session?.status === "ACTIVE" ? questions[session.answered] : undefined;
  const isEmpty = Boolean(options && options.parts.length === 0);
  const filterSummary = useMemo(
    () =>
      [
        part ? label(part) : "Chọn phần thi",
        difficulty ? difficultyLabel(difficulty) : "mọi mức độ có sẵn",
        mode === "reading" && topic ? topic.trim() : null,
      ]
        .filter(Boolean)
        .join(" · "),
    [difficulty, mode, part, topic],
  );

  async function openSession(
    nextMode: PracticeMode,
    nextPart: string,
    nextDifficulty: string,
    nextTopic: string,
  ) {
    if (!nextPart || pending) return;
    setPending(true);
    setError("");
    setFinalError(false);
    try {
      const body = {
        clientSessionId: clientSessionId(nextMode, {
          part: nextPart,
          difficulty: nextDifficulty,
          topic: nextTopic,
        }),
        questionCount: 5,
        ...(nextMode === "listening"
          ? { listeningPart: nextPart }
          : { readingPart: nextPart }),
        ...(nextDifficulty ? { difficulty: nextDifficulty } : {}),
        ...(nextMode === "reading" && nextTopic ? { topic: nextTopic } : {}),
      };
      rememberPracticeSetup({
        mode: nextMode,
        part: nextPart,
        difficulty: nextDifficulty,
        topic: nextTopic,
      });
      const result = parseStart(
        await requestLearnerApi<unknown>(
          `/toeic/practice/${modePath(nextMode)}/sessions`,
          { method: "POST", body },
        ),
      );
      setQuestions(result.questions);
      setSession(result.session);
      setSelected("");
    } catch {
      setError("Chưa thể mở bài luyện tập. Hãy thử lại hoặc chọn bộ lọc khác.");
    } finally {
      setPending(false);
    }
  }

  async function loadCatalogue() {
    setCatalogueLoading(true);
    setCatalogueError(false);
    try {
      const result = parseCatalogue(
        await requestLearnerApi<unknown>("/toeic/practice/catalogue"),
      );
      setCatalogue(result);
      const stored = readPracticeSetup();
      const queryParams = new URLSearchParams(window.location.search);
      const queryMode = queryParams.get("mode");
      const queryPart = queryParams.get("part");
      const requestedMode =
        queryMode === "listening" || queryMode === "reading" ? queryMode : null;
      const queryOptions = requestedMode ? result[requestedMode] : null;
      const queryPartAvailable = Boolean(
        queryOptions && queryPart && queryOptions.parts.includes(queryPart),
      );
      const storedOptions = stored ? result[stored.mode] : null;
      const storedPart = storedOptions?.parts.includes(stored?.part ?? "")
        ? (stored?.part ?? "")
        : "";
      const firstMode = queryPartAvailable
        ? requestedMode!
        : storedPart
          ? (stored?.mode ?? "listening")
          : result.listening.parts.length
            ? "listening"
            : "reading";
      const first = result[firstMode];
      const selectedPart = queryPartAvailable
        ? (queryPart ?? "")
        : storedPart || first.parts[0] || "";
      const selectedDifficulty =
        stored?.mode === firstMode &&
        (!stored.difficulty || first.difficulties.includes(stored.difficulty))
          ? stored.difficulty
          : (first.difficulties[0] ?? "");
      const selectedTopic =
        firstMode === "reading" &&
        stored?.mode === firstMode &&
        (!stored.topic || result.reading.topics.includes(stored.topic))
          ? stored.topic
          : "";
      setMode(firstMode);
      setPart(selectedPart);
      setDifficulty(selectedDifficulty);
      setTopic(selectedTopic);
      rememberPracticeSetup({
        mode: firstMode,
        part: selectedPart,
        difficulty: selectedDifficulty,
        topic: selectedTopic,
      });
      if (storedPart || queryPartAvailable) {
        await openSession(
          firstMode,
          selectedPart,
          selectedDifficulty,
          selectedTopic,
        );
      }
    } catch {
      setCatalogueError(true);
    } finally {
      setCatalogueLoading(false);
    }
  }

  useEffect(() => {
    // The catalogue is an external request; its async completion owns the state update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCatalogue();
    // The catalogue request is intentionally initial-load only; query params
    // are read as the initial remediation deep link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeMode(next: PracticeMode) {
    if (!catalogue) return;
    const nextOptions = catalogue[next];
    setMode(next);
    setPart(nextOptions.parts[0] ?? "");
    setDifficulty(nextOptions.difficulties[0] ?? "");
    setTopic("");
    setError("");
    rememberPracticeSetup({
      mode: next,
      part: nextOptions.parts[0] ?? "",
      difficulty: nextOptions.difficulties[0] ?? "",
      topic: "",
    });
  }

  async function start() {
    if (!part || !options || pending) return;
    await openSession(mode, part, difficulty, topic);
  }

  async function answer() {
    if (!current || !session || !selected || pending) return;
    setPending(true);
    setError("");
    try {
      const result = parseAnswer(
        await requestLearnerApi<unknown>(
          `/toeic/practice/${modePath(mode)}/sessions/${session.sessionId}/answers`,
          {
            method: "POST",
            body: { questionId: current.id, selectedOption: selected },
          },
        ),
      );
      setSession({ ...session, answered: result.answered });
      setSelected("");
    } catch {
      setError(
        "Chưa ghi nhận được câu trả lời. Bạn vẫn ở câu này; hãy thử lại.",
      );
    } finally {
      setPending(false);
    }
  }

  async function finish() {
    if (!session || pending) return;
    setPending(true);
    setError("");
    setFinalError(false);
    try {
      const result = parseSession(
        await requestLearnerApi<unknown>(
          `/toeic/practice/${modePath(mode)}/sessions/${session.sessionId}/submit`,
          { method: "POST" },
        ),
      );
      setSession(result);
    } catch {
      setFinalError(true);
      setError("Chưa tải được kết quả. Tiến độ vẫn được giữ; hãy thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/dashboard" className={styles.back}>
            Về dashboard
          </Link>
          <p className={styles.kicker}>TOEIC Practice</p>
          <h1>Luyện đúng phần bạn cần</h1>
          <p className={styles.lede}>
            Chọn một bộ lọc được cung cấp từ nội dung đã sẵn sàng, rồi hoàn
            thành từng câu theo đúng thứ tự.
          </p>
        </header>

        {!session && (
          <section className={styles.panel} aria-labelledby="setup-title">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Bắt đầu</p>
                <h2 id="setup-title">Thiết lập lượt luyện</h2>
              </div>
              <span className={styles.countBadge}>5 câu</span>
            </div>

            {catalogueLoading && (
              <div className={styles.state} aria-live="polite">
                <span className={styles.spinner} aria-hidden="true" />
                Đang tải bộ lọc luyện tập…
              </div>
            )}
            {catalogueError && (
              <div className={styles.stateError} role="alert">
                <strong>Không tải được bộ lọc.</strong>
                <span>Hãy thử lại để lấy catalogue mới nhất.</span>
                <button
                  className={styles.secondary}
                  onClick={() => void loadCatalogue()}
                >
                  Thử lại
                </button>
              </div>
            )}
            {!catalogueLoading && !catalogueError && catalogue && (
              <>
                <div
                  className={styles.modeSwitch}
                  role="group"
                  aria-label="Kỹ năng"
                >
                  <button
                    className={
                      mode === "listening" ? styles.active : styles.switchButton
                    }
                    onClick={() => changeMode("listening")}
                    type="button"
                  >
                    Listening
                  </button>
                  <button
                    className={
                      mode === "reading" ? styles.active : styles.switchButton
                    }
                    onClick={() => changeMode("reading")}
                    type="button"
                  >
                    Reading
                  </button>
                </div>

                {isEmpty ? (
                  <div className={styles.emptyState}>
                    <h3>Chưa có nội dung cho kỹ năng này</h3>
                    <p>Hãy chuyển sang kỹ năng còn lại hoặc quay lại sau.</p>
                  </div>
                ) : (
                  <div className={styles.filters}>
                    <label>
                      Part
                      <select
                        value={part}
                        onChange={(event) => setPart(event.target.value)}
                      >
                        {options?.parts.map((value) => (
                          <option key={value} value={value}>
                            {label(value)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Mức độ
                      <select
                        value={difficulty}
                        onChange={(event) => setDifficulty(event.target.value)}
                      >
                        <option value="">Mọi mức độ có sẵn</option>
                        {options?.difficulties.map((value) => (
                          <option key={value} value={value}>
                            {difficultyLabel(value)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {mode === "reading" && (
                      <label>
                        Chủ đề
                        <select
                          value={topic}
                          onChange={(event) => setTopic(event.target.value)}
                        >
                          <option value="">Mọi chủ đề có sẵn</option>
                          {readingTopics.map((value) => (
                            <option key={value} value={value}>
                              {value.trim()}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                )}

                <p className={styles.summary}>
                  Lựa chọn hiện tại: <strong>{filterSummary}</strong>
                </p>
                {error && (
                  <p role="alert" className={styles.error}>
                    {error}
                  </p>
                )}
                <button
                  className={styles.primary}
                  disabled={pending || isEmpty || !part}
                  onClick={() => void start()}
                  type="button"
                >
                  {pending ? "Đang mở bài…" : "Bắt đầu luyện tập"}
                </button>
              </>
            )}
          </section>
        )}

        {session?.status === "SUBMITTED" && (
          <section className={styles.panel} aria-live="polite">
            <p className={styles.eyebrow}>Đã hoàn thành</p>
            <h2>Kết quả của bạn</h2>
            <p className={styles.score}>
              {session.score ?? 0}
              <span> / {session.total}</span>
            </p>
            <p>
              Đáp án đúng chỉ được dùng để chấm ở phía máy chủ. Bạn có thể luyện
              một lượt mới với bộ lọc khác.
            </p>
            {finalError && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <div className={styles.actions}>
              <Link href="/dashboard" className={styles.primary}>
                Về dashboard
              </Link>
              <button
                className={styles.secondary}
                onClick={() => {
                  setSession(null);
                  setQuestions([]);
                  setError("");
                }}
                type="button"
              >
                Luyện lượt mới
              </button>
            </div>
          </section>
        )}

        {session?.status === "ACTIVE" && current && (
          <>
            <section className={styles.panel} aria-labelledby="question-title">
              <div className={styles.progressRow}>
                <span>
                  Câu {session.answered + 1} / {session.total}
                </span>
                <span>
                  {Math.round((session.answered / session.total) * 100)}%
                </span>
              </div>
              <div className={styles.progressTrack} aria-hidden="true">
                <span
                  style={{
                    width: `${(session.answered / session.total) * 100}%`,
                  }}
                />
              </div>
              <p className={styles.summary}>{filterSummary}</p>
              <p className={styles.eyebrow}>
                {label(current.part)} · {difficultyLabel(current.difficulty)}
              </p>
              <h2 id="question-title">{current.prompt}</h2>
              {current.mediaReference &&
                /^https?:\/\//.test(current.mediaReference) && (
                  <audio
                    controls
                    src={current.mediaReference}
                    aria-label="Audio câu hỏi"
                  />
                )}
            </section>
            <section className={styles.options} aria-label="Các lựa chọn">
              {current.options.map((option) => (
                <button
                  key={option.id}
                  className={
                    selected === option.id ? styles.selected : styles.option
                  }
                  aria-pressed={selected === option.id}
                  disabled={pending}
                  onClick={() => setSelected(option.id)}
                  type="button"
                >
                  <span className={styles.optionKey}>{option.id}</span>
                  <span>{option.text}</span>
                </button>
              ))}
              {error && (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              )}
              <button
                className={styles.primary}
                disabled={!selected || pending}
                onClick={() => void answer()}
                type="button"
              >
                {pending
                  ? "Đang ghi nhận…"
                  : session.answered + 1 === session.total
                    ? "Ghi nhận câu cuối"
                    : "Ghi nhận và tiếp tục"}
              </button>
            </section>
          </>
        )}

        {session?.status === "ACTIVE" && !current && (
          <section className={styles.panel}>
            <p className={styles.eyebrow}>Đã đủ câu trả lời</p>
            <h2>Sẵn sàng nộp bài</h2>
            <p>
              Bạn đã trả lời toàn bộ câu hỏi. Kiểm tra lại lựa chọn rồi gửi để
              nhận kết quả.
            </p>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <button
              className={styles.primary}
              disabled={pending}
              onClick={() => void finish()}
              type="button"
            >
              {pending ? "Đang chấm…" : "Nộp bài"}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
