import type { Metadata } from "next";
import { OnboardingPage } from "@/widgets/learner-entry/onboarding-page";
export const metadata: Metadata = { title: "Thiết lập mục tiêu học" };
export default function Page() {
  return <OnboardingPage />;
}
