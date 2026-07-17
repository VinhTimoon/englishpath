import type { VocabularyFilters } from "../model/filter-state";
import { vocabularyLevels } from "@/entities/vocabulary/model/vocabulary";
import styles from "./vocabulary-filters.module.css";

type Props = {
  filters: VocabularyFilters;
  onChange: (filters: VocabularyFilters) => void;
};

const tracks = [
  ["", "Tất cả lộ trình"],
  ["english-foundation", "English Foundation"],
  ["daily-communication", "Daily Communication"],
  ["workplace-english", "Workplace English"],
  ["toeic-listening-reading", "TOEIC Listening & Reading"],
  ["four-skills-english", "Four Skills English"],
] as const;

const skills = ["", "reading", "listening", "speaking", "writing"] as const;

export function VocabularyFiltersForm({ filters, onChange }: Props) {
  const set = (key: keyof VocabularyFilters, value: string) =>
    onChange({ ...filters, [key]: value || undefined });

  return (
    <form
      className={styles.filters}
      aria-label="Bộ lọc từ vựng"
      onSubmit={(event) => event.preventDefault()}
    >
      <label>
        Cấp độ
        <select
          value={filters.level ?? ""}
          onChange={(event) => set("level", event.target.value)}
        >
          <option value="">Tất cả cấp độ</option>
          {vocabularyLevels.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Lộ trình
        <select
          value={filters.track ?? ""}
          onChange={(event) => set("track", event.target.value)}
        >
          {tracks.map(([id, label]) => (
            <option key={id || "all"} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Kỹ năng
        <select
          value={filters.skill ?? ""}
          onChange={(event) => set("skill", event.target.value)}
        >
          {skills.map((skill) => (
            <option key={skill || "all"} value={skill}>
              {skill || "Tất cả kỹ năng"}
            </option>
          ))}
        </select>
      </label>
      <label>
        TOEIC Part
        <select
          value={filters.toeicPart ?? ""}
          onChange={(event) => set("toeicPart", event.target.value)}
        >
          <option value="">Tất cả Part</option>
          {[1, 2, 3, 4, 5, 6, 7].map((part) => (
            <option key={part} value={part}>
              Part {part}
            </option>
          ))}
        </select>
      </label>
      <label>
        Độ sâu cây
        <select
          value={filters.depth}
          onChange={(event) => set("depth", event.target.value)}
        >
          <option value="1">1 tầng</option>
          <option value="2">2 tầng</option>
          <option value="3">3 tầng</option>
        </select>
      </label>
      <label>
        Gốc chủ đề
        <input
          value={filters.rootId ?? ""}
          onChange={(event) =>
            set(
              "rootId",
              event.target.value
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, "")
                .slice(0, 96),
            )
          }
          placeholder="Ví dụ: workplace"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          maxLength={96}
        />
      </label>
      <button
        className={styles.resetButton}
        type="button"
        onClick={() => onChange({ depth: "3" })}
      >
        Xóa bộ lọc
      </button>
    </form>
  );
}
