export type StorageUploadRetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
};

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 300;

export function isRetryableStorageUploadError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("network") ||
    lower.includes("fetch failed") ||
    lower.includes("econnreset") ||
    lower.includes("enotfound") ||
    lower.includes("socket") ||
    lower.includes("503") ||
    lower.includes("502") ||
    lower.includes("504") ||
    lower.includes("429") ||
    lower.includes("rate limit") ||
    lower.includes("temporarily unavailable")
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeStorageUploadWithRetry(
  upload: () => Promise<{ error: Error | null }>,
  options: StorageUploadRetryOptions = {},
): Promise<{ error: Error | null }> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await upload();
    if (!result.error) {
      return result;
    }

    lastError = result.error;
    const shouldRetry =
      attempt < maxAttempts && isRetryableStorageUploadError(result.error.message);
    if (!shouldRetry) {
      return result;
    }

    await delay(baseDelayMs * attempt);
  }

  return { error: lastError };
}
