"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CmsApiError,
  createCmsDraft,
  createCmsTaxonomy,
  listCmsTaxonomy,
  publishCmsVersion,
  reviewCmsVersion,
} from "@/features/admin/api/cms-api";
import type { AdminOverview } from "@/features/admin/model/admin-overview";
import type { CmsTaxonomyNode, CmsVersion } from "@/features/admin/model/cms";
import styles from "./cms-workspace.module.css";

type AsyncState = "loading" | "success" | "empty" | "error";

const initialTaxonomy = {
  id: "",
  parentId: "",
  level: "",
  topic: "",
  subtopic: "",
  collocations: "",
  relatedSkills: "",
  tracks: "",
  toeicParts: "",
};

const initialDraft = {
  contentId: "",
  versionId: "",
  contentType: "lesson",
  title: "",
  body: "",
  provenance: "imported",
  usageScope: "learning",
  accessTier: "authenticated",
  taxonomyNodeId: "",
  sourceId: "",
  sourceUrl: "",
  checksum: "",
  sourceVersion: "",
  rightsOwner: "",
  licenseStatus: "approved",
  allowedUsageScopes: "learning",
  allowedAccessTiers: "authenticated",
  validUntil: "",
};

function requestId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
}

export function CmsWorkspace({ role }: { role: AdminOverview["role"] }) {
  const [taxonomy, setTaxonomy] = useState<CmsTaxonomyNode[]>([]);
  const [taxonomyState, setTaxonomyState] = useState<AsyncState>("loading");
  const [taxonomyError, setTaxonomyError] = useState("");
  const [taxonomyForm, setTaxonomyForm] = useState(initialTaxonomy);
  const [taxonomySubmitting, setTaxonomySubmitting] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  const [draftSubmitting, setDraftSubmitting] = useState(false);
  const [draftRequestId, setDraftRequestId] = useState(() =>
    requestId("draft"),
  );
  const [latestVersion, setLatestVersion] = useState<CmsVersion | null>(null);
  const [publishRequestId, setPublishRequestId] = useState(() =>
    requestId("publish"),
  );
  const [actionBusy, setActionBusy] = useState<"review" | "publish" | null>(
    null,
  );
  const [actionState, setActionState] = useState<"idle" | "error">("idle");
  const [actionMessage, setActionMessage] = useState("");

  const canPublish = role === "ADMIN" || role === "SUPER_ADMIN";
  const selectedNode = useMemo(
    () => taxonomy.find((node) => node.id === draft.taxonomyNodeId),
    [draft.taxonomyNodeId, taxonomy],
  );

  const loadTaxonomy = () => {
    setTaxonomyState("loading");
    setTaxonomyError("");
    listCmsTaxonomy()
      .then((result) => {
        setTaxonomy(result.data.data);
        setTaxonomyState(result.data.data.length > 0 ? "success" : "empty");
        setDraft((current) => ({
          ...current,
          taxonomyNodeId:
            current.taxonomyNodeId || result.data.data[0]?.id || "",
        }));
      })
      .catch((error: unknown) => {
        if (error instanceof CmsApiError) setTaxonomyError(error.message);
        else setTaxonomyError("Không tải được taxonomy CMS.");
        setTaxonomyState("error");
      });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => loadTaxonomy(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const setTaxonomyField = (
    field: keyof typeof initialTaxonomy,
    value: string,
  ) => setTaxonomyForm((current) => ({ ...current, [field]: value }));
  const setDraftField = (field: keyof typeof initialDraft, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  async function submitTaxonomy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTaxonomySubmitting(true);
    setActionState("idle");
    try {
      await createCmsTaxonomy({
        id: taxonomyForm.id.trim(),
        parentId: taxonomyForm.parentId.trim() || undefined,
        level: taxonomyForm.level.trim(),
        topic: taxonomyForm.topic.trim(),
        subtopic: taxonomyForm.subtopic.trim() || null,
        collocations: splitList(taxonomyForm.collocations),
        relatedSkills: splitList(taxonomyForm.relatedSkills),
        tracks: splitList(taxonomyForm.tracks),
        toeicParts: splitNumbers(taxonomyForm.toeicParts),
      });
      setTaxonomyForm(initialTaxonomy);
      setActionMessage(
        "Đã lưu taxonomy. Bạn có thể chọn node mới cho bản nháp.",
      );
      loadTaxonomy();
    } catch (error: unknown) {
      setActionState("error");
      setActionMessage(
        error instanceof CmsApiError
          ? error.message
          : "Không lưu được taxonomy.",
      );
    } finally {
      setTaxonomySubmitting(false);
    }
  }

  async function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDraftSubmitting(true);
    setActionState("idle");
    try {
      const result = await createCmsDraft({
        ...draft,
        clientRequestId: draftRequestId,
        allowedUsageScopes: splitList(draft.allowedUsageScopes),
        allowedAccessTiers: splitList(draft.allowedAccessTiers),
        validUntil: draft.validUntil || undefined,
      });
      setLatestVersion(result.data);
      setDraft((current) => ({ ...current, contentId: "", versionId: "" }));
      setDraftRequestId(requestId("draft"));
      setActionMessage(
        result.meta.idempotencyStatus === "replayed"
          ? "Yêu cầu đã được xử lý trước đó; không tạo bản ghi trùng."
          : "Đã tạo bản nháp. Chờ một người có quyền review riêng.",
      );
    } catch (error: unknown) {
      setActionState("error");
      setActionMessage(
        error instanceof CmsApiError
          ? error.message
          : "Không tạo được bản nháp.",
      );
    } finally {
      setDraftSubmitting(false);
    }
  }

  async function reviewVersion() {
    if (!latestVersion || actionBusy) return;
    setActionBusy("review");
    setActionState("idle");
    try {
      const result = await reviewCmsVersion(latestVersion.id, {
        decision: "approved",
        reviewedAt: new Date().toISOString(),
        contentId: latestVersion.contentId,
        versionId: latestVersion.id,
        checksum: latestVersion.source.checksum,
        sourceVersion: latestVersion.source.sourceVersion,
      });
      setLatestVersion(result.data);
      setActionMessage(
        "Đã ghi nhận review từ backend. Có thể publish khi rights hợp lệ.",
      );
    } catch (error: unknown) {
      setActionState("error");
      setActionMessage(
        error instanceof CmsApiError
          ? error.message
          : "Không ghi nhận được review.",
      );
    } finally {
      setActionBusy(null);
    }
  }

  async function publishVersion() {
    if (!latestVersion || actionBusy) return;
    setActionBusy("publish");
    setActionState("idle");
    try {
      const result = await publishCmsVersion(
        latestVersion.id,
        publishRequestId,
      );
      setLatestVersion(result.data);
      setPublishRequestId(requestId("publish"));
      setActionMessage("Đã publish theo quyết định server.");
    } catch (error: unknown) {
      setActionState("error");
      setActionMessage(
        error instanceof CmsApiError
          ? error.message
          : "Không publish được nội dung.",
      );
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <section className={styles.workspace} aria-labelledby="cms-title">
      <div className={styles.workspaceHeading}>
        <div>
          <p className={styles.eyebrow}>CMS có kiểm soát</p>
          <h2 id="cms-title">Tạo nội dung đúng ngay từ đầu</h2>
          <p className={styles.lead}>
            Taxonomy, rights, review và publish đều do backend quyết định. Màn
            hình này chỉ gửi dữ liệu và hiển thị trạng thái đã xác thực.
          </p>
        </div>
        <span className={styles.roleBadge}>{roleLabel(role)}</span>
      </div>

      {actionMessage && (
        <div
          className={actionState === "error" ? styles.alert : styles.notice}
          role={actionState === "error" ? "alert" : "status"}
        >
          {actionMessage}
        </div>
      )}

      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="taxonomy-title">
          <div className={styles.cardHeading}>
            <div>
              <p className={styles.kicker}>01 · Nền phân loại</p>
              <h3 id="taxonomy-title">Taxonomy từ backend</h3>
            </div>
            <button
              className={styles.quietButton}
              type="button"
              onClick={loadTaxonomy}
              disabled={taxonomyState === "loading"}
            >
              Làm mới
            </button>
          </div>
          {taxonomyState === "loading" && (
            <div className={styles.state} role="status">
              Đang tải taxonomy…
            </div>
          )}
          {taxonomyState === "error" && (
            <div className={styles.state} role="alert">
              <p>{taxonomyError}</p>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={loadTaxonomy}
              >
                Thử lại
              </button>
            </div>
          )}
          {taxonomyState === "empty" && (
            <div className={styles.state}>
              Chưa có taxonomy. Tạo node đầu tiên bên dưới.
            </div>
          )}
          {taxonomyState === "success" && (
            <ul className={styles.nodeList} aria-label="Các taxonomy node">
              {taxonomy.map((node) => (
                <li key={node.id}>
                  <span>{node.topic}</span>
                  <small>
                    {node.level} · {node.id}
                  </small>
                </li>
              ))}
            </ul>
          )}
          <form className={styles.form} onSubmit={submitTaxonomy}>
            <label>
              Node ID
              <input
                required
                pattern="[a-z0-9][a-z0-9._-]{0,95}"
                value={taxonomyForm.id}
                onChange={(event) => setTaxonomyField("id", event.target.value)}
              />
            </label>
            <label>
              Parent node
              <select
                value={taxonomyForm.parentId}
                onChange={(event) =>
                  setTaxonomyField("parentId", event.target.value)
                }
              >
                <option value="">Root node</option>
                {taxonomy.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.topic} · {node.id}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.twoColumns}>
              <label>
                Level
                <input
                  required
                  value={taxonomyForm.level}
                  onChange={(event) =>
                    setTaxonomyField("level", event.target.value)
                  }
                />
              </label>
              <label>
                Topic
                <input
                  required
                  value={taxonomyForm.topic}
                  onChange={(event) =>
                    setTaxonomyField("topic", event.target.value)
                  }
                />
              </label>
            </div>
            <label>
              Subtopic
              <input
                value={taxonomyForm.subtopic}
                onChange={(event) =>
                  setTaxonomyField("subtopic", event.target.value)
                }
              />
            </label>
            <label>
              Related skills
              <input
                placeholder="Listening, Speaking"
                value={taxonomyForm.relatedSkills}
                onChange={(event) =>
                  setTaxonomyField("relatedSkills", event.target.value)
                }
              />
            </label>
            <label>
              Tracks
              <input
                placeholder="workplace, toeic"
                value={taxonomyForm.tracks}
                onChange={(event) =>
                  setTaxonomyField("tracks", event.target.value)
                }
              />
            </label>
            <label>
              TOEIC parts
              <input
                placeholder="2, 3"
                inputMode="numeric"
                value={taxonomyForm.toeicParts}
                onChange={(event) =>
                  setTaxonomyField("toeicParts", event.target.value)
                }
              />
            </label>
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={taxonomySubmitting}
            >
              {taxonomySubmitting ? "Đang lưu…" : "Lưu taxonomy"}
            </button>
          </form>
        </section>

        <section className={styles.card} aria-labelledby="draft-title">
          <div className={styles.cardHeading}>
            <div>
              <p className={styles.kicker}>02 · Nội dung</p>
              <h3 id="draft-title">Tạo bản nháp có nguồn</h3>
            </div>
            <span className={styles.lock}>Server-owned</span>
          </div>
          <form className={styles.form} onSubmit={submitDraft}>
            <div className={styles.twoColumns}>
              <label>
                Content ID
                <input
                  required
                  pattern="[A-Za-z0-9][A-Za-z0-9._:/-]{0,191}"
                  value={draft.contentId}
                  onChange={(event) =>
                    setDraftField("contentId", event.target.value)
                  }
                />
              </label>
              <label>
                Version ID
                <input
                  required
                  pattern="[A-Za-z0-9][A-Za-z0-9._:/-]{0,191}"
                  value={draft.versionId}
                  onChange={(event) =>
                    setDraftField("versionId", event.target.value)
                  }
                />
              </label>
            </div>
            <label>
              Taxonomy node
              <select
                required
                value={draft.taxonomyNodeId}
                onChange={(event) =>
                  setDraftField("taxonomyNodeId", event.target.value)
                }
              >
                <option value="">Chọn node</option>
                {taxonomy.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.topic} · {node.level}
                  </option>
                ))}
              </select>
            </label>
            {selectedNode && (
              <p className={styles.contextNote}>
                Đang gắn vào {selectedNode.topic} · {selectedNode.level}.
              </p>
            )}
            <label>
              Tiêu đề
              <input
                required
                maxLength={240}
                value={draft.title}
                onChange={(event) => setDraftField("title", event.target.value)}
              />
            </label>
            <label>
              Nội dung
              <textarea
                required
                maxLength={20000}
                rows={5}
                value={draft.body}
                onChange={(event) => setDraftField("body", event.target.value)}
              />
            </label>
            <div className={styles.twoColumns}>
              <label>
                Provenance
                <select
                  value={draft.provenance}
                  onChange={(event) =>
                    setDraftField("provenance", event.target.value)
                  }
                >
                  <option value="imported">Imported</option>
                  <option value="human_authored">Human authored</option>
                  <option value="ai_assisted">AI assisted</option>
                </select>
              </label>
              <label>
                Access tier
                <select
                  value={draft.accessTier}
                  onChange={(event) =>
                    setDraftField("accessTier", event.target.value)
                  }
                >
                  <option value="authenticated">Authenticated</option>
                  <option value="public">Public</option>
                  <option value="entitled">Entitled</option>
                </select>
              </label>
            </div>
            <div className={styles.twoColumns}>
              <label>
                Source ID
                <input
                  required
                  value={draft.sourceId}
                  onChange={(event) =>
                    setDraftField("sourceId", event.target.value)
                  }
                />
              </label>
              <label>
                Source URL (private)
                <input
                  required
                  type="url"
                  placeholder="https://…"
                  value={draft.sourceUrl}
                  onChange={(event) =>
                    setDraftField("sourceUrl", event.target.value)
                  }
                />
              </label>
            </div>
            <div className={styles.twoColumns}>
              <label>
                Checksum
                <input
                  required
                  minLength={8}
                  value={draft.checksum}
                  onChange={(event) =>
                    setDraftField("checksum", event.target.value)
                  }
                />
              </label>
              <label>
                Source version
                <input
                  required
                  value={draft.sourceVersion}
                  onChange={(event) =>
                    setDraftField("sourceVersion", event.target.value)
                  }
                />
              </label>
            </div>
            <div className={styles.twoColumns}>
              <label>
                Rights owner
                <input
                  required
                  value={draft.rightsOwner}
                  onChange={(event) =>
                    setDraftField("rightsOwner", event.target.value)
                  }
                />
              </label>
              <label>
                Valid until
                <input
                  type="date"
                  value={draft.validUntil}
                  onChange={(event) =>
                    setDraftField(
                      "validUntil",
                      event.target.value
                        ? `${event.target.value}T23:59:59.000Z`
                        : "",
                    )
                  }
                />
              </label>
            </div>
            <p className={styles.helper}>
              Source URL và rights owner chỉ được gửi tới API qua HTTPS; không
              hiển thị trong projection trả về.
            </p>
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={draftSubmitting || taxonomy.length === 0}
            >
              {draftSubmitting ? "Đang tạo bản nháp…" : "Tạo bản nháp"}
            </button>
          </form>
        </section>
      </div>

      <section className={styles.lifecycle} aria-labelledby="lifecycle-title">
        <div className={styles.cardHeading}>
          <div>
            <p className={styles.kicker}>03 · Lifecycle</p>
            <h3 id="lifecycle-title">Trạng thái từ server</h3>
          </div>
          <span className={styles.lock}>Không override</span>
        </div>
        {!latestVersion && (
          <div className={styles.state}>
            Tạo một bản nháp để xem review và publish.
          </div>
        )}
        {latestVersion && (
          <div className={styles.lifecycleGrid}>
            <div>
              <span className={styles.kicker}>Bản hiện tại</span>
              <h4>{latestVersion.title}</h4>
              <p className={styles.muted}>
                {latestVersion.contentId} · {latestVersion.id}
              </p>
            </div>
            <StatusPill
              label="Review"
              value={latestVersion.governance.reviewStatus}
            />
            <StatusPill
              label="Publish"
              value={latestVersion.governance.publishStatus}
            />
            <div className={styles.actions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={reviewVersion}
                disabled={
                  actionBusy !== null ||
                  latestVersion.governance.reviewStatus !== "draft"
                }
              >
                {actionBusy === "review" ? "Äang review…" : "Review approved"}
              </button>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={publishVersion}
                disabled={
                  actionBusy !== null ||
                  !canPublish ||
                  latestVersion.governance.reviewStatus !== "approved" ||
                  latestVersion.governance.publishStatus === "published"
                }
              >
                {actionBusy === "publish" ? "Äang publish…" : "Publish"}
              </button>
            </div>
          </div>
        )}
        <p className={styles.helper}>
          Review và publish luôn được backend kiểm tra lại theo actor, rights,
          checksum và version. Nút bị khóa chỉ là trợ giúp giao diện, không phải
          lớp phân quyền.
        </p>
      </section>
    </section>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.statusPill}>
      <span>{label}</span>
      <strong>{value}</strong>
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

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
function splitNumbers(value: string) {
  return splitList(value)
    .map(Number)
    .filter((item) => Number.isInteger(item));
}
