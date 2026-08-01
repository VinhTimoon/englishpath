export const PLAN_PRIMARY_ROUTE = Object.freeze({
  model: "gpt-5.6-sol",
  reasoning: "high",
});

const CAPACITY_PATTERN =
  /\b(?:capacity(?:[_\s-]+is)?[_\s-]+unavailable|at[_\s-]+capacity)\b/iu;
const AUTHENTICATION_PATTERN =
  /\b(?:authentication|authenticated|unauthorized|invalid\s+(?:api\s+)?key|forbidden|permission\s+denied)\b/iu;

export function isExplicitCapacityUnavailable(error = {}) {
  const output = [error.output, error.message].filter(Boolean).join("\n");
  return CAPACITY_PATTERN.test(output) && !AUTHENTICATION_PATTERN.test(output);
}

export function shouldUsePlanFallback({ phase, error = {} }) {
  if (phase !== "plan") return false;
  if (error.timedOut || error.blocked || error.retriable === false) return false;
  if (error.status === 42) return false;
  return isExplicitCapacityUnavailable(error);
}
