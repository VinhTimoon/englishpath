import type { Metadata } from "next";
import { DashboardPage } from "@/widgets/learner-entry/dashboard-page";
export const metadata: Metadata = { title: "Dashboard học viên" };
export default function Page() {
  return <DashboardPage />;
}
