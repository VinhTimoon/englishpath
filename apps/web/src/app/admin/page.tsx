import type { Metadata } from "next";
import { AdminShell } from "@/widgets/admin/admin-shell";

export const metadata: Metadata = { title: "Khu vực vận hành" };

export default function Page() {
  return <AdminShell />;
}
