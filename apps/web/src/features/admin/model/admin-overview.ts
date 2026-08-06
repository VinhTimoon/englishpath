export type AdminOverview = {
  role: "CONTENT_EDITOR" | "ADMIN" | "SUPER_ADMIN";
  capabilities: Array<"editor_shell" | "operational_summary">;
  operationalSummary?: {
    activeUsers: number;
    activeRoleAssignments: number;
  };
};

const ROLES = new Set<AdminOverview["role"]>([
  "CONTENT_EDITOR",
  "ADMIN",
  "SUPER_ADMIN",
]);
const CAPABILITIES = new Set<AdminOverview["capabilities"][number]>([
  "editor_shell",
  "operational_summary",
]);

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function isAdminOverview(value: unknown): value is AdminOverview {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (!ROLES.has(candidate.role as AdminOverview["role"])) return false;
  if (
    !Array.isArray(candidate.capabilities) ||
    candidate.capabilities.length < 1 ||
    new Set(candidate.capabilities).size !== candidate.capabilities.length ||
    candidate.capabilities.some(
      (capability) =>
        !CAPABILITIES.has(capability as AdminOverview["capabilities"][number]),
    )
  ) {
    return false;
  }

  const summary = candidate.operationalSummary;
  const hasSummaryCapability = candidate.capabilities.includes(
    "operational_summary",
  );
  const isAdmin =
    candidate.role === "ADMIN" || candidate.role === "SUPER_ADMIN";
  if (hasSummaryCapability !== isAdmin) return false;
  if (isAdmin && summary === undefined) return false;
  if (!isAdmin && summary !== undefined) return false;
  if (summary === undefined) return true;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return false;
  }
  const counts = summary as Record<string, unknown>;
  return (
    isNonNegativeInteger(counts.activeUsers) &&
    isNonNegativeInteger(counts.activeRoleAssignments)
  );
}
