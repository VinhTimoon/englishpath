import { Suspense } from "react";
import { VocabularyMindmapSelectionPage } from "@/widgets/learner-vocabulary/vocabulary-mindmap-selection-page";

export default function VocabularyLearnPage() {
  return (
    <Suspense fallback={<div role="status">Đang tải bản đồ từ vựng…</div>}>
      <VocabularyMindmapSelectionPage />
    </Suspense>
  );
}
