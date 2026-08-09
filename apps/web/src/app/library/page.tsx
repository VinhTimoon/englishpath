import type { Metadata } from "next";
import { Suspense } from "react";
import { LibraryPage } from "@/widgets/library/library-page";
export const metadata: Metadata = { title: "Thư viện học tập" };
export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="p-6" role="status">
          Đang tải thư viện…
        </main>
      }
    >
      <LibraryPage />
    </Suspense>
  );
}
