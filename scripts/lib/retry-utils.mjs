export async function runWithRetries({ maxRetries, run, onRetry }) {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await run(attempt);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      await onRetry?.(error, attempt + 1, maxRetries);
      attempt += 1;
    }
  }

  throw new Error("Retry loop exited unexpectedly.");
}
