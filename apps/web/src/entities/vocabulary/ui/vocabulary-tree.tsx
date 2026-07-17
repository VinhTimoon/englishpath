import type { MindmapNode } from "../model/vocabulary";
import styles from "./vocabulary-tree.module.css";

function TreeBranch({ nodes }: { nodes: MindmapNode[] }) {
  return (
    <ul className={styles.treeList}>
      {nodes.map((node) => (
        <li key={node.id} data-node-id={node.id}>
          <article className={styles.treeNode}>
            <div>
              <p className={styles.nodeKind}>{node.kind}</p>
              <h3>{node.label}</h3>
            </div>
            <p className={styles.nodeCount}>{node.vocabularyCount} từ</p>
            <p className={styles.nodeMeta}>
              {node.levels.join(" · ")}
              {node.tracks.length ? ` · ${node.tracks.join(" · ")}` : ""}
              {node.skills.length ? ` · ${node.skills.join(" · ")}` : ""}
              {node.toeicParts.length
                ? ` · TOEIC Part ${node.toeicParts.join(", ")}`
                : ""}
            </p>
          </article>
          {node.children.length > 0 ? (
            <TreeBranch nodes={node.children} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function VocabularyTree({ roots }: { roots: MindmapNode[] }) {
  return (
    <div aria-label="Cây chủ đề từ vựng">
      <TreeBranch nodes={roots} />
    </div>
  );
}
