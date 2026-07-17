import type { Metadata } from "next";
import { ErrorNotebookPage } from "@/widgets/practice/error-notebook-page";

export const metadata: Metadata = { title: "Sổ lỗi của tôi | EnglishPath" };
export default function Page() { return <ErrorNotebookPage />; }
