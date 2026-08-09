import type { Metadata } from "next";
import { LibraryPage } from "@/widgets/library/library-page";
export const metadata: Metadata = { title: "Thư viện học tập" };
export default function Page() { return <LibraryPage />; }
