"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAdminOverview } from "@/features/admin/api/get-admin-overview";
import {
  getLibraryInventory,
  LibraryInventoryError,
} from "@/features/admin/api/get-library-inventory";
import type { AdminOverview } from "@/features/admin/model/admin-overview";
import type { LibraryInventoryItem } from "@/features/admin/model/library-inventory";
import styles from "./library-inventory.module.css";

type State =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "error" }
  | { kind: "success"; items: LibraryInventoryItem[] }
  | { kind: "denied" };

export function LibraryInventory() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [role, setRole] = useState<AdminOverview["role"] | null>(null);
  const load = (signal?: AbortSignal) => {
    setState({ kind: "loading" });
    getAdminOverview({ signal })
      .then((overview) => {
        setRole(overview.role);
        return getLibraryInventory(signal);
      })
      .then((inventory) => setState({ kind: "success", items: inventory.data }))
      .catch((error: unknown) => {
        if (signal?.aborted) return;
        if (error instanceof LibraryInventoryError && error.status === 403) {
          setState({ kind: "denied" });
          return;
        }
        if (error instanceof LibraryInventoryError && error.unavailable) {
          setState({ kind: "unavailable" });
          return;
        }
        setState({ kind: "error" });
      });
  };
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => load(controller.signal));
    return () => controller.abort();
  }, []);
  return (
    <main className={styles.panel} aria-labelledby="library-title">
      <p>Protected content operations</p>
      <h1 id="library-title">Library inventory</h1>
      <p className={styles.intro}>
        Safe operator fields only. Server policy remains authoritative for every
        review and publish action.
      </p>
      <p>
        <Link href="/admin">Back to admin overview</Link>
        {role && (
          <>
            {" "}
            · Role: <strong>{role}</strong>
          </>
        )}
      </p>
      {state.kind === "loading" && (
        <div className={styles.state} role="status">
          Loading inventory…
        </div>
      )}
      {state.kind === "denied" && (
        <div className={styles.state} role="alert">
          Your role cannot access this inventory.
        </div>
      )}
      {state.kind === "unavailable" && (
        <div className={styles.state} role="status">
          <strong>Provider unavailable</strong>
          <br />
          The library provider inventory is not available yet. No records or
          actions are shown.
        </div>
      )}
      {state.kind === "error" && (
        <div className={styles.state} role="alert">
          Inventory could not be loaded.{" "}
          <button
            className={styles.button}
            type="button"
            onClick={() => load()}
          >
            Retry
          </button>
        </div>
      )}
      {state.kind === "success" &&
        (state.items.length === 0 ? (
          <div className={styles.state} role="status">
            No library items are available for review.
          </div>
        ) : (
          <div className={styles.list}>
            {state.items.map((item) => (
              <InventoryCard key={item.id} item={item} />
            ))}
          </div>
        ))}
    </main>
  );
}

function InventoryCard({ item }: { item: LibraryInventoryItem }) {
  return (
    <article className={styles.card}>
      <h2>{item.title}</h2>
      <dl className={styles.meta}>
        <div>
          <dt>Type</dt>
          <dd>{item.contentType}</dd>
        </div>
        <div>
          <dt>Source type</dt>
          <dd>{item.sourceType}</dd>
        </div>
        <div>
          <dt>Checksum</dt>
          <dd>{item.checksum}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>{item.sourceVersion}</dd>
        </div>
        <div>
          <dt>Rights</dt>
          <dd>
            <span className={styles.status}>{item.rightsState}</span>
          </dd>
        </div>
        <div>
          <dt>Review</dt>
          <dd>
            <span className={styles.status}>{item.reviewState}</span>
          </dd>
        </div>
        <div>
          <dt>Publish</dt>
          <dd>
            <span className={styles.status}>{item.publishState}</span>
          </dd>
        </div>
      </dl>
      <p className={styles.note}>
        Review and publish actions stay disabled until the authorized server
        contract is available.
      </p>
      <div className={styles.actions}>
        <button
          className={styles.button}
          type="button"
          disabled
          title="The server review action is not available yet."
        >
          Review
        </button>
        <button
          className={styles.button}
          type="button"
          disabled
          title="The server publish action is not available yet."
        >
          Publish
        </button>
      </div>
    </article>
  );
}
