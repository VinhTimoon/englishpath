import type { GovernedContentVersion } from '../content-governance/content-governance.models';

export function isEligibleLearnerLibraryVersion(
  version: GovernedContentVersion,
  now = new Date(),
): boolean {
  try {
    const validUntil = version.rights.validUntil;
    const validDate = validUntil === undefined ? true : Date.parse(validUntil);
    return (
      version.reviewStatus === 'approved' &&
      version.publishStatus === 'published' &&
      version.rights.licenseStatus === 'approved' &&
      version.rights.allowedUsageScopes.includes('library') &&
      version.rights.allowedAccessTiers.includes('authenticated') &&
      version.usageScope === 'library' &&
      version.accessTier === 'authenticated' &&
      (validDate === true ||
        (Number.isFinite(validDate) && validDate >= now.getTime()))
    );
  } catch {
    return false;
  }
}
