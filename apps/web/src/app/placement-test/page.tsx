import type { Metadata } from "next";
import { PlacementPage } from "@/widgets/learner-entry/placement-page";
export const metadata: Metadata = { title: "Bài đánh giá đầu vào" };
export default function Page() {
  return <PlacementPage />;
}
