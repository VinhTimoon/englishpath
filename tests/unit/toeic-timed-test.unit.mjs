import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const typescript = require("typescript");

function loadTypeScript(relativePath) {
  const filename = resolve(process.cwd(), relativePath);
  const source = readFileSync(filename, "utf8");
  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  const child = new Module(filename);
  child.filename = filename;
  child.paths = Module._nodeModulePaths(dirname(filename));
  child._compile(compiled, filename);
  return child.exports;
}

function question(index) {
  return {
    id: `question-${index}`,
    prompt: `Prompt ${index}`,
    options: [
      { id: "A", text: "Option A" },
      { id: "B", text: "Option B" },
    ],
  };
}

function activeResponse(mode = "MINI") {
  const total = mode === "HALF" ? 50 : 20;
  return {
    data: {
      session: {
        sessionId: "session-123456",
        mode,
        status: "ACTIVE",
        total,
        answered: 0,
        remainingSeconds: 1200,
      },
      questions: Array.from({ length: total }, (_, index) =>
        question(index + 1),
      ),
    },
  };
}

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.has(key) ? this.#values.get(key) : null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }

  removeItem(key) {
    this.#values.delete(key);
  }
}

const contracts = loadTypeScript(
  "apps/web/src/entities/toeic-timed-test/model/contracts.ts",
);

const checks = [
  [
    "strict parser accepts governed MINI/HALF shape",
    () => {
      const mini = contracts.parseTimedSession(activeResponse("MINI"));
      const half = contracts.parseTimedSession(activeResponse("HALF"));
      assert.equal(mini.total, 20);
      assert.equal(mini.questions.length, 20);
      assert.equal(half.total, 50);
      assert.equal(half.questions.length, 50);
      assert.equal("score" in mini, false);
      assert.deepEqual(Object.keys(mini.questions[0]), [
        "id",
        "prompt",
        "options",
      ]);
    },
  ],
  [
    "strict parser rejects recursive forbidden and malformed active fields",
    () => {
      const forbidden = activeResponse();
      forbidden.data.questions[0].meta = { nested: { correctAnswer: "A" } };
      assert.throws(
        () => contracts.parseTimedSession(forbidden),
        /INVALID_RESPONSE/,
      );
      const partial = activeResponse();
      partial.data.questions.pop();
      assert.throws(
        () => contracts.parseTimedSession(partial),
        /INVALID_RESPONSE/,
      );
      const scoreOnActive = activeResponse();
      scoreOnActive.data.session.score = 80;
      assert.throws(
        () => contracts.parseTimedSession(scoreOnActive),
        /INVALID_RESPONSE/,
      );
    },
  ],
  [
    "answer acknowledgement parser accepts safe response and rejects leakage",
    () => {
      assert.deepEqual(
        contracts.parseTimedAnswer({
          data: {
            accepted: true,
            replayed: false,
            questionId: "question-1",
            answered: 1,
            total: 20,
          },
        }),
        {
          accepted: true,
          replayed: false,
          questionId: "question-1",
          answered: 1,
          total: 20,
        },
      );
      assert.throws(
        () =>
          contracts.parseTimedAnswer({
            data: {
              accepted: true,
              replayed: false,
              questionId: "question-1",
              answered: 1,
              total: 20,
              nested: { isCorrect: true },
            },
          }),
        /INVALID_RESPONSE/,
      );
    },
  ],
  [
    "remaining time formatting is bounded",
    () => {
      assert.equal(contracts.formatRemaining(125), "02:05");
      assert.equal(contracts.formatRemaining(-1), "00:00");
    },
  ],
  [
    "analysis parser keeps aggregate fields safe and strict",
    () => {
      const payload = {
        data: {
          analysis: {
            score: { correct: 2, total: 20, answered: 3 },
            accuracy: 67,
            skills: [
              {
                skill: "LISTENING",
                total: 10,
                answered: 2,
                correct: 1,
                accuracy: 50,
              },
              {
                skill: "READING",
                total: 10,
                answered: 1,
                correct: 1,
                accuracy: 100,
              },
            ],
            parts: [
              {
                part: "PART_1",
                total: 1,
                answered: 1,
                correct: 1,
                accuracy: 100,
              },
            ],
            weaknesses: [
              { scope: "part", name: "Part 2", accuracy: 0, answered: 1 },
            ],
            time: {
              limitSeconds: 1200,
              usedSeconds: 125,
              remainingSeconds: 1075,
              averageSecondsPerAnswered: 41.7,
            },
          },
          remediation: {
            status: "ready",
            count: 2,
            href: "/error-notebook?source=TOEIC_TIMED_TEST",
            packs: [
              {
                kind: "VOCABULARY",
                title: "Từ vựng TOEIC Part 2",
                description: "Ôn chủ đề đã được duyệt.",
                href: "/vocabulary?toeicPart=2",
                relatedLabel: "Part 2",
              },
            ],
          },
        },
      };
      const analysis = contracts.parseTimedAnalysis(payload);
      assert.equal(analysis.score.correct, 2);
      assert.equal(analysis.time.remainingSeconds, 1075);
      assert.deepEqual(analysis.remediation, {
        status: "ready",
        count: 2,
        href: "/error-notebook?source=TOEIC_TIMED_TEST",
        packs: [
          {
            kind: "VOCABULARY",
            title: "Từ vựng TOEIC Part 2",
            description: "Ôn chủ đề đã được duyệt.",
            href: "/vocabulary?toeicPart=2",
            relatedLabel: "Part 2",
          },
        ],
      });
      assert.throws(
        () =>
          contracts.parseTimedAnalysis({
            ...payload,
            data: {
              ...payload.data,
              remediation: {
                ...payload.data.remediation,
                packs: [
                  {
                    kind: "VOCABULARY",
                    title: "Unsafe",
                    description: "Unsafe",
                    href: "https://unsafe.example",
                  },
                ],
              },
            },
          }),
        /INVALID_RESPONSE/,
      );
      assert.throws(
        () =>
          contracts.parseTimedAnalysis({
            ...payload,
            data: {
              ...payload.data,
              analysis: {
                ...payload.data.analysis,
                parts: [
                  { ...payload.data.analysis.parts[0], questionId: "private" },
                ],
              },
            },
          }),
        /INVALID_RESPONSE/,
      );
      assert.throws(
        () =>
          contracts.parseTimedAnalysis({
            ...payload,
            data: {
              ...payload.data,
              remediation: {
                status: "ready",
                count: 1,
                href: "https://unsafe.example/errors",
              },
            },
          }),
        /INVALID_RESPONSE/,
      );
      assert.equal(
        contracts.parseTimedAnalysis({ data: { analysis: null } }),
        null,
      );
      assert.throws(
        () =>
          contracts.parseTimedAnalysis({
            ...payload,
            data: {
              ...payload.data,
              analysis: { ...payload.data.analysis, unexpected: true },
            },
          }),
        /INVALID_RESPONSE/,
      );
      assert.throws(
        () =>
          contracts.parseTimedAnalysis({
            ...payload,
            data: {
              ...payload.data,
              analysis: {
                ...payload.data.analysis,
                answers: [{ questionId: "private" }],
              },
            },
          }),
        /INVALID_RESPONSE/,
      );
    },
  ],
  [
    "persistence removes malformed state and round trips opaque IDs",
    () => {
      const store = new MemoryStorage();
      globalThis.window = { localStorage: store };
      const session = loadTypeScript(
        "apps/web/src/features/toeic-timed-test/model/client-session.ts",
      );
      const clientId = session.readClientSessionId();
      assert.match(clientId, /^test-/);
      assert.equal(store.getItem("englishpath.toeic.test.client"), clientId);
      store.setItem("englishpath.toeic.test.active", "bad");
      assert.equal(session.readActiveSessionId(), null);
      assert.equal(store.getItem("englishpath.toeic.test.active"), null);
      session.writeActiveSessionId("session-abcdef");
      assert.equal(session.readActiveSessionId(), "session-abcdef");
      assert.equal(
        store.getItem("englishpath.toeic.test.active"),
        "session-abcdef",
      );
      assert.equal(
        store
          .getItem("englishpath.toeic.test.active")
          .includes("correctAnswer"),
        false,
      );
      assert.equal(
        store
          .getItem("englishpath.toeic.test.active")
          .includes("selectedOption"),
        false,
      );
      session.clearActiveSessionId();
      assert.equal(session.readActiveSessionId(), null);
    },
  ],
];

for (const [name, check] of checks) {
  check();
  console.log(`PASS ${name}`);
}
console.log(`PASS ${checks.length} deterministic timed-test unit checks`);
