import type { Metadata } from "next";
import { ToeicWritingPage } from "@/widgets/toeic-writing/toeic-writing-page";

export const metadata: Metadata = { title: "TOEIC Writing | EnglishPath" };

export default function Page() {
  return <ToeicWritingPage />;
}
