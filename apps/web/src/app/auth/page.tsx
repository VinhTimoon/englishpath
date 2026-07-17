import type { Metadata } from "next";
import { AuthPage } from "@/widgets/learner-entry/auth-page";
export const metadata: Metadata = { title: "Đăng nhập và bắt đầu" };
export default function Page() {
  return <AuthPage />;
}
