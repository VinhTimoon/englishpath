import type { GovernedContentVersion } from '../content-governance/content-governance.models';

export function isEligibleLearnerLibraryVersion(
  version: GovernedContentVersion,
  now = new Date(),
): boolean {
  return (
    version.reviewStatus === 'approved' &&
    version.publishStatus === 'published' &&
    version.rights.licenseStatus === 'approved' &&
    version.rights.allowedUsageScopes.includes('library') &&
    version.rights.allowedAccessTiers.includes('authenticated') &&
    version.usageScope === 'library' &&
    version.accessTier === 'authenticated' &&
    Boolean(version.rights.validUntil) &&
    Date.parse(version.rights.validUntil!) >= now.getTime()
  );
}
