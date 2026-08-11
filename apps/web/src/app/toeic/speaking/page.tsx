import type { Metadata } from "next";
import { ToeicSpeakingPage } from "@/widgets/toeic-speaking/toeic-speaking-page";

export const metadata: Metadata = { title: "TOEIC Speaking | EnglishPath" };

export default function Page() {
  return <ToeicSpeakingPage />;
}
