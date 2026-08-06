import type { Metadata } from "next";

import { ToeicTimedTestPage } from "@/widgets/toeic-timed-test/toeic-timed-test-page";

export const metadata: Metadata = { title: "TOEIC Test | EnglishPath" };

export default function Page() {
  return <ToeicTimedTestPage />;
}
