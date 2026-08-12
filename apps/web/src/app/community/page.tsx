import type { Metadata } from "next";
import { CommunityPage } from "@/widgets/community/community-page";

export const metadata: Metadata = { title: "Cộng đồng | EnglishPath" };
export default function Page() {
  return <CommunityPage />;
}
