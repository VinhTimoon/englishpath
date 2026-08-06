import type { Metadata } from "next";
import { ToeicPracticePage } from "@/widgets/toeic-practice/toeic-practice-page";
export const metadata: Metadata = { title: "TOEIC Practice | EnglishPath" };
export default function Page() { return <ToeicPracticePage />; }
