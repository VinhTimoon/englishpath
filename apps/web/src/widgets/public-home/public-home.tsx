import {
  ContentPreview,
  FinalCallToAction,
  Hero,
  HowItWorks,
  LearningLoop,
  OutcomeProof,
  PathPreview,
  PublicFooter,
  PublicHeader,
} from "./sections";

export function PublicHome() {
  return (
    <div className="public-site">
      <PublicHeader />
      <main id="main-content">
        <Hero />
        <LearningLoop />
        <PathPreview />
        <OutcomeProof />
        <HowItWorks />
        <ContentPreview />
        <FinalCallToAction />
      </main>
      <PublicFooter />
    </div>
  );
}
