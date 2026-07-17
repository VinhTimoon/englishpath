import type { Metadata } from "next";
import { RoadmapPage } from "@/widgets/roadmap/roadmap-page";

export const metadata: Metadata = {
  title: "Lộ trình của tôi | EnglishPath",
  description: "Kế hoạch học tiếng Anh theo mục tiêu và thời gian của bạn.",
};

export default function Page() {
  return <RoadmapPage />;
}
