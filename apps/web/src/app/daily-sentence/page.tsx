import type { Metadata } from "next";
import { DailySentencePage } from "@/widgets/learning/daily-sentence-page";
export const metadata: Metadata = { title: "Daily Sentence | EnglishPath" };
export default function Page() { return <DailySentencePage />; }
